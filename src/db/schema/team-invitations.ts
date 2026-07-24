import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const teamInvitations = pgTable(
  'team_invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull().default('billing'),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('team_invitations_token_idx').on(table.token),
    index('team_invitations_org_id_idx').on(table.organizationId),
  ]
);

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type NewTeamInvitation = typeof teamInvitations.$inferInsert;
