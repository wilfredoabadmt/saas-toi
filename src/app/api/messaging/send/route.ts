import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { MessagingService } from '@/services/messaging.service';
import { handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

const sendSchema = z.object({
  subscriberIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un abonado'),
  templateName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    const body = await request.json();
    const { subscriberIds, templateName } = sendSchema.parse(body);

    const result = await MessagingService.sendReminderTemplates({
      organizationId: session.organizationId,
      subscriberIds,
      templateName,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
