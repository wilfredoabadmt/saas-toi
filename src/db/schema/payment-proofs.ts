import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { subscribers } from './subscribers';
import { messageLogs } from './message-logs';
import { users } from './users';

export const paymentProofs = pgTable(
  'payment_proofs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    subscriberId: uuid('subscriber_id')
      .notNull()
      .references(() => subscribers.id, { onDelete: 'cascade' }),
    messageLogId: uuid('message_log_id').references(() => messageLogs.id, { onDelete: 'set null' }),
    wamid: text('wamid').notNull().unique(),
    fileType: text('file_type').notNull(), // 'image' | 'document'
    mimeType: text('mime_type').notNull(),
    s3Key: text('s3_key').notNull(),
    fileSizeBytes: integer('file_size_bytes'),
    reviewStatus: text('review_status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at'),
    reviewNotes: text('review_notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('payment_proofs_org_id_idx').on(table.organizationId),
    index('payment_proofs_subscriber_id_idx').on(table.subscriberId),
    index('payment_proofs_review_status_idx').on(table.organizationId, table.reviewStatus),
  ]
);

export type PaymentProof = typeof paymentProofs.$inferSelect;
export type NewPaymentProof = typeof paymentProofs.$inferInsert;
