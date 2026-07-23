import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { subscribers } from './subscribers';

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
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('message_logs_org_id_idx').on(table.organizationId),
    index('message_logs_subscriber_id_idx').on(table.subscriberId),
    index('message_logs_wamid_idx').on(table.wamid),
    index('message_logs_delivery_status_idx').on(table.organizationId, table.deliveryStatus),
  ]
);

export type MessageLog = typeof messageLogs.$inferSelect;
export type NewMessageLog = typeof messageLogs.$inferInsert;
