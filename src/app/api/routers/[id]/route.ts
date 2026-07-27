import { NextRequest, NextResponse } from 'next/server';
import { RouterService } from '@/services/router.service';
import { handleApiError } from '@/lib/api-errors';
import { getSessionContext } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await getSessionContext(request);
    const { id } = await params;
    const body = await request.json();

    const updated = await RouterService.update(organizationId, id, body);
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
    const deleted = await RouterService.delete(organizationId, id);
    return NextResponse.json({ success: true, data: deleted });
  } catch (err) {
    return handleApiError(err);
  }
}
