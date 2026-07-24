import { NextRequest, NextResponse } from 'next/server';
import { RouterService } from '@/services/router.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * POST /api/routers/[id]/test
 * Tests connectivity to MikroTik router.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await RouterService.testConnection(DEFAULT_ORG_ID, id);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}
