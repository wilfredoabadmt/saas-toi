import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * waba_webhook_deadletter — cola de reproceso de webhooks fallidos.
 *
 * Cuando el webhook de Meta no se puede persistir (error de DB, tenant no
 * resuelto, etc.), el evento se guarda aquí en vez de perderse silenciosamente.
 *
 * Regla de diseño: el webhook SIEMPRE responde 200 a Meta (para que no desactive
 * el webhook), pero registra el fallo aquí para reproceso manual o automático.
 */
export const wabaWebhookDeadletter = pgTable(
  'waba_webhook_deadletter',
  {
    id: uuid('id').defaultRandom().primaryKey(),
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

export type WabaWebhookDeadletter = typeof wabaWebhookDeadletter.$inferSelect;
export type NewWabaWebhookDeadletter = typeof wabaWebhookDeadletter.$inferInsert;
