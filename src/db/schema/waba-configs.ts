import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const wabaConfigs = pgTable(
  'waba_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    wabaId: text('waba_id').notNull(),
    phoneNumberId: text('phone_number_id').notNull().unique(),
    displayPhone: text('display_phone').notNull(),
    encryptedToken: text('encrypted_token').notNull(),
    keyVersion: integer('key_version').notNull().default(1),
    connectionStatus: text('connection_status').notNull().default('connected'),
    connectedAt: timestamp('connected_at').notNull().defaultNow(),
    disconnectedAt: timestamp('disconnected_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  }
);

export type WabaConfig = typeof wabaConfigs.$inferSelect;
export type NewWabaConfig = typeof wabaConfigs.$inferInsert;
