import { pgTable, uuid, text, jsonb, integer, boolean, date, numeric, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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
    aiEnabled: boolean('ai_enabled').notNull().default(true),
    handoffAt: timestamp('handoff_at'),
    handoffReason: text('handoff_reason'),
    isTest: boolean('is_test').notNull().default(false),
    lastInboundAt: timestamp('last_inbound_at'),
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

/* -------------------------------------------------------------------------- */
/* Perfil del agente de IA: uno por organización                              */
/* -------------------------------------------------------------------------- */

export const agentProfile = pgTable(
  'agent_profile',
  {
    id: text('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull().default(false),
    name: text('name').notNull().default('Asistente'),
    tone: text('tone'),
    instructions: text('instructions'),
    escalationRules: text('escalation_rules'),
    greeting: text('greeting'),
    paymentInstructions: text('payment_instructions'),
    allowPaymentPromise: boolean('allow_payment_promise').notNull().default(true),
    allowTicketCreation: boolean('allow_ticket_creation').notNull().default(true),
    allowReceiptCapture: boolean('allow_receipt_capture').notNull().default(true),
    maxPromiseDays: integer('max_promise_days').notNull().default(7),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('agent_profile_org_uq').on(t.organizationId)]
);

/* -------------------------------------------------------------------------- */
/* Knowledge base: base de conocimiento del agente                            */
/* -------------------------------------------------------------------------- */

export const kbEntry = pgTable(
  'kb_entry',
  {
    id: text('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['qa', 'block'] }).notNull(),
    question: text('question'),
    answer: text('answer'),
    content: text('content'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('kb_org_idx').on(t.organizationId)]
);

/* -------------------------------------------------------------------------- */
/* Promesa de pago                                                            */
/* -------------------------------------------------------------------------- */

export const paymentPromise = pgTable(
  'payment_promise',
  {
    id: text('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    subscriberId: uuid('subscriber_id')
      .notNull()
      .references(() => subscribers.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => chatbotConversations.id, {
      onDelete: 'set null',
    }),
    promisedFor: date('promised_for').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }),
    status: text('status', {
      enum: ['pendiente', 'cumplida', 'incumplida', 'cancelada'],
    })
      .notNull()
      .default('pendiente'),
    source: text('source', { enum: ['ia', 'humano'] }).notNull().default('ia'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('payment_promise_org_sub_idx').on(t.organizationId, t.subscriberId),
    uniqueIndex('payment_promise_active_uq')
      .on(t.organizationId, t.subscriberId)
      .where(sql`${t.status} = 'pendiente'`),
  ]
);

/* -------------------------------------------------------------------------- */
/* Comprobante de pago (en revisión humana)                                   */
/* -------------------------------------------------------------------------- */

export const paymentReceipt = pgTable(
  'payment_receipt',
  {
    id: text('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    subscriberId: uuid('subscriber_id')
      .notNull()
      .references(() => subscribers.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => chatbotConversations.id, {
      onDelete: 'set null',
    }),
    messageId: uuid('message_id').references(() => chatbotMessages.id, {
      onDelete: 'set null',
    }),
    storageKey: text('storage_key'),
    declaredAmount: numeric('declared_amount', { precision: 12, scale: 2 }),
    reference: text('reference'),
    status: text('status', {
      enum: ['en_revision', 'aprobado', 'rechazado'],
    })
      .notNull()
      .default('en_revision'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('payment_receipt_org_status_idx').on(t.organizationId, t.status),
    uniqueIndex('payment_receipt_message_uq').on(t.messageId),
  ]
);

export type ChatbotConfig = typeof chatbotConfig.$inferSelect;
export type NewChatbotConfig = typeof chatbotConfig.$inferInsert;
export type ChatbotConversation = typeof chatbotConversations.$inferSelect;
export type NewChatbotConversation = typeof chatbotConversations.$inferInsert;
export type ChatbotMessage = typeof chatbotMessages.$inferSelect;
export type NewChatbotMessage = typeof chatbotMessages.$inferInsert;
export type AgentProfile = typeof agentProfile.$inferSelect;
export type NewAgentProfile = typeof agentProfile.$inferInsert;
export type KbEntry = typeof kbEntry.$inferSelect;
export type NewKbEntry = typeof kbEntry.$inferInsert;
export type PaymentPromise = typeof paymentPromise.$inferSelect;
export type NewPaymentPromise = typeof paymentPromise.$inferInsert;
export type PaymentReceipt = typeof paymentReceipt.$inferSelect;
export type NewPaymentReceipt = typeof paymentReceipt.$inferInsert;
