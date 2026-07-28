import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { subscriptions } from './subscriptions';
import { saasPlans } from './saas-plans';
import { users } from './users';

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [organizations.id],
    references: [subscriptions.organizationId],
  }),
  users: many(users),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  plan: one(saasPlans, {
    fields: [subscriptions.planId],
    references: [saasPlans.id],
  }),
}));

export const saasPlansRelations = relations(saasPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));
