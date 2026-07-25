import { NextRequest, NextResponse } from 'next/server';
import { RouterService } from '@/services/router.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await RouterService.update(DEFAULT_ORG_ID, id, body);
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
    const { id } = await params;
    const deleted = await RouterService.delete(DEFAULT_ORG_ID, id);
    return NextResponse.json({ success: true, data: deleted });
  } catch (err) {
    return handleApiError(err);
  }
}
