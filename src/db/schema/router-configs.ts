import { pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const routerConfigs = pgTable(
  'router_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    host: text('host').notNull(),
    apiPort: integer('api_port').notNull().default(443),
    username: text('username').notNull(),
    encryptedPassword: text('encrypted_password').notNull(),
    iv: text('iv').notNull(),
    authTag: text('auth_tag').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_router_configs_org_id').on(table.organizationId),
  ]
);

export type RouterConfig = typeof routerConfigs.$inferSelect;
export type NewRouterConfig = typeof routerConfigs.$inferInsert;
