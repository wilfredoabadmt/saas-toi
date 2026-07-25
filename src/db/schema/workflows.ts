import { pgTable, uuid, text, jsonb, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { subscribers } from './subscribers';

export const workflows = pgTable(
  'workflows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    triggerType: text('trigger_type').notNull(),
    triggerConfig: jsonb('trigger_config').default({}),
    status: text('status').notNull().default('draft'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('workflows_org_id_idx').on(table.organizationId),
    index('workflows_org_status_idx').on(table.organizationId, table.status),
  ]
);

export const workflowSteps = pgTable(
  'workflow_steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    stepOrder: integer('step_order').notNull(),
    stepType: text('step_type').notNull(),
    actionType: text('action_type'),
    config: jsonb('config').default({}),
    nextStepId: uuid('next_step_id'),
    trueStepId: uuid('true_step_id'),
    falseStepId: uuid('false_step_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('workflow_steps_workflow_id_idx').on(table.workflowId),
  ]
);

export const workflowExecutions = pgTable(
  'workflow_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    subscriberId: uuid('subscriber_id')
      .notNull()
      .references(() => subscribers.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    currentStepId: uuid('current_step_id'),
    status: text('status').notNull().default('running'),
    iterationCount: integer('iteration_count').notNull().default(0),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    errorMessage: text('error_message'),
  },
  (table) => [
    index('workflow_executions_org_id_idx').on(table.organizationId),
    index('workflow_executions_workflow_id_idx').on(table.workflowId),
    index('workflow_executions_subscriber_id_idx').on(table.subscriberId),
    index('workflow_executions_status_idx').on(table.organizationId, table.status),
  ]
);

export const workflowExecutionLogs = pgTable(
  'workflow_execution_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: 'cascade' }),
    stepId: uuid('step_id').references(() => workflowSteps.id, { onDelete: 'set null' }),
    stepType: text('step_type'),
    actionType: text('action_type'),
    status: text('status').notNull(),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').default({}),
    executedAt: timestamp('executed_at').notNull().defaultNow(),
  },
  (table) => [
    index('workflow_execution_logs_execution_id_idx').on(table.executionId),
  ]
);

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type NewWorkflowStep = typeof workflowSteps.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;
export type WorkflowExecutionLog = typeof workflowExecutionLogs.$inferSelect;
export type NewWorkflowExecutionLog = typeof workflowExecutionLogs.$inferInsert;
