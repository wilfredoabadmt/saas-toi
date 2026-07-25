import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/services/workflow.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/workflows
 * Lists workflows for current tenant.
 */
export async function GET() {
  try {
    const result = await WorkflowService.listWorkflows(DEFAULT_ORG_ID);
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
    const body = await request.json();
    const { name, description, triggerType, triggerConfig, steps } = body;

    if (!name || !triggerType || !steps || steps.length === 0) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Nombre, tipo de trigger y al menos un paso son requeridos' },
        { status: 400 }
      );
    }

    const created = await WorkflowService.createWorkflow({
      organizationId: DEFAULT_ORG_ID,
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
