import { pgTable, uuid, text, numeric, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const servicePlans = pgTable(
  'service_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    speedDown: text('speed_down'),
    speedUp: text('speed_up'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('service_plans_org_id_idx').on(table.organizationId),
    unique('service_plans_name_org_unique').on(table.name, table.organizationId),
  ]
);

export type ServicePlan = typeof servicePlans.$inferSelect;
export type NewServicePlan = typeof servicePlans.$inferInsert;
