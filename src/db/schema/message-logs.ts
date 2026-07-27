import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { subscribers } from './subscribers';
import { wabaConfigs } from './waba-configs';

/**
 * message_logs — log append-only de eventos de mensajes.
 *
 * Adaptado del export-waba-module. Columnas del proyecto actual se conservan
 * con sus nombres reales (wamid, delivery_status, failure_reason, etc.) y se
 * mapean en column-map.ts para que el código del módulo WABA funcione sin
 * renombrar columnas en la DB.
 *
 * Mapeo de nombres (export module → proyecto):
 *   message_id      → wamid
 *   status          → delivery_status
 *   error_message   → failure_reason
 *
 * Columnas añadidas para el módulo completo (Paso 2):
 *   wabaConfigId, channel, recipientPhone, templateLanguage, messageText,
 *   errorCode, errorTitle, rawPayload, lastEventAt
 */
export const messageLogs = pgTable(
  'message_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    subscriberId: uuid('subscriber_id').references(() => subscribers.id, { onDelete: 'set null' }),
    wamid: text('wamid').notNull(),
    direction: text('direction').notNull(), // 'outbound' | 'inbound'
    messageType: text('message_type').notNull(), // 'template' | 'text' | 'image' | 'document' | 'unknown'
    templateName: text('template_name'),
    contentPreview: text('content_preview'),
    deliveryStatus: text('delivery_status').notNull().default('sent'), // 'sent' | 'delivered' | 'read' | 'failed'
    failureReason: text('failure_reason'),
    sentAt: timestamp('sent_at').notNull().defaultNow(),
    statusUpdatedAt: timestamp('status_updated_at'),
    // --- Columnas añadidas para el módulo WABA completo ---
    wabaConfigId: uuid('waba_config_id').references(() => wabaConfigs.id, { onDelete: 'set null' }),
    channel: text('channel').notNull().default('whatsapp'),
    recipientPhone: text('recipient_phone'),
    templateLanguage: text('template_language'),
    messageText: text('message_text'),
    errorCode: text('error_code'),
    errorTitle: text('error_title'),
    rawPayload: jsonb('raw_payload'),
    lastEventAt: timestamp('last_event_at', { withTimezone: true }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('message_logs_org_id_idx').on(table.organizationId),
    index('message_logs_subscriber_id_idx').on(table.subscriberId),
    index('message_logs_wamid_idx').on(table.wamid),
    index('message_logs_delivery_status_idx').on(table.organizationId, table.deliveryStatus),
    // 🔒 IDEMPOTENCIA: UNIQUE parcial sobre wamid para que el webhook de Meta
    //    (que reenvía eventos) no duplique filas via onConflictDoUpdate.
    uniqueIndex('message_logs_wamid_uq')
      .on(table.wamid)
      .where(sql`${table.wamid} IS NOT NULL`),
    // Índices de查询 adicionales
    index('message_logs_org_created_idx').on(table.organizationId, table.createdAt),
    index('message_logs_org_config_event_idx').on(
      table.organizationId,
      table.wabaConfigId,
      table.lastEventAt
    ),
    index('message_logs_org_recipient_idx').on(table.organizationId, table.recipientPhone),
  ]
);

export type MessageLog = typeof messageLogs.$inferSelect;
export type NewMessageLog = typeof messageLogs.$inferInsert;
