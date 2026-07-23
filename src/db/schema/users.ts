import { pgTable, uuid, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull().default('admin'),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('users_org_id_idx').on(table.organizationId),
    unique('users_email_org_unique').on(table.email, table.organizationId),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
