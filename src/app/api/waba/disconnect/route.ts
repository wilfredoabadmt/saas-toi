import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { WabaService } from '@/services/waba.service';
import { handleApiError } from '@/lib/api-errors';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    const result = await WabaService.disconnect(session.organizationId);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
