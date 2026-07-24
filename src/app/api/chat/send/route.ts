import { NextRequest, NextResponse } from 'next/server';
import { ChatInboxService } from '@/services/chat-inbox.service';
import { getSessionContext } from '@/lib/auth';
import { handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

const sendMessageSchema = z.object({
  subscriberId: z.string().uuid('ID de abonado inválido'),
  message: z.string().min(1, 'El mensaje no puede estar vacío'),
});

/**
 * POST /api/chat/send
 * Sends an agent response message to subscriber via WhatsApp Cloud API.
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getSessionContext(request);
    const body = await request.json();
    const { subscriberId, message } = sendMessageSchema.parse(body);

    const log = await ChatInboxService.sendAgentMessage(organizationId, subscriberId, message);
    return NextResponse.json({ success: true, data: log });
  } catch (err) {
    return handleApiError(err);
  }
}
