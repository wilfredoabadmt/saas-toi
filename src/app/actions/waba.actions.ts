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
import { buildPhoneCandidates } from '@/lib/waba/phone';
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
    wamid: string | null;
    direction: string;
    recipientPhone: string | null;
    templateName: string | null;
    messageText: string | null;
    deliveryStatus: string;
    errorCode: string | null;
    failureReason: string | null;
    lastEventAt: Date | null;
  }>;
  stats: Record<string, number>;
  unavailableReason?: string;
}

const EMPTY_WORKSPACE: WabaWorkspace = {
  connection: null,
  phoneProfile: null,
  templates: [],
  recentEvents: [],
  stats: {},
};

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

export async function getWabaConnection(): Promise<PublicWabaConnection | null> {
  try {
    const { organizationId } = await assertCanSendMessages();
    const connection = await getActiveConnection(organizationId);
    return connection ? toPublicConnection(connection) : null;
  } catch {
    return null;
  }
}

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
      displayPhone: phoneProfile.display_phone_number ?? null,
      verifiedName: phoneProfile.verified_name ?? null,
    });
  } catch (error) {
    console.error('[WABA] Fallo al sincronizar con Meta:', error);
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
      wamid: e.wamid,
      direction: e.direction,
      recipientPhone: e.recipientPhone,
      templateName: e.templateName,
      messageText: e.messageText,
      deliveryStatus: e.deliveryStatus,
      errorCode: e.errorCode,
      failureReason: e.failureReason,
      lastEventAt: e.lastEventAt,
    })),
    stats,
  };
}

export async function getMessageStatus(wamid: string) {
  try {
    const { organizationId } = await assertCanSendMessages();
    const event = await getMessageEventStatus(organizationId, wamid.trim());

    return {
      ok: true as const,
      event: event
        ? {
            wamid: event.wamid,
            deliveryStatus: event.deliveryStatus,
            recipientPhone: event.recipientPhone,
            errorCode: event.errorCode,
            failureReason: event.failureReason,
            lastEventAt: event.lastEventAt,
          }
        : null,
    };
  } catch (error) {
    return toErrorResult(error, 'No se pudo consultar el estado del mensaje.');
  }
}

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
  subscriberId?: string;
}

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

    const candidates = buildPhoneCandidates(input.recipientPhone);
    if (!candidates.length) {
      return { ok: false, error: 'Introduce un número válido en formato E.164.' };
    }

    if (!input.templateName?.trim()) {
      return { ok: false, error: 'Selecciona una plantilla aprobada.' };
    }

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
            wamid: messageId,
            direction: 'outbound',
            messageType: 'template',
            deliveryStatus: MESSAGE_STATUS.ACCEPTED,
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
            wamid: messageId,
            direction: 'outbound',
            messageType: 'text',
            deliveryStatus: MESSAGE_STATUS.ACCEPTED,
            recipientPhone: recipientWaId,
            messageText: bodyText,
            rawPayload: { body: bodyText },
          });
        }

        revalidatePath('/dashboard');
        return { ok: true, messageId, recipientWaId };
      } catch (error) {
        if (!(error instanceof MetaGraphError)) throw error;
        lastError = error;
        if (!error.isUnregisteredRecipient) break;
      }
    }

    if (lastError?.isUnregisteredRecipient) {
      return {
        ok: false,
        error:
          'Meta no pudo resolver el número tras probar todos los formatos. ' +
          'Verifica que sea una cuenta real de WhatsApp.',
        code: 'UNREGISTERED_RECIPIENT',
      };
    }

    throw lastError ?? new Error('El envío falló sin un error de Meta.');
  } catch (error) {
    return toErrorResult(error, 'No se pudo enviar el mensaje.');
  }
}
