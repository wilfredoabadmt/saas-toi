import { db } from '@/db/client';
import { workflows, workflowSteps, workflowExecutions, workflowExecutionLogs } from '@/db/schema/workflows';
import { subscribers } from '@/db/schema/subscribers';
import { assertTenantScope } from '@/lib/tenant';
import { ApiError } from '@/lib/api-errors';
import { eq, and, desc, count } from 'drizzle-orm';

export type TriggerType =
  | 'new_subscriber'
  | 'payment_registered'
  | 'payment_overdue'
  | 'ticket_created'
  | 'ticket_closed'
  | 'specific_date';

export type ActionType =
  | 'send_whatsapp_message'
  | 'wait'
  | 'update_field'
  | 'notify_agent'
  | 'add_tag'
  | 'remove_tag';

export interface WorkflowStepConfig {
  messageType?: 'template' | 'text';
  templateName?: string;
  messageText?: string;
  waitDuration?: number;
  waitUnit?: 'minutes' | 'hours' | 'days';
  fieldName?: string;
  fieldValue?: string;
  agentPhone?: string;
  tagName?: string;
}

export interface CreateWorkflowParams {
  organizationId: string;
  name: string;
  description?: string;
  triggerType: TriggerType;
  triggerConfig?: Record<string, unknown>;
  steps: Array<{
    stepType: 'trigger' | 'action' | 'condition' | 'delay';
    actionType?: ActionType;
    config?: WorkflowStepConfig;
    trueStepId?: string;
    falseStepId?: string;
  }>;
}

export interface WorkflowListResult {
  workflows: Array<{
    id: string;
    name: string;
    description: string | null;
    triggerType: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    stepCount: number;
    executionCount: number;
  }>;
  total: number;
}

export class WorkflowService {
  /**
   * Creates a new workflow with steps
   */
  static async createWorkflow(params: CreateWorkflowParams) {
    const orgId = assertTenantScope(params.organizationId);

    const [workflow] = await db
      .insert(workflows)
      .values({
        organizationId: orgId,
        name: params.name,
        description: params.description,
        triggerType: params.triggerType,
        triggerConfig: params.triggerConfig || {},
        status: 'draft',
      })
      .returning();

    if (!workflow) {
      throw new ApiError('INTERNAL_ERROR', 'Failed to create workflow', 500);
    }

    const createdSteps = [];
    for (let i = 0; i < params.steps.length; i++) {
      const step = params.steps[i]!;
      const [createdStep] = await db
        .insert(workflowSteps)
        .values({
          workflowId: workflow.id,
          stepOrder: i + 1,
          stepType: step.stepType,
          actionType: step.actionType || null,
          config: step.config || {},
          trueStepId: step.trueStepId || null,
          falseStepId: step.falseStepId || null,
        })
        .returning();
      createdSteps.push(createdStep);
    }

    return { workflow, steps: createdSteps };
  }

  /**
   * Lists all workflows for an organization
   */
  static async listWorkflows(organizationId: string): Promise<WorkflowListResult> {
    const orgId = assertTenantScope(organizationId);

    const workflowList = await db
      .select()
      .from(workflows)
      .where(eq(workflows.organizationId, orgId))
      .orderBy(desc(workflows.createdAt));

    const result = [];
    for (const wf of workflowList) {
      const [stepCount] = await db
        .select({ value: count() })
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, wf.id));

      const [execCount] = await db
        .select({ value: count() })
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, wf.id));

      result.push({
        ...wf,
        stepCount: stepCount?.value || 0,
        executionCount: execCount?.value || 0,
      });
    }

    return { workflows: result, total: result.length };
  }

  /**
   * Gets a single workflow with its steps
   */
  static async getWorkflow(organizationId: string, workflowId: string) {
    const orgId = assertTenantScope(organizationId);

    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.organizationId, orgId)));

    if (!workflow) {
      throw new ApiError('NOT_FOUND', 'Workflow not found', 404);
    }

    const steps = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, workflowId))
      .orderBy(workflowSteps.stepOrder);

    return { workflow, steps };
  }

  /**
   * Updates workflow status (active/draft/paused)
   */
  static async updateWorkflowStatus(organizationId: string, workflowId: string, status: string) {
    const orgId = assertTenantScope(organizationId);

    const [updated] = await db
      .update(workflows)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(workflows.id, workflowId), eq(workflows.organizationId, orgId)))
      .returning();

    if (!updated) {
      throw new ApiError('NOT_FOUND', 'Workflow not found', 404);
    }

    return updated;
  }

  /**
   * Deletes a workflow and its steps
   */
  static async deleteWorkflow(organizationId: string, workflowId: string) {
    const orgId = assertTenantScope(organizationId);

    const [deleted] = await db
      .delete(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.organizationId, orgId)))
      .returning();

    if (!deleted) {
      throw new ApiError('NOT_FOUND', 'Workflow not found', 404);
    }

    return deleted;
  }

  /**
   * Triggers a workflow for a specific subscriber
   */
  static async triggerWorkflow(organizationId: string, workflowId: string, subscriberId: string) {
    const orgId = assertTenantScope(organizationId);

    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.organizationId, orgId), eq(workflows.status, 'active')));

    if (!workflow) {
      throw new ApiError('NOT_FOUND', 'Workflow not found or not active', 404);
    }

    const steps = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, workflowId))
      .orderBy(workflowSteps.stepOrder);

    if (steps.length === 0) {
      throw new ApiError('VALIDATION_ERROR', 'Workflow has no steps', 400);
    }

    const firstStep = steps[0];
    if (!firstStep) {
      throw new ApiError('INTERNAL_ERROR', 'Failed to get first step', 500);
    }

    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        workflowId,
        subscriberId,
        organizationId: orgId,
        currentStepId: firstStep.id,
        status: 'running',
        iterationCount: 0,
      })
      .returning();

    if (!execution) {
      throw new ApiError('INTERNAL_ERROR', 'Failed to create workflow execution', 500);
    }

    return execution;
  }

  /**
   * Gets execution logs for a workflow
   */
  static async getWorkflowLogs(
    organizationId: string,
    workflowId: string,
    filters?: { status?: string; limit?: number; offset?: number }
  ) {
    const orgId = assertTenantScope(organizationId);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const whereConditions = [
      eq(workflowExecutions.organizationId, orgId),
      eq(workflowExecutions.workflowId, workflowId),
    ];

    if (filters?.status) {
      whereConditions.push(eq(workflowExecutions.status, filters.status));
    }

    const executions = await db
      .select()
      .from(workflowExecutions)
      .where(and(...whereConditions))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db
      .select({ value: count() })
      .from(workflowExecutions)
      .where(and(...whereConditions));

    return {
      executions,
      total: totalCount?.value || 0,
      limit,
      offset,
    };
  }

  /**
   * Gets detailed logs for a specific execution
   */
  static async getExecutionLogs(executionId: string) {
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId));

    if (!execution) {
      throw new ApiError('NOT_FOUND', 'Execution not found', 404);
    }

    const logs = await db
      .select()
      .from(workflowExecutionLogs)
      .where(eq(workflowExecutionLogs.executionId, executionId))
      .orderBy(workflowExecutionLogs.executedAt);

    return { execution, logs };
  }

  /**
   * Executes a workflow step (internal engine)
   */
  static async executeStep(executionId: string, stepId: string) {
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId));

    if (!execution) {
      throw new ApiError('NOT_FOUND', 'Execution not found', 404);
    }

    if (execution.iterationCount >= 10) {
      await db
        .update(workflowExecutions)
        .set({ status: 'failed', errorMessage: 'Maximum iterations (10) reached', completedAt: new Date() })
        .where(eq(workflowExecutions.id, executionId));
      throw new ApiError('VALIDATION_ERROR', 'Maximum workflow iterations reached', 400);
    }

    const [step] = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.id, stepId));

    if (!step) {
      throw new ApiError('NOT_FOUND', 'Step not found', 404);
    }

    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, execution.subscriberId));

    if (subscriber?.optedOutWhatsapp && step.actionType === 'send_whatsapp_message') {
      await db.insert(workflowExecutionLogs).values({
        executionId,
        stepId,
        stepType: step.stepType,
        actionType: step.actionType,
        status: 'skipped',
        errorMessage: 'Subscriber has opt-out active',
        metadata: { subscriberPhone: subscriber.phone },
      });

      const nextStepId = step.nextStepId || step.trueStepId || step.falseStepId;
      if (nextStepId) {
        await db
          .update(workflowExecutions)
          .set({ currentStepId: nextStepId, iterationCount: execution.iterationCount + 1 })
          .where(eq(workflowExecutions.id, executionId));
        return { nextStepId, skipped: true };
      } else {
        await db
          .update(workflowExecutions)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(workflowExecutions.id, executionId));
        return { completed: true, skipped: true };
      }
    }

    await db.insert(workflowExecutionLogs).values({
      executionId,
      stepId,
      stepType: step.stepType,
      actionType: step.actionType,
      status: 'success',
      metadata: { stepConfig: step.config },
    });

    const nextStepId = step.nextStepId || step.trueStepId || step.falseStepId;
    if (nextStepId) {
      await db
        .update(workflowExecutions)
        .set({ currentStepId: nextStepId, iterationCount: execution.iterationCount + 1 })
        .where(eq(workflowExecutions.id, executionId));
      return { nextStepId };
    } else {
      await db
        .update(workflowExecutions)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(workflowExecutions.id, executionId));
      return { completed: true };
    }
  }
}
