import { pgTable, uuid, text, jsonb, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { subscribers } from './subscribers';
import { users } from './users';

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    subscriberId: uuid('subscriber_id').references(() => subscribers.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    zone: text('zone'),
    needs: text('needs'),
    source: text('source').notNull().default('chatbot'),
    score: integer('score').default(0),
    status: text('status').notNull().default('new'),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    qualificationData: jsonb('qualification_data').default({}),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('leads_org_id_idx').on(table.organizationId),
    index('leads_org_status_idx').on(table.organizationId, table.status),
    index('leads_phone_idx').on(table.phone),
  ]
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
