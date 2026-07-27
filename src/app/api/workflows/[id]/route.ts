import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/services/workflow.service';
import { handleApiError } from '@/lib/api-errors';
import { getSessionContext } from '@/lib/auth';

/**
 * GET /api/workflows/[id]
 * Gets a workflow with its steps.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await getSessionContext(request);
    const { id } = await params;
    const result = await WorkflowService.getWorkflow(organizationId, id);
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
    const { organizationId } = await getSessionContext(request);
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Estado es requerido' }, { status: 400 });
    }

    const updated = await WorkflowService.updateWorkflowStatus(organizationId, id, status);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/workflows/[id]
 * Deletes a workflow.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await getSessionContext(request);
    const { id } = await params;
    await WorkflowService.deleteWorkflow(organizationId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
