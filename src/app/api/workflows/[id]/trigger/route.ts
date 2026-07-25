import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/services/workflow.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * POST /api/workflows/[id]/trigger
 * Triggers a workflow for a specific subscriber.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { subscriberId } = body;

    if (!subscriberId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'subscriberId es requerido' },
        { status: 400 }
      );
    }

    const execution = await WorkflowService.triggerWorkflow(DEFAULT_ORG_ID, id, subscriberId);
    return NextResponse.json({ success: true, data: execution }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
