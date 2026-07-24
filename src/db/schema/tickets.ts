import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { subscribers } from './subscribers';

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    subscriberId: uuid('subscriber_id')
      .notNull()
      .references(() => subscribers.id, { onDelete: 'cascade' }),
    ticketNumber: text('ticket_number').notNull(),
    category: text('category').notNull().default('no_service'), // 'no_service' | 'slow_internet' | 'wifi_password' | 'other'
    priority: text('priority').notNull().default('medium'), // 'low' | 'medium' | 'high' | 'critical'
    status: text('status').notNull().default('open'), // 'open' | 'in_progress' | 'resolved' | 'closed'
    description: text('description').notNull(),
    assignedTechnician: text('assigned_technician'),
    internalNotes: text('internal_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_tickets_org_id').on(table.organizationId),
    index('idx_tickets_subscriber_id').on(table.subscriberId),
    index('idx_tickets_status').on(table.status),
  ]
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
