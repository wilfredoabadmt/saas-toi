import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const processedWebhookEvents = pgTable(
  'processed_webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: text('event_id').notNull().unique(), // wamid or status_id
    eventType: text('event_type').notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    payloadHash: text('payload_hash'),
    receivedAt: timestamp('received_at').notNull().defaultNow(),
    processedAt: timestamp('processed_at'),
  },
  (table) => [
    index('processed_events_received_at_idx').on(table.receivedAt),
  ]
);

export type ProcessedWebhookEvent = typeof processedWebhookEvents.$inferSelect;
export type NewProcessedWebhookEvent = typeof processedWebhookEvents.$inferInsert;
