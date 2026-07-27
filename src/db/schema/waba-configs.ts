import { pgTable, uuid, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

/**
 * waba_configs — una conexión WhatsApp Business por organización.
 *
 * Adaptado del export-waba-module. Columnas del proyecto actual se conservan
 * con sus nombres reales (display_phone, encrypted_token, etc.) y se mapean
 * en column-map.ts para que el código del módulo WABA funcione sin renombrar
 * columnas en la DB.
 *
 * Columnas añadidas para el módulo completo (Paso 2):
 *   verifiedName, businessId, metaUserId, tokenType, tokenExpiresAt,
 *   webhookVerifyToken, isActive, lastError, lastSyncedAt
 */
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
    // --- Columnas añadidas para el módulo WABA completo ---
    verifiedName: text('verified_name'),
    businessId: text('business_id'),
    metaUserId: text('meta_user_id'),
    tokenType: text('token_type'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    webhookVerifyToken: text('webhook_verify_token'),
    isActive: boolean('is_active').notNull().default(true),
    lastError: text('last_error'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    // 🔒 Unicidad compuesta: un WABA+phone por organización (no sobrescribe la conexión de otro tenant)
    uniqueIndex('waba_configs_org_waba_phone_uq').on(
      table.organizationId,
      table.wabaId,
      table.phoneNumberId
    ),
    // Lookup rápido de conexiones activas por tenant
    index('waba_configs_org_active_idx').on(table.organizationId, table.isActive),
    // Búsqueda por meta_user_id (callback de deauthorize)
    index('waba_configs_meta_user_id_idx').on(table.metaUserId),
  ]
);

export type WabaConfig = typeof wabaConfigs.$inferSelect;
export type NewWabaConfig = typeof wabaConfigs.$inferInsert;
