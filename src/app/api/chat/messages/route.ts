import { NextRequest, NextResponse } from 'next/server';
import { ChatInboxService } from '@/services/chat-inbox.service';
import { getSessionContext } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-errors';

/**
 * GET /api/chat/messages?subscriberId=...
 * Returns chat message history for subscriber.
 */
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getSessionContext(request);
    const { searchParams } = new URL(request.url);
    const subscriberId = searchParams.get('subscriberId');

    if (!subscriberId) {
      throw new ApiError('VALIDATION_ERROR', 'subscriberId query param is required', 400);
    }

    const messages = await ChatInboxService.getMessages(organizationId, subscriberId);
    return NextResponse.json({ success: true, data: messages });
  } catch (err) {
    return handleApiError(err);
  }
}
