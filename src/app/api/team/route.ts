import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/services/team.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/team
 * Lists team members for current tenant.
 */
export async function GET() {
  try {
    const members = await TeamService.listMembers(DEFAULT_ORG_ID);
    return NextResponse.json({ success: true, data: members });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/team
 * Invites a new team member with assigned role.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, role } = body;

    if (!email || !name || !role) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Email, Nombre y Rol son requeridos' }, { status: 400 });
    }

    const created = await TeamService.inviteMember(DEFAULT_ORG_ID, {
      email,
      name,
      role,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
