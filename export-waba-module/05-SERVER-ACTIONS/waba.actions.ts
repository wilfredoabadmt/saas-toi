'use server';

/**
 * src/app/actions/waba.actions.ts
 * ---------------------------------------------------------------------------
 * Server Actions del módulo WABA: conexión, sincronización y envío.
 *
 * Contrato de todas las acciones: devuelven `ActionResult<T>` en vez de lanzar.
 * Así los componentes cliente muestran el error sin `error.tsx` ni boundaries.
 *
 * 🔒 Todas empiezan resolviendo el tenant. Ninguna acepta `organizationId` como
 *    parámetro: si lo aceptara, el cliente podría suplantar organización.
 */

import { revalidatePath } from 'next/cache';

import { assertWabaEnv, checkWabaEnv, MESSAGE_STATUS } from '@/lib/waba/column-map';
import {
    fetchPhoneProfile,
    fetchSubscribedApps,
    fetchTemplates,
    MetaGraphError,
    sendTemplateMessage,
    sendTextMessage,
    subscribeAppToWaba,
    type WhatsAppPhoneProfile,
    type WhatsAppTemplateSummary,
} from '@/lib/waba/graph-client';
import { buildPhoneCandidates, sanitizePhone } from '@/lib/waba/phone';
import {
    buildSendComponents,
    isApproved,
    validateSendParameters,
} from '@/lib/waba/templates';
import {
    disconnectWaba,
    findSubscriberByPhone,
    getActiveConnection,
    getMessageEventStatus,
    getDeliveryStats,
    listRecentMessageEvents,
    markConnectionInactive,
    toPublicConnection,
    touchConnectionSync,
    upsertMessageEvent,
    type PublicWabaConnection,
    type WabaConnection,
} from '@/lib/waba/waba.repository';
import {
    assertCanManageWaba,
    assertCanSendMessages,
    ForbiddenError,
    UnauthorizedError,
} from '@/lib/waba/tenant-context';

/* ==========================================================================
 * Tipos
 * ========================================================================== */

export type ActionResult<T> =
    | ({ ok: true } & T)
    | { ok: false; error: string; code?: string };

export interface WabaWorkspace {
    connection: PublicWabaConnection | null;
    phoneProfile: WhatsAppPhoneProfile | null;
    templates: WhatsAppTemplateSummary[];
    recentEvents: Array<{
        messageId: string | null;
        direction: string;
        recipientPhone: string | null;
        templateName: string | null;
        messageText: string | null;
        status: string;
        errorCode: string | null;
        errorMessage: string | null;
        lastEventAt: Date | null;
    }>;
    stats: Record<string, number>;
    /** Motivo por el que el módulo no está operativo, si aplica. */
    unavailableReason?: string;
}

const EMPTY_WORKSPACE: WabaWorkspace = {
    connection: null,
    phoneProfile: null,
    templates: [],
    recentEvents: [],
    stats: {},
};

/** Traduce cualquier excepción a un `ActionResult` de error. */
function toErrorResult(error: unknown, fallback: string): { ok: false; error: string; code?: string } {
    if (error instanceof UnauthorizedError) {
        return { ok: false, error: error.message, code: 'UNAUTHORIZED' };
    }
    if (error instanceof ForbiddenError) {
        return { ok: false, error: error.message, code: 'FORBIDDEN' };
    }
    if (error instanceof MetaGraphError) {
        return { ok: false, error: error.message, code: `META_${error.code ?? 'ERROR'}` };
    }
    return { ok: false, error: error instanceof Error ? error.message : fallback };
}

/**
 * Ejecuta una llamada a Meta y, si el error indica que la conexión ya no vale,
 * la desactiva en vez de propagar un 500. Patrón heredado del origen
 * (`shouldMarkConnectionInactive`), aquí basado en códigos oficiales.
 */
async function withConnectionGuard<T>(
    connection: WabaConnection,
    operation: () => Promise<T>
): Promise<T | null> {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof MetaGraphError && error.invalidatesConnection) {
            await markConnectionInactive(
                connection.organizationId,
                connection.id,
                error.message
            );
            return null;
        }
        throw error;
    }
}

/* ==========================================================================
 * Lectura
 * ========================================================================== */

/** Conexión actual, sin llamar a Meta. Barata: úsala en layouts y badges. */
export async function getWabaConnection(): Promise<PublicWabaConnection | null> {
    try {
        const { organizationId } = await assertCanSendMessages();
        const connection = await getActiveConnection(organizationId);
        return connection ? toPublicConnection(connection) : null;
    } catch {
        return null;
    }
}

/**
 * Bundle completo del workspace: conexión + perfil + plantillas + eventos.
 * Hace 2 llamadas a Meta en paralelo, igual que el origen.
 *
 * Nunca lanza: si algo falla devuelve `unavailableReason` para que la página
 * renderice un estado vacío explicativo en vez de romperse.
 */
export async function getWabaWorkspace(eventLimit = 50): Promise<WabaWorkspace> {
    const env = checkWabaEnv();
    if (!env.ready) {
        return {
            ...EMPTY_WORKSPACE,
            unavailableReason: `Módulo no configurado. Faltan: ${env.missing.join(', ')}`,
        };
    }

    let organizationId: string;
    try {
        ({ organizationId } = await assertCanSendMessages());
    } catch (error) {
        return { ...EMPTY_WORKSPACE, unavailableReason: (error as Error).message };
    }

    const connection = await getActiveConnection(organizationId);
    if (!connection) {
        return { ...EMPTY_WORKSPACE, unavailableReason: 'No hay ningún número conectado.' };
    }

    let phoneProfile: WhatsAppPhoneProfile | null = null;
    let templates: WhatsAppTemplateSummary[] = [];

    try {
        const result = await withConnectionGuard(connection, async () =>
            Promise.all([
                fetchPhoneProfile(connection.phoneNumberId, connection.accessToken),
                fetchTemplates(connection.wabaId, connection.accessToken),
            ])
        );

        if (!result) {
            return {
                ...EMPTY_WORKSPACE,
                unavailableReason:
                    'Meta rechazó las credenciales. La conexión se desactivó: vuelve a conectar el número.',
            };
        }

        [phoneProfile, templates] = result;

        await touchConnectionSync(organizationId, connection.id, {
            displayPhoneNumber: phoneProfile.display_phone_number ?? null,
            verifiedName: phoneProfile.verified_name ?? null,
        });
    } catch (error) {
        console.error('[WABA] Fallo al sincronizar con Meta:', error);
        // Se sigue: los eventos locales son útiles aunque Meta no responda.
    }

    const [events, stats] = await Promise.all([
        listRecentMessageEvents(organizationId, {
            limit: eventLimit,
            wabaConfigId: connection.id,
        }),
        getDeliveryStats(organizationId),
    ]);

    return {
        connection: toPublicConnection(connection),
        phoneProfile,
        templates,
        recentEvents: events.map((e) => ({
            messageId: e.messageId,
            direction: e.direction,
            recipientPhone: e.recipientPhone,
            templateName: e.templateName,
            messageText: e.messageText,
            status: e.status,
            errorCode: e.errorCode,
            errorMessage: e.errorMessage,
            lastEventAt: e.lastEventAt,
        })),
        stats,
    };
}

/** Estado de un mensaje. Usado por el polling de la UI tras un envío. */
export async function getMessageStatus(messageId: string) {
    try {
        const { organizationId } = await assertCanSendMessages();
        const event = await getMessageEventStatus(organizationId, messageId.trim());

        return {
            ok: true as const,
            event: event
                ? {
                      messageId: event.messageId,
                      status: event.status,
                      recipientPhone: event.recipientPhone,
                      errorCode: event.errorCode,
                      errorMessage: event.errorMessage,
                      lastEventAt: event.lastEventAt,
                  }
                : null,
        };
    } catch (error) {
        return toErrorResult(error, 'No se pudo consultar el estado del mensaje.');
    }
}

/** Apps suscritas al WABA: sirve para diagnosticar por qué no llegan webhooks. */
export async function getSubscribedApps(): Promise<ActionResult<{ apps: unknown[] }>> {
    try {
        assertWabaEnv();
        const { organizationId } = await assertCanManageWaba();
        const connection = await getActiveConnection(organizationId);

        if (!connection) return { ok: false, error: 'No hay ningún número conectado.' };

        const apps = await fetchSubscribedApps(connection.wabaId, connection.accessToken);
        return { ok: true, apps };
    } catch (error) {
        return toErrorResult(error, 'No se pudieron leer las apps suscritas.');
    }
}

/* ==========================================================================
 * Gestión de la conexión
 * ========================================================================== */

/**
 * Reintenta la suscripción de la app al WABA.
 * Necesario si el paso automático del canje falló: sin suscripción NO llegan
 * webhooks y todos los mensajes se quedan en `accepted`.
 */
export async function retryWebhookSubscription(): Promise<ActionResult<{ message: string }>> {
    try {
        assertWabaEnv();
        const { organizationId } = await assertCanManageWaba();
        const connection = await getActiveConnection(organizationId);

        if (!connection) return { ok: false, error: 'No hay ningún número conectado.' };

        await subscribeAppToWaba(connection.wabaId, connection.accessToken);
        revalidatePath('/dashboard');

        return { ok: true, message: 'Webhook suscrito correctamente al WABA.' };
    } catch (error) {
        return toErrorResult(error, 'No se pudo suscribir el webhook.');
    }
}

/** Desconecta el número. `purgeHistory` borra también el histórico de mensajes. */
export async function disconnectWabaAction(
    connectionId: string,
    purgeHistory = false
): Promise<ActionResult<{ deletedConnections: number; deletedMessageLogs: number }>> {
    try {
        const { organizationId } = await assertCanManageWaba();
        const result = await disconnectWaba(organizationId, connectionId, purgeHistory);

        if (!result.deletedConnections) {
            return { ok: false, error: 'La conexión no existe o no pertenece a tu organización.' };
        }

        revalidatePath('/dashboard');
        return { ok: true, ...result };
    } catch (error) {
        return toErrorResult(error, 'No se pudo desconectar el número.');
    }
}

/* ==========================================================================
 * Envío
 * ========================================================================== */

export interface SendTemplateInput {
    recipientPhone: string;
    templateName: string;
    languageCode: string;
    bodyParameters?: string[];
    /** Si se conoce, enlaza el mensaje con el abonado. Si no, se intenta resolver. */
    subscriberId?: string;
}

/**
 * Envía una plantilla aprobada.
 *
 * Reintenta con las variantes del número ante `Account not registered`
 * (comportamiento heredado del origen, aquí adaptado a Bolivia).
 */
export async function sendTemplateAction(
    input: SendTemplateInput
): Promise<ActionResult<{ messageId: string | null; recipientWaId: string; templateName: string }>> {
    try {
        assertWabaEnv();
        const { organizationId } = await assertCanSendMessages();

        const connection = await getActiveConnection(organizationId);
        if (!connection) {
            return { ok: false, error: 'No hay ningún número de WhatsApp conectado.' };
        }

        // -- Validaciones previas (evitan llamadas fallidas a Meta) ------------
        const candidates = buildPhoneCandidates(input.recipientPhone);
        if (!candidates.length) {
            return { ok: false, error: 'Introduce un número válido en formato E.164.' };
        }

        if (!input.templateName?.trim()) {
            return { ok: false, error: 'Selecciona una plantilla aprobada.' };
        }

        // Comprueba que la plantilla existe, está aprobada y el nº de
        // parámetros cuadra. Meta devuelve 132000 si no; comprobarlo ahorra
        // una llamada fallida y una penalización de calidad.
        const templates = await fetchTemplates(connection.wabaId, connection.accessToken);
        const template = templates.find((t) => t.name === input.templateName);

        if (!template) {
            return { ok: false, error: `La plantilla "${input.templateName}" no existe en tu WABA.` };
        }
        if (!isApproved(template)) {
            return {
                ok: false,
                error: `La plantilla "${template.name}" está en estado ${template.status}. Solo se pueden enviar plantillas APPROVED.`,
            };
        }

        const paramCheck = validateSendParameters(template, input.bodyParameters ?? []);
        if (!paramCheck.valid) {
            return { ok: false, error: paramCheck.error! };
        }

        const components = buildSendComponents(input.bodyParameters ?? []);

        // -- Envío, probando variantes del número -----------------------------
        let lastError: MetaGraphError | null = null;

        for (const candidate of candidates) {
            try {
                const result = await sendTemplateMessage(
                    connection.phoneNumberId,
                    connection.accessToken,
                    {
                        to: candidate,
                        templateName: input.templateName,
                        languageCode: input.languageCode,
                        components,
                    }
                );

                const messageId = result.messages?.[0]?.id ?? null;
                const recipientWaId = result.contacts?.[0]?.wa_id ?? candidate;

                if (messageId) {
                    const subscriberId =
                        input.subscriberId ??
                        (await findSubscriberByPhone(organizationId, recipientWaId))?.id ??
                        null;

                    await upsertMessageEvent({
                        organizationId,
                        wabaConfigId: connection.id,
                        subscriberId,
                        messageId,
                        direction: 'outbound',
                        status: MESSAGE_STATUS.ACCEPTED,
                        recipientPhone: recipientWaId,
                        templateName: input.templateName,
                        templateLanguage: input.languageCode,
                        rawPayload: { template: input.templateName, params: input.bodyParameters },
                    });
                }

                revalidatePath('/dashboard');
                return { ok: true, messageId, recipientWaId, templateName: input.templateName };
            } catch (error) {
                if (!(error instanceof MetaGraphError)) throw error;
                lastError = error;
                // Solo se prueba la siguiente variante si el problema es el formato.
                if (!error.isUnregisteredRecipient) break;
            }
        }

        if (lastError?.isUnregisteredRecipient) {
            return {
                ok: false,
                error:
                    'Meta no pudo resolver el número tras probar todos los formatos admitidos. ' +
                    'Verifica que sea una cuenta real de WhatsApp y que pueda recibir mensajes.',
                code: 'UNREGISTERED_RECIPIENT',
            };
        }

        throw lastError ?? new Error('El envío falló sin un error de Meta.');
    } catch (error) {
        return toErrorResult(error, 'No se pudo enviar la plantilla.');
    }
}

/**
 * Mensaje de texto libre.
 *
 * ⚠️ Solo válido dentro de la ventana de servicio de 24 h desde el último
 * mensaje del cliente. Fuera de ella, Meta devuelve el error 131047 y hay que
 * usar una plantilla.
 */
export async function sendTextAction(input: {
    recipientPhone: string;
    bodyText: string;
    subscriberId?: string;
}): Promise<ActionResult<{ messageId: string | null; recipientWaId: string }>> {
    try {
        assertWabaEnv();
        const { organizationId } = await assertCanSendMessages();

        const connection = await getActiveConnection(organizationId);
        if (!connection) return { ok: false, error: 'No hay ningún número conectado.' };

        const bodyText = input.bodyText?.trim();
        if (!bodyText) return { ok: false, error: 'Escribe un mensaje antes de enviar.' };
        if (bodyText.length > 4096) {
            return { ok: false, error: 'El mensaje supera los 4096 caracteres de WhatsApp.' };
        }

        const candidates = buildPhoneCandidates(input.recipientPhone);
        if (!candidates.length) {
            return { ok: false, error: 'Introduce un número válido en formato E.164.' };
        }

        let lastError: MetaGraphError | null = null;

        for (const candidate of candidates) {
            try {
                const result = await sendTextMessage(
                    connection.phoneNumberId,
                    connection.accessToken,
                    { to: candidate, body: bodyText }
                );

                const messageId = result.messages?.[0]?.id ?? null;
                const recipientWaId = result.contacts?.[0]?.wa_id ?? candidate;

                if (messageId) {
                    await upsertMessageEvent({
                        organizationId,
                        wabaConfigId: connection.id,
                        subscriberId:
                            input.subscriberId ??
                            (await findSubscriberByPhone(organizationId, recipientWaId))?.id ??
                            null,
                        messageId,
                        direction: 'outbound',
                        status: MESSAGE_STATUS.ACCEPTED,
                        recipientPhone: recipientWaId,
                        messageText: bodyText,
                    });
                }

                revalidatePath('/dashboard');
                return { ok: true, messageId, recipientWaId };
            } catch (error) {
                if (!(error instanceof MetaGraphError)) throw error;
                lastError = error;

                // 131047 = fuera de la ventana de 24 h. Reintentar no sirve.
                if (error.code === 131047) {
                    return {
                        ok: false,
                        error:
                            'Han pasado más de 24 horas desde el último mensaje del cliente. ' +
                            'Usa una plantilla aprobada para reabrir la conversación.',
                        code: 'OUTSIDE_SERVICE_WINDOW',
                    };
                }
                if (!error.isUnregisteredRecipient) break;
            }
        }

        throw lastError ?? new Error('El envío de texto falló.');
    } catch (error) {
        return toErrorResult(error, 'No se pudo enviar el mensaje.');
    }
}

/**
 * Envío masivo de recordatorios.
 *
 * ⚠️ Meta limita el throughput según la calidad del número (80/s por defecto,
 * menos en números nuevos). Se envía en lotes con pausa.
 *
 * Para volúmenes de ISP (cientos o miles de abonados) esto debería vivir en un
 * job en background, no en una Server Action: una acción larga puede exceder
 * el timeout del servidor. Aquí queda acotado por `maxRecipients`.
 */
export async function sendBulkRemindersAction(input: {
    templateName: string;
    languageCode: string;
    recipients: Array<{ subscriberId?: string; phone: string; parameters: string[] }>;
    maxRecipients?: number;
}): Promise<ActionResult<{ sent: number; failed: number; errors: string[] }>> {
    try {
        assertWabaEnv();
        await assertCanSendMessages();

        const cap = input.maxRecipients ?? 200;
        const targets = input.recipients.slice(0, cap);

        if (input.recipients.length > cap) {
            console.warn(
                `[WABA] Se recortó el envío masivo de ${input.recipients.length} a ${cap} destinatarios.`
            );
        }

        let sent = 0;
        let failed = 0;
        const errors: string[] = [];
        const BATCH = 10;

        for (let i = 0; i < targets.length; i += BATCH) {
            const batch = targets.slice(i, i + BATCH);

            const results = await Promise.all(
                batch.map((r) =>
                    sendTemplateAction({
                        recipientPhone: r.phone,
                        templateName: input.templateName,
                        languageCode: input.languageCode,
                        bodyParameters: r.parameters,
                        subscriberId: r.subscriberId,
                    })
                )
            );

            for (const [index, result] of results.entries()) {
                if (result.ok) {
                    sent += 1;
                } else {
                    failed += 1;
                    if (errors.length < 20) {
                        errors.push(`${batch[index].phone}: ${result.error}`);
                    }
                }
            }

            if (i + BATCH < targets.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        revalidatePath('/dashboard');

        if (input.recipients.length > cap) {
            errors.push(
                `⚠️ Solo se procesaron ${cap} de ${input.recipients.length} destinatarios (límite de la acción).`
            );
        }

        return { ok: true, sent, failed, errors };
    } catch (error) {
        return toErrorResult(error, 'El envío masivo falló.');
    }
}

/** Utilidad para la UI: normaliza un teléfono antes de mostrarlo o guardarlo. */
export async function normalizePhoneAction(phone: string) {
    const [best] = buildPhoneCandidates(phone);
    return { ok: true as const, sanitized: sanitizePhone(phone), canonical: best ?? null };
}
