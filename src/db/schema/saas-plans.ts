import { pgTable, uuid, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';

export const saasPlans = pgTable('saas_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  maxSubscribers: integer('max_subscribers').notNull(),
  maxRouters: integer('max_routers').notNull(),
  priceMonthlyUSD: numeric('price_monthly_usd', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type SaasPlan = typeof saasPlans.$inferSelect;
export type NewSaasPlan = typeof saasPlans.$inferInsert;
