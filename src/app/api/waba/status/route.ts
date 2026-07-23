import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { WabaService } from '@/services/waba.service';
import { handleApiError } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    const status = await WabaService.getStatus(session.organizationId);

    return NextResponse.json({ data: status });
  } catch (error) {
    return handleApiError(error);
  }
}
