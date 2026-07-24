import { NextRequest, NextResponse } from 'next/server';
import { ChatInboxService } from '@/services/chat-inbox.service';
import { getSessionContext } from '@/lib/auth';
import { handleApiError } from '@/lib/api-errors';

/**
 * GET /api/chat/conversations
 * Lists active WhatsApp conversation threads for current tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getSessionContext(req);
    const conversations = await ChatInboxService.listConversations(organizationId);
    return NextResponse.json({ success: true, data: conversations });
  } catch (err) {
    return handleApiError(err);
  }
}
