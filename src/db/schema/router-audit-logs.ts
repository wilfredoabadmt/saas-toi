import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { routerConfigs } from './router-configs';
import { subscribers } from './subscribers';

export const routerAuditLogs = pgTable(
  'router_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    routerId: uuid('router_id')
      .notNull()
      .references(() => routerConfigs.id, { onDelete: 'cascade' }),
    subscriberId: uuid('subscriber_id')
      .references(() => subscribers.id, { onDelete: 'set null' }),
    action: text('action').notNull(), // 'test_connection' | 'suspend' | 'reactivate'
    command: text('command').notNull(),
    responseStatus: integer('response_status').notNull(),
    responseBody: text('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_router_audit_org_id').on(table.organizationId),
    index('idx_router_audit_router_id').on(table.routerId),
  ]
);

export type RouterAuditLog = typeof routerAuditLogs.$inferSelect;
export type NewRouterAuditLog = typeof routerAuditLogs.$inferInsert;
