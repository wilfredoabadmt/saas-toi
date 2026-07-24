import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/services/team.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * PATCH /api/team/[id]
 * Updates role or status of a team member.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role, isActive } = body;

    const updated = await TeamService.updateMember(DEFAULT_ORG_ID, id, {
      role,
      isActive,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
