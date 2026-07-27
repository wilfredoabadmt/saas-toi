import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/services/workflow.service';
import { handleApiError } from '@/lib/api-errors';
import { getSessionContext } from '@/lib/auth';

/**
 * GET /api/workflows
 * Lists workflows for current tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getSessionContext(request);
    const result = await WorkflowService.listWorkflows(organizationId);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/workflows
 * Creates a new workflow with steps.
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getSessionContext(request);
    const body = await request.json();
    const { name, description, triggerType, triggerConfig, steps } = body;

    if (!name || !triggerType || !steps || steps.length === 0) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Nombre, tipo de trigger y al menos un paso son requeridos' },
        { status: 400 }
      );
    }

    const created = await WorkflowService.createWorkflow({
      organizationId,
      name,
      description,
      triggerType,
      triggerConfig,
      steps,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
