/**
 * Drizzle schema — Módulo WABA (SaaS TOI)
 * ---------------------------------------
 * Destino sugerido: `src/db/schema/waba.ts` (ajusta a tu estructura real).
 *
 * ⚠️ IMPORTANTE — CÓMO USAR ESTE ARCHIVO
 *
 * `waba_configs`, `message_logs` y `subscribers` YA EXISTEN en SaaS TOI.
 * NO reemplaces tus definiciones actuales por estas.
 *
 * Modo de uso correcto:
 *   1. Ejecuta 00-AUDITORIA para saber qué columnas tienes realmente.
 *   2. Aplica 02-DB-DRIZZLE/migration.sql (aditiva).
 *   3. **Fusiona** los campos de abajo dentro de tus pgTable existentes,
 *      conservando todas tus columnas propias.
 *   4. Ejecuta `drizzle-kit generate` y revisa el SQL generado:
 *      si propone algún DROP o ALTER TYPE, PARA y corrige el schema.
 *      Alternativa segura: `drizzle-kit pull` para introspectar la DB real.
 *
 * `subscribers` aquí es un stub deliberadamente mínimo: solo declara las
 * columnas de opt-in que añade la migración. Tu tabla real tiene muchas más.
 */

import { relations, sql } from 'drizzle-orm';
import {
    boolean,
    index,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// ⚙️ AJUSTA ESTO PRIMERO
// ---------------------------------------------------------------------------
// Importa tu tabla real de organizaciones para poder declarar las FK.
// import { organizations } from './organizations';
//
// Si tu organization_id NO es uuid, cambia `uuid('organization_id')` por
// `text('organization_id')` o `integer('organization_id')` en las 2 tablas.
// El tipo debe coincidir EXACTAMENTE con el que detectó migration.sql.
// ---------------------------------------------------------------------------

/* ==========================================================================
 * waba_configs — una conexión WhatsApp Business por organización
 * ========================================================================== */

export const wabaConfigs = pgTable(
    'waba_configs',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        /** 🔒 Aislamiento multi-tenant. NUNCA consultes esta tabla sin filtrar por aquí. */
        organizationId: uuid('organization_id').notNull(),
        // .references(() => organizations.id, { onDelete: 'cascade' }),

        // --- Identificadores de Meta -----------------------------------------
        /** ID de la WhatsApp Business Account. */
        wabaId: text('waba_id').notNull(),
        /** ID del número emisor. Es la CLAVE con la que el webhook resuelve el tenant. */
        phoneNumberId: text('phone_number_id').notNull(),
        /** Número legible, p.ej. "+591 69926886". */
        displayPhoneNumber: text('display_phone_number'),
        /** Nombre verificado del negocio en WhatsApp. */
        verifiedName: text('verified_name'),
        /** ID del Business Manager, si Meta lo devuelve. */
        businessId: text('business_id'),
        /** ID del usuario de Meta que autorizó. Necesario para el callback de deauthorize. */
        metaUserId: text('meta_user_id'),

        // --- Credenciales ----------------------------------------------------
        /**
         * Token de larga duración CIFRADO con AES-256-GCM.
         * Formato: `v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`.
         * 🚫 Nunca lo devuelvas al cliente ni lo escribas en logs.
         */
        accessTokenEncrypted: text('access_token_encrypted').notNull(),
        tokenType: text('token_type'),
        /** Meta no siempre lo informa; si es null se asume no expirable (system user token). */
        tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
        /** Token de verificación del webhook. Puede ser por-tenant o global (env). */
        webhookVerifyToken: text('webhook_verify_token'),

        // --- Estado ----------------------------------------------------------
        /** 'active' | 'inactive' | 'revoked' | 'error' | 'pending_registration' */
        connectionStatus: text('connection_status').notNull().default('active'),
        isActive: boolean('is_active').notNull().default(true),
        /** Último mensaje de error devuelto por Meta (para diagnóstico en la UI). */
        lastError: text('last_error'),
        lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),

        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        /**
         * 🔒 CRÍTICO: la unicidad DEBE incluir organizationId.
         * Con `unique(wabaId, phoneNumberId)` a secas, un UPSERT de la
         * organización B sobrescribe la conexión de A. Ver GOTCHAS G-09.
         */
        orgWabaPhoneUq: uniqueIndex('waba_configs_org_waba_phone_uq').on(
            table.organizationId,
            table.wabaId,
            table.phoneNumberId
        ),
        /** El webhook hace este lookup en cada evento: debe estar indexado. */
        phoneNumberIdIdx: index('waba_configs_phone_number_id_idx').on(table.phoneNumberId),
        orgActiveIdx: index('waba_configs_org_active_idx').on(table.organizationId, table.isActive),
        metaUserIdIdx: index('waba_configs_meta_user_id_idx').on(table.metaUserId),
    })
);

/* ==========================================================================
 * message_logs — log append-only de eventos de mensajes
 * ========================================================================== */

export const messageLogs = pgTable(
    'message_logs',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        /** 🔒 Aislamiento multi-tenant. */
        organizationId: uuid('organization_id').notNull(),
        // .references(() => organizations.id, { onDelete: 'cascade' }),

        /** Conexión emisora. Null solo si el evento llegó antes de resolver el tenant. */
        wabaConfigId: uuid('waba_config_id').references(() => wabaConfigs.id, {
            onDelete: 'set null',
        }),

        /** Abonado destinatario, si se pudo resolver por teléfono. */
        subscriberId: uuid('subscriber_id'),
        // .references(() => subscribers.id, { onDelete: 'set null' }),

        /**
         * `wamid.XXXX` de Meta. Clave de IDEMPOTENCIA del webhook.
         * Nullable a propósito: message_logs puede contener eventos de otros
         * canales (SMS, email) que no tienen wamid.
         */
        messageId: text('message_id'),

        /** 'outbound' | 'inbound' */
        direction: text('direction').notNull().default('outbound'),
        /** 'whatsapp' | 'sms' | 'email' — permite que la tabla siga siendo multicanal. */
        channel: text('channel').notNull().default('whatsapp'),

        recipientPhone: text('recipient_phone'),
        templateName: text('template_name'),
        templateLanguage: text('template_language'),
        messageText: text('message_text'),

        /**
         * Ciclo de vida saliente: accepted → sent → delivered → read
         *                                        ↘ failed
         * Entrante: received
         */
        status: text('status').notNull().default('accepted'),

        errorCode: text('error_code'),
        errorTitle: text('error_title'),
        errorMessage: text('error_message'),

        /** Payload crudo del evento de Meta, para auditoría y reproceso. */
        rawPayload: jsonb('raw_payload'),

        lastEventAt: timestamp('last_event_at', { withTimezone: true }).defaultNow(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        /**
         * 🔒 CRÍTICO: índice único PARCIAL sobre message_id.
         * Sin él, `onConflictDoUpdate` no tiene sobre qué operar y el webhook
         * de Meta (que reenvía eventos) duplicará filas indefinidamente.
         * Parcial para no romper filas preexistentes sin wamid.
         */
        messageIdUq: uniqueIndex('message_logs_message_id_uq')
            .on(table.messageId)
            .where(sql`${table.messageId} IS NOT NULL`),

        orgCreatedIdx: index('message_logs_org_created_idx').on(
            table.organizationId,
            table.createdAt
        ),
        orgConfigEventIdx: index('message_logs_org_config_event_idx').on(
            table.organizationId,
            table.wabaConfigId,
            table.lastEventAt
        ),
        orgRecipientIdx: index('message_logs_org_recipient_idx').on(
            table.organizationId,
            table.recipientPhone
        ),
        subscriberIdx: index('message_logs_subscriber_idx').on(table.subscriberId),
    })
);

/* ==========================================================================
 * waba_webhook_deadletter — eventos que no se pudieron persistir
 * ========================================================================== */

export const wabaWebhookDeadletter = pgTable(
    'waba_webhook_deadletter',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
        /** 'unknown_tenant' | 'db_error' | 'invalid_signature' | ... */
        reason: text('reason').notNull(),
        phoneNumberId: text('phone_number_id'),
        payload: jsonb('payload').notNull(),
        processedAt: timestamp('processed_at', { withTimezone: true }),
    },
    (table) => ({
        pendingIdx: index('waba_webhook_deadletter_pending_idx').on(table.receivedAt),
    })
);

/* ==========================================================================
 * Relaciones
 * ========================================================================== */

export const wabaConfigsRelations = relations(wabaConfigs, ({ many }) => ({
    messageLogs: many(messageLogs),
}));

export const messageLogsRelations = relations(messageLogs, ({ one }) => ({
    wabaConfig: one(wabaConfigs, {
        fields: [messageLogs.wabaConfigId],
        references: [wabaConfigs.id],
    }),
}));

/* ==========================================================================
 * Tipos inferidos
 * ========================================================================== */

export type WabaConfig = typeof wabaConfigs.$inferSelect;
export type NewWabaConfig = typeof wabaConfigs.$inferInsert;
export type MessageLog = typeof messageLogs.$inferSelect;
export type NewMessageLog = typeof messageLogs.$inferInsert;

/**
 * Vista segura de una conexión: NUNCA incluye el token.
 * Úsala como tipo de retorno en todo lo que cruce hacia el cliente.
 */
export type SafeWabaConfig = Omit<WabaConfig, 'accessTokenEncrypted' | 'webhookVerifyToken'>;

export function toSafeWabaConfig(config: WabaConfig): SafeWabaConfig {
    const { accessTokenEncrypted: _token, webhookVerifyToken: _verify, ...safe } = config;
    return safe;
}

/* ==========================================================================
 * Columnas de opt-in añadidas a `subscribers` por migration.sql
 * --------------------------------------------------------------------------
 * NO declares aquí una tabla `subscribers` nueva: fusiona estos campos en la
 * definición que ya tienes. Meta exige poder demostrar el consentimiento.
 * ==========================================================================
 *
 *   whatsappOptIn:        boolean('whatsapp_opt_in').default(false),
 *   whatsappOptInAt:      timestamp('whatsapp_opt_in_at', { withTimezone: true }),
 *   whatsappOptInSource:  text('whatsapp_opt_in_source'),
 *   whatsappPhoneE164:    text('whatsapp_phone_e164'),
 */
