import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/services/ticket.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/tickets
 * Lists tickets for current tenant with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const assignedTechnician = searchParams.get('assignedTechnician') || undefined;

    const ticketList = await TicketService.list(DEFAULT_ORG_ID, {
      status,
      priority,
      assignedTechnician,
    });

    return NextResponse.json({ success: true, data: ticketList });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/tickets
 * Creates a new support ticket.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriberId, category, priority, description, assignedTechnician, internalNotes } = body;

    if (!subscriberId || !description) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Abonado y descripción son requeridos' }, { status: 400 });
    }

    const created = await TicketService.create(DEFAULT_ORG_ID, {
      subscriberId,
      category: category || 'no_service',
      priority: priority || 'medium',
      description,
      assignedTechnician,
      internalNotes,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
