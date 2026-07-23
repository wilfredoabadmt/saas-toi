import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { MessagingService } from '@/services/messaging.service';
import { handleApiError } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    const url = new URL(request.url);
    const subscriberId = url.searchParams.get('subscriberId') || undefined;

    const result = await MessagingService.listLogs({
      organizationId: session.organizationId,
      subscriberId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
