import { pgTable, uuid, text, jsonb, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { subscribers } from './subscribers';

export const chatbotConfig = pgTable(
  'chatbot_config',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' })
      .unique(),
    systemPrompt: text('system_prompt').notNull(),
    transferThreshold: integer('transfer_threshold').notNull().default(30),
    qualificationQuestions: jsonb('qualification_questions').default([]),
    enabled: jsonb('enabled').default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('chatbot_config_org_id_idx').on(table.organizationId),
  ]
);

export const chatbotConversations = pgTable(
  'chatbot_conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    subscriberId: uuid('subscriber_id').references(() => subscribers.id, { onDelete: 'set null' }),
    phone: text('phone').notNull(),
    status: text('status').notNull().default('active'),
    qualificationScore: integer('qualification_score').default(0),
    qualificationData: jsonb('qualification_data').default({}),
    transferredTo: uuid('transferred_to'),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    endedAt: timestamp('ended_at'),
  },
  (table) => [
    index('chatbot_conversations_org_id_idx').on(table.organizationId),
    index('chatbot_conversations_phone_idx').on(table.phone),
    index('chatbot_conversations_status_idx').on(table.organizationId, table.status),
  ]
);

export const chatbotMessages = pgTable(
  'chatbot_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => chatbotConversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('chatbot_messages_conversation_id_idx').on(table.conversationId),
  ]
);

export type ChatbotConfig = typeof chatbotConfig.$inferSelect;
export type NewChatbotConfig = typeof chatbotConfig.$inferInsert;
export type ChatbotConversation = typeof chatbotConversations.$inferSelect;
export type NewChatbotConversation = typeof chatbotConversations.$inferInsert;
export type ChatbotMessage = typeof chatbotMessages.$inferSelect;
export type NewChatbotMessage = typeof chatbotMessages.$inferInsert;
