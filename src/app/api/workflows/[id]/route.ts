import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/services/workflow.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/workflows/[id]
 * Gets a workflow with its steps.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await WorkflowService.getWorkflow(DEFAULT_ORG_ID, id);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/workflows/[id]
 * Updates workflow status.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Estado es requerido' }, { status: 400 });
    }

    const updated = await WorkflowService.updateWorkflowStatus(DEFAULT_ORG_ID, id, status);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/workflows/[id]
 * Deletes a workflow.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await WorkflowService.deleteWorkflow(DEFAULT_ORG_ID, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
