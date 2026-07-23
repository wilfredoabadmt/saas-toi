import { pgTable, uuid, text, numeric, date, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { servicePlans } from './service-plans';

export const subscribers = pgTable(
  'subscribers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    servicePlanId: uuid('service_plan_id').references(() => servicePlans.id, { onDelete: 'set null' }),
    monthlyAmount: numeric('monthly_amount', { precision: 10, scale: 2 }).notNull(),
    dueDate: date('due_date').notNull(),
    status: text('status').notNull().default('active'),
    paymentStatus: text('payment_status').notNull().default('current'),
    address: text('address'),
    notes: text('notes'),
    optedOutWhatsapp: boolean('opted_out_whatsapp').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('subscribers_org_id_idx').on(table.organizationId),
    index('subscribers_org_payment_status_idx').on(table.organizationId, table.paymentStatus),
    index('subscribers_org_due_date_idx').on(table.organizationId, table.dueDate),
    unique('subscribers_phone_org_unique').on(table.phone, table.organizationId),
  ]
);

export type Subscriber = typeof subscribers.$inferSelect;
export type NewSubscriber = typeof subscribers.$inferInsert;
