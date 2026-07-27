import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/services/team.service';
import { handleApiError } from '@/lib/api-errors';
import { getSessionContext } from '@/lib/auth';

/**
 * PATCH /api/team/[id]
 * Updates role or status of a team member.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await getSessionContext(request);
    const { id } = await params;
    const body = await request.json();
    const { role, isActive } = body;

    const updated = await TeamService.updateMember(organizationId, id, {
      role,
      isActive,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await getSessionContext(request);
    const { id } = await params;
    const deleted = await TeamService.deleteMember(organizationId, id);
    return NextResponse.json({ success: true, data: deleted });
  } catch (err) {
    return handleApiError(err);
  }
}
