import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/services/ticket.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * PATCH /api/tickets/[id]
 * Updates ticket status, technician assignment, or notes.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, priority, assignedTechnician, internalNotes } = body;

    const updated = await TicketService.update(DEFAULT_ORG_ID, id, {
      status,
      priority,
      assignedTechnician,
      internalNotes,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
