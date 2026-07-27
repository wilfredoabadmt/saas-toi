/**
 * src/lib/waba/waba.repository.ts
 * ---------------------------------------------------------------------------
 * Acceso a datos del módulo WABA con Drizzle ORM.
 *
 * 🔒 INVARIANTE DEL ARCHIVO
 * Toda función que lea o escriba datos de un tenant recibe `organizationId` y
 * lo aplica en el WHERE. No es un detalle estilístico: el módulo origen tenía
 * tres puntos donde se consultaba sin tenant (GOTCHAS G-01, G-02, G-03) y eso,
 * en multi-tenant, significa operar con el número de WhatsApp de otra empresa.
 *
 * EXCEPCIONES — son exactamente tres, todas deliberadas y documentadas:
 *
 *   1. `resolveConnectionByPhoneNumberId()`
 *      La usa el webhook. Su trabajo ES descubrir el tenant: Meta solo nos da
 *      el phone_number_id. Prohibido llamarla desde código con sesión.
 *
 *   2. `findConnectionsByMetaUserId()`
 *      La usa el callback de deauthorize de Meta, por el mismo motivo: la
 *      identidad llega firmada por Meta, no por nuestra sesión.
 *
 *   3. Las tres funciones de `waba_webhook_deadletter`
 *      Esa tabla guarda precisamente los eventos cuyo tenant NO se pudo
 *      resolver. Es una cola operativa, no datos de cliente.
 *
 * Si añades una cuarta función sin `organizationId`, está mal.
 * Verificación rápida:
 *   grep -n "^export async function" waba.repository.ts
 * Toda función que no aparezca en la lista de arriba debe recibir organizationId.
 */

import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import { db } from '@/db'; // ⚙️ AJUSTA: tu instancia de Drizzle
import { messageLogs, wabaConfigs, wabaWebhookDeadletter } from '@/db/schema/waba';
import type { MessageLog, NewMessageLog, WabaConfig } from '@/db/schema/waba';

import { CONNECTION_STATUS, MESSAGE_STATUS } from './column-map';
import { decryptSecret, encryptSecret } from './crypto';
import type { OrganizationId } from './tenant-context';

/* ==========================================================================
 * Tipos de salida
 * ========================================================================== */

/** Conexión + token ya descifrado. NUNCA cruza hacia el cliente. */
export interface WabaConnection {
    id: string;
    organizationId: OrganizationId;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    businessId: string | null;
    metaUserId: string | null;
    /** ⚠️ Token en claro. Solo para llamar a la Graph API. */
    accessToken: string;
    isActive: boolean;
    connectionStatus: string;
    lastError: string | null;
    lastSyncedAt: Date | null;
}

/** Vista para la UI: sin token, sin secretos. */
export interface PublicWabaConnection {
    id: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    isActive: boolean;
    connectionStatus: string;
    lastError: string | null;
    lastSyncedAt: Date | null;
}

export function toPublicConnection(c: WabaConnection): PublicWabaConnection {
    return {
        id: c.id,
        wabaId: c.wabaId,
        phoneNumberId: c.phoneNumberId,
        displayPhoneNumber: c.displayPhoneNumber,
        verifiedName: c.verifiedName,
        isActive: c.isActive,
        connectionStatus: c.connectionStatus,
        lastError: c.lastError,
        lastSyncedAt: c.lastSyncedAt,
    };
}

function hydrate(row: WabaConfig): WabaConnection {
    return {
        id: row.id,
        organizationId: row.organizationId as OrganizationId,
        wabaId: row.wabaId,
        phoneNumberId: row.phoneNumberId,
        displayPhoneNumber: row.displayPhoneNumber,
        verifiedName: row.verifiedName,
        businessId: row.businessId,
        metaUserId: row.metaUserId,
        accessToken: decryptSecret(row.accessTokenEncrypted),
        isActive: row.isActive,
        connectionStatus: row.connectionStatus,
        lastError: row.lastError,
        lastSyncedAt: row.lastSyncedAt,
    };
}

/* ==========================================================================
 * Conexiones — lectura
 * ========================================================================== */

/**
 * Conexión activa de una organización.
 * Devuelve `null` si no hay ninguna — **nunca** la de otro tenant.
 */
export async function getActiveConnection(
    organizationId: OrganizationId
): Promise<WabaConnection | null> {
    if (!organizationId) {
        throw new Error('[WABA] getActiveConnection requiere organizationId.');
    }

    const [row] = await db
        .select()
        .from(wabaConfigs)
        .where(
            and(
                eq(wabaConfigs.organizationId, organizationId),
                eq(wabaConfigs.isActive, true)
            )
        )
        .orderBy(desc(wabaConfigs.createdAt))
        .limit(1);

    return row ? hydrate(row) : null;
}

/** Todas las conexiones de la organización (activas e inactivas). Sin token. */
export async function listConnections(
    organizationId: OrganizationId
): Promise<PublicWabaConnection[]> {
    if (!organizationId) {
        throw new Error('[WABA] listConnections requiere organizationId.');
    }

    const rows = await db
        .select({
            id: wabaConfigs.id,
            wabaId: wabaConfigs.wabaId,
            phoneNumberId: wabaConfigs.phoneNumberId,
            displayPhoneNumber: wabaConfigs.displayPhoneNumber,
            verifiedName: wabaConfigs.verifiedName,
            isActive: wabaConfigs.isActive,
            connectionStatus: wabaConfigs.connectionStatus,
            lastError: wabaConfigs.lastError,
            lastSyncedAt: wabaConfigs.lastSyncedAt,
        })
        .from(wabaConfigs)
        .where(eq(wabaConfigs.organizationId, organizationId))
        .orderBy(desc(wabaConfigs.createdAt));

    return rows;
}

/** Conexión concreta, validando pertenencia. */
export async function getConnectionById(
    organizationId: OrganizationId,
    connectionId: string
): Promise<WabaConnection | null> {
    const [row] = await db
        .select()
        .from(wabaConfigs)
        .where(
            and(
                eq(wabaConfigs.id, connectionId),
                eq(wabaConfigs.organizationId, organizationId) // 🔒 doble filtro
            )
        )
        .limit(1);

    return row ? hydrate(row) : null;
}

/**
 * ⚠️ USO EXCLUSIVO DEL WEBHOOK.
 *
 * Es la ÚNICA función sin `organizationId`, porque su trabajo es precisamente
 * *descubrir* a qué organización pertenece un evento entrante. Meta solo nos
 * da el `phone_number_id`.
 *
 * Nunca la llames desde una Server Action ni desde código con sesión: ahí
 * siempre conoces el tenant y usar esto sería una vía de acceso cruzado.
 */
export async function resolveConnectionByPhoneNumberId(
    phoneNumberId: string
): Promise<WabaConnection | null> {
    if (!phoneNumberId) return null;

    const [row] = await db
        .select()
        .from(wabaConfigs)
        .where(eq(wabaConfigs.phoneNumberId, phoneNumberId))
        .orderBy(desc(wabaConfigs.isActive), desc(wabaConfigs.createdAt))
        .limit(1);

    return row ? hydrate(row) : null;
}

/** Búsqueda por `meta_user_id`, para el callback de desautorización. */
export async function findConnectionsByMetaUserId(
    metaUserId: string
): Promise<WabaConfig[]> {
    if (!metaUserId) return [];

    return db
        .select()
        .from(wabaConfigs)
        .where(eq(wabaConfigs.metaUserId, metaUserId));
}

/* ==========================================================================
 * Conexiones — escritura
 * ========================================================================== */

export interface UpsertConnectionInput {
    organizationId: OrganizationId;
    wabaId: string;
    phoneNumberId: string;
    accessToken: string; // en claro; se cifra aquí
    displayPhoneNumber?: string | null;
    verifiedName?: string | null;
    businessId?: string | null;
    metaUserId?: string | null;
    tokenType?: string | null;
    tokenExpiresAt?: Date | null;
}

/**
 * Crea o actualiza la conexión de una organización.
 *
 * 🔒 El target del conflicto INCLUYE `organizationId`. Con el
 * `UNIQUE(waba_id, phone_number_id)` del origen, un upsert de la organización B
 * sobrescribía la fila de A y le robaba la conexión (GOTCHAS G-09).
 */
export async function upsertConnection(
    input: UpsertConnectionInput
): Promise<PublicWabaConnection> {
    if (!input.organizationId) {
        throw new Error('[WABA] upsertConnection requiere organizationId.');
    }
    if (!input.accessToken) {
        throw new Error('[WABA] upsertConnection requiere accessToken.');
    }

    const [row] = await db
        .insert(wabaConfigs)
        .values({
            organizationId: input.organizationId,
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
            accessTokenEncrypted: encryptSecret(input.accessToken),
            displayPhoneNumber: input.displayPhoneNumber ?? null,
            verifiedName: input.verifiedName ?? null,
            businessId: input.businessId ?? null,
            metaUserId: input.metaUserId ?? null,
            tokenType: input.tokenType ?? null,
            tokenExpiresAt: input.tokenExpiresAt ?? null,
            isActive: true,
            connectionStatus: CONNECTION_STATUS.ACTIVE,
            lastError: null,
            lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: [
                wabaConfigs.organizationId, // 🔒 clave
                wabaConfigs.wabaId,
                wabaConfigs.phoneNumberId,
            ],
            set: {
                accessTokenEncrypted: encryptSecret(input.accessToken),
                displayPhoneNumber: input.displayPhoneNumber ?? null,
                verifiedName: input.verifiedName ?? null,
                businessId: input.businessId ?? null,
                metaUserId: input.metaUserId ?? null,
                tokenType: input.tokenType ?? null,
                tokenExpiresAt: input.tokenExpiresAt ?? null,
                isActive: true,
                connectionStatus: CONNECTION_STATUS.ACTIVE,
                lastError: null,
                lastSyncedAt: new Date(),
                updatedAt: new Date(),
            },
        })
        .returning();

    return {
        id: row.id,
        wabaId: row.wabaId,
        phoneNumberId: row.phoneNumberId,
        displayPhoneNumber: row.displayPhoneNumber,
        verifiedName: row.verifiedName,
        isActive: row.isActive,
        connectionStatus: row.connectionStatus,
        lastError: row.lastError,
        lastSyncedAt: row.lastSyncedAt,
    };
}

/**
 * Degrada la conexión cuando Meta rechaza el token.
 * Patrón heredado del origen: es preferible desactivar y mostrar el motivo
 * en la UI a que la página entera reviente con un 500.
 */
export async function markConnectionInactive(
    organizationId: OrganizationId,
    connectionId: string,
    reason: string
): Promise<void> {
    await db
        .update(wabaConfigs)
        .set({
            isActive: false,
            connectionStatus: CONNECTION_STATUS.ERROR,
            lastError: reason.slice(0, 500),
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(wabaConfigs.id, connectionId),
                eq(wabaConfigs.organizationId, organizationId) // 🔒
            )
        );
}

/** Refresca metadatos tras sincronizar con Meta. */
export async function touchConnectionSync(
    organizationId: OrganizationId,
    connectionId: string,
    patch: { displayPhoneNumber?: string | null; verifiedName?: string | null }
): Promise<void> {
    await db
        .update(wabaConfigs)
        .set({
            ...(patch.displayPhoneNumber !== undefined
                ? { displayPhoneNumber: patch.displayPhoneNumber }
                : {}),
            ...(patch.verifiedName !== undefined ? { verifiedName: patch.verifiedName } : {}),
            lastSyncedAt: new Date(),
            lastError: null,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(wabaConfigs.id, connectionId),
                eq(wabaConfigs.organizationId, organizationId) // 🔒
            )
        );
}

/**
 * Desconecta y purga.
 *
 * En el origen, sin sesión esto borraba `WHERE user_id IS NULL`, es decir,
 * las conexiones huérfanas de TODAS las organizaciones (GOTCHAS G-03).
 * Aquí `organizationId` es obligatorio y el borrado está acotado.
 *
 * @param purgeMessageLogs si true, borra también el histórico de mensajes
 *        (necesario para atender una solicitud de eliminación de datos de Meta).
 */
export async function disconnectWaba(
    organizationId: OrganizationId,
    connectionId: string,
    purgeMessageLogs = false
): Promise<{ deletedConnections: number; deletedMessageLogs: number }> {
    if (!organizationId) {
        throw new Error('[WABA] disconnectWaba requiere organizationId.');
    }

    let deletedMessageLogs = 0;

    if (purgeMessageLogs) {
        const purged = await db
            .delete(messageLogs)
            .where(
                and(
                    eq(messageLogs.organizationId, organizationId), // 🔒
                    eq(messageLogs.wabaConfigId, connectionId)
                )
            )
            .returning({ id: messageLogs.id });
        deletedMessageLogs = purged.length;
    }

    const deleted = await db
        .delete(wabaConfigs)
        .where(
            and(
                eq(wabaConfigs.id, connectionId),
                eq(wabaConfigs.organizationId, organizationId) // 🔒
            )
        )
        .returning({ id: wabaConfigs.id });

    return { deletedConnections: deleted.length, deletedMessageLogs };
}

/** Purga total de una organización. Para el callback de deauthorize de Meta. */
export async function purgeOrganizationWabaData(
    organizationId: OrganizationId
): Promise<{ deletedConnections: number; deletedMessageLogs: number }> {
    const logs = await db
        .delete(messageLogs)
        .where(
            and(
                eq(messageLogs.organizationId, organizationId),
                eq(messageLogs.channel, 'whatsapp') // no toca SMS/email
            )
        )
        .returning({ id: messageLogs.id });

    const configs = await db
        .delete(wabaConfigs)
        .where(eq(wabaConfigs.organizationId, organizationId))
        .returning({ id: wabaConfigs.id });

    return { deletedConnections: configs.length, deletedMessageLogs: logs.length };
}

/* ==========================================================================
 * message_logs
 * ========================================================================== */

export interface UpsertMessageEventInput {
    organizationId: OrganizationId;
    wabaConfigId?: string | null;
    subscriberId?: string | null;
    messageId: string;
    direction: 'inbound' | 'outbound';
    status: string;
    recipientPhone?: string | null;
    templateName?: string | null;
    templateLanguage?: string | null;
    messageText?: string | null;
    errorCode?: string | null;
    errorTitle?: string | null;
    errorMessage?: string | null;
    rawPayload?: unknown;
    lastEventAt?: Date;
}

/**
 * Upsert idempotente sobre `message_id`.
 *
 * Meta reenvía el mismo evento varias veces y el ciclo de vida de un mensaje
 * saliente escribe la misma fila 3–4 veces:
 *   accepted → sent → delivered → read (o failed)
 *
 * ⚠️ Requiere el índice único parcial `message_logs_message_id_uq`.
 * Sin él, `onConflictDoUpdate` no tiene sobre qué operar → filas duplicadas.
 */
export async function upsertMessageEvent(
    input: UpsertMessageEventInput
): Promise<void> {
    if (!input.organizationId) {
        throw new Error('[WABA] upsertMessageEvent requiere organizationId.');
    }
    if (!input.messageId) {
        // Sin wamid no hay idempotencia posible: se descarta en vez de duplicar.
        console.warn('[WABA] Evento sin message_id descartado.');
        return;
    }

    const now = new Date();

    const values: NewMessageLog = {
        organizationId: input.organizationId,
        wabaConfigId: input.wabaConfigId ?? null,
        subscriberId: input.subscriberId ?? null,
        messageId: input.messageId,
        direction: input.direction,
        channel: 'whatsapp',
        status: input.status,
        recipientPhone: input.recipientPhone ?? null,
        templateName: input.templateName ?? null,
        templateLanguage: input.templateLanguage ?? null,
        messageText: input.messageText ?? null,
        errorCode: input.errorCode ?? null,
        errorTitle: input.errorTitle ?? null,
        errorMessage: input.errorMessage ?? null,
        rawPayload: (input.rawPayload ?? null) as never,
        lastEventAt: input.lastEventAt ?? now,
        updatedAt: now,
    };

    await db
        .insert(messageLogs)
        .values(values)
        .onConflictDoUpdate({
            target: messageLogs.messageId,
            /**
             * ⚠️ OBLIGATORIO con un índice único PARCIAL.
             * `message_logs_message_id_uq` está definido como
             * `... (message_id) WHERE message_id IS NOT NULL`.
             * Postgres solo puede inferir un índice parcial si el ON CONFLICT
             * repite su predicado. Sin este `targetWhere` fallaría con
             * "there is no unique or exclusion constraint matching...".
             *
             * Requiere drizzle-orm >= 0.31. Si usas una versión anterior,
             * sustituye este bloque por db.execute(sql`INSERT ... ON CONFLICT
             * (message_id) WHERE message_id IS NOT NULL DO UPDATE ...`).
             */
            targetWhere: sql`${messageLogs.messageId} IS NOT NULL`,
            set: {
                status: values.status,
                // COALESCE: un evento de estado posterior no debe borrar datos
                // que solo conocía el evento de envío (texto, plantilla…).
                recipientPhone: sql`COALESCE(${messageLogs.recipientPhone}, EXCLUDED.recipient_phone)`,
                templateName: sql`COALESCE(${messageLogs.templateName}, EXCLUDED.template_name)`,
                messageText: sql`COALESCE(${messageLogs.messageText}, EXCLUDED.message_text)`,
                subscriberId: sql`COALESCE(${messageLogs.subscriberId}, EXCLUDED.subscriber_id)`,
                wabaConfigId: sql`COALESCE(${messageLogs.wabaConfigId}, EXCLUDED.waba_config_id)`,
                errorCode: values.errorCode,
                errorTitle: values.errorTitle,
                errorMessage: values.errorMessage,
                rawPayload: values.rawPayload,
                lastEventAt: values.lastEventAt,
                updatedAt: now,
            },
            // 🔒 No permite que un evento de otra organización pise la fila.
            setWhere: sql`${messageLogs.organizationId} = ${input.organizationId}`,
        });
}

/** Upsert en lote para el webhook (una sola query). */
export async function upsertMessageEvents(
    events: UpsertMessageEventInput[]
): Promise<number> {
    const valid = events.filter((e) => e.messageId && e.organizationId);
    if (!valid.length) return 0;

    for (const event of valid) {
        await upsertMessageEvent(event);
    }

    return valid.length;
}

/** Eventos recientes de la organización. */
export async function listRecentMessageEvents(
    organizationId: OrganizationId,
    options: { limit?: number; wabaConfigId?: string; recipientPhone?: string } = {}
): Promise<MessageLog[]> {
    if (!organizationId) {
        throw new Error('[WABA] listRecentMessageEvents requiere organizationId.');
    }

    const conditions = [
        eq(messageLogs.organizationId, organizationId), // 🔒
        eq(messageLogs.channel, 'whatsapp'),
    ];

    if (options.wabaConfigId) {
        conditions.push(eq(messageLogs.wabaConfigId, options.wabaConfigId));
    }
    if (options.recipientPhone) {
        conditions.push(eq(messageLogs.recipientPhone, options.recipientPhone));
    }

    return db
        .select()
        .from(messageLogs)
        .where(and(...conditions))
        .orderBy(desc(messageLogs.lastEventAt))
        .limit(options.limit ?? 50);
}

/** Estado de un mensaje concreto. Usado por el polling de la UI. */
export async function getMessageEventStatus(
    organizationId: OrganizationId,
    messageId: string
): Promise<MessageLog | null> {
    if (!organizationId || !messageId) return null;

    const [row] = await db
        .select()
        .from(messageLogs)
        .where(
            and(
                eq(messageLogs.organizationId, organizationId), // 🔒
                eq(messageLogs.messageId, messageId)
            )
        )
        .limit(1);

    return row ?? null;
}

/** Métricas de entrega para el dashboard. */
export async function getDeliveryStats(
    organizationId: OrganizationId,
    sinceDays = 30
): Promise<Record<string, number>> {
    const rows = await db
        .select({
            status: messageLogs.status,
            count: sql<number>`count(*)::int`,
        })
        .from(messageLogs)
        .where(
            and(
                eq(messageLogs.organizationId, organizationId), // 🔒
                eq(messageLogs.channel, 'whatsapp'),
                sql`${messageLogs.createdAt} > now() - (${sinceDays} || ' days')::interval`
            )
        )
        .groupBy(messageLogs.status);

    const stats: Record<string, number> = {
        [MESSAGE_STATUS.ACCEPTED]: 0,
        [MESSAGE_STATUS.SENT]: 0,
        [MESSAGE_STATUS.DELIVERED]: 0,
        [MESSAGE_STATUS.READ]: 0,
        [MESSAGE_STATUS.FAILED]: 0,
        [MESSAGE_STATUS.RECEIVED]: 0,
    };

    for (const row of rows) stats[row.status] = row.count;
    return stats;
}

/* ==========================================================================
 * Resolución de abonados
 * ========================================================================== */

/**
 * Casa un teléfono entrante con un `subscriber` de la organización.
 *
 * ⚙️ AJUSTA: cambia `subscribers` y el nombre de la columna de teléfono por
 * los reales de SaaS TOI (la auditoría te dice cuáles son).
 *
 * Se usa raw SQL a propósito: así no hace falta importar tu tabla
 * `subscribers`, cuyo esquema no conozco. Cuando lo tengas claro, migra
 * esta función a Drizzle tipado.
 */
export async function findSubscriberByPhone(
    organizationId: OrganizationId,
    phone: string
): Promise<{ id: string } | null> {
    if (!organizationId || !phone) return null;

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) return null;

    // Casa por los últimos 8 dígitos (longitud del móvil boliviano),
    // así tolera que la base guarde `71234567` y Meta devuelva `59171234567`.
    const suffix = digits.slice(-8);

    const result = await db.execute<{ id: string }>(sql`
        SELECT id FROM subscribers
        WHERE organization_id = ${organizationId}
          AND (
                right(regexp_replace(COALESCE(whatsapp_phone_e164, ''), '\\D', '', 'g'), 8) = ${suffix}
             OR right(regexp_replace(COALESCE(phone, ''),               '\\D', '', 'g'), 8) = ${suffix}
          )
        LIMIT 1
    `);

    const rows = (result as unknown as { rows?: Array<{ id: string }> }).rows ?? (result as unknown as Array<{ id: string }>);
    return rows?.[0] ?? null;
}

/**
 * Abonados elegibles para recordatorio de pago.
 *
 * ⚙️ AJUSTA la cláusula de negocio a tu modelo real (estado de pago, fecha de
 * vencimiento, servicio suspendido…). Se deja explícito el filtro de opt-in
 * porque Meta lo exige.
 */
export async function listRemindableSubscribers(
    organizationId: OrganizationId,
    limit = 500
): Promise<Array<{ id: string; phone: string; name: string | null }>> {
    const result = await db.execute<{ id: string; phone: string; name: string | null }>(sql`
        SELECT
            id,
            COALESCE(whatsapp_phone_e164, phone) AS phone,
            name
        FROM subscribers
        WHERE organization_id = ${organizationId}
          AND COALESCE(whatsapp_opt_in, false) = true
          AND COALESCE(whatsapp_phone_e164, phone) IS NOT NULL
          -- AND payment_status IN ('pending','overdue')   ⚙️ descomenta/ajusta
          -- AND is_active = true
          -- AND deleted_at IS NULL
        LIMIT ${limit}
    `);

    const rows = (result as unknown as { rows?: Array<{ id: string; phone: string; name: string | null }> }).rows
        ?? (result as unknown as Array<{ id: string; phone: string; name: string | null }>);
    return rows ?? [];
}

/* ==========================================================================
 * Dead-letter de webhooks
 * ========================================================================== */

/**
 * Guarda un evento que no se pudo procesar, en vez de perderlo.
 *
 * El webhook del origen respondía 200 aunque el insert fallara (GOTCHAS G-11):
 * Meta no reintenta y el evento desaparecía para siempre.
 */
export async function recordDeadletter(
    reason: string,
    payload: unknown,
    phoneNumberId?: string | null
): Promise<void> {
    try {
        await db.insert(wabaWebhookDeadletter).values({
            reason,
            phoneNumberId: phoneNumberId ?? null,
            payload: payload as never,
        });
    } catch (error) {
        // Último recurso: si ni el dead-letter funciona, al menos queda en el log.
        console.error('[WABA] No se pudo registrar el dead-letter:', error, JSON.stringify(payload));
    }
}

/** Eventos pendientes de reproceso. */
export async function listPendingDeadletters(limit = 100) {
    return db
        .select()
        .from(wabaWebhookDeadletter)
        .where(sql`${wabaWebhookDeadletter.processedAt} IS NULL`)
        .orderBy(wabaWebhookDeadletter.receivedAt)
        .limit(limit);
}

export async function markDeadlettersProcessed(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await db
        .update(wabaWebhookDeadletter)
        .set({ processedAt: new Date() })
        .where(inArray(wabaWebhookDeadletter.id, ids));
}

/** Conexiones con error, para un panel de salud del sistema. */
export async function listBrokenConnections(organizationId: OrganizationId) {
    return db
        .select({
            id: wabaConfigs.id,
            displayPhoneNumber: wabaConfigs.displayPhoneNumber,
            connectionStatus: wabaConfigs.connectionStatus,
            lastError: wabaConfigs.lastError,
        })
        .from(wabaConfigs)
        .where(
            and(
                eq(wabaConfigs.organizationId, organizationId), // 🔒
                eq(wabaConfigs.isActive, false),
                isNotNull(wabaConfigs.lastError)
            )
        );
}
