import { db } from '@/db/client';
import { processedWebhookEvents } from '@/db/schema/processed-events';
import { messageLogs } from '@/db/schema/message-logs';
import { PaymentProofService } from './payment-proof.service';
import { eq, and } from 'drizzle-orm';

export interface MetaWebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      field: string;
      value?: {
        messaging_product: string;
        metadata?: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          image?: { id: string; mime_type: string; caption?: string };
          document?: { id: string; mime_type: string; caption?: string };
          text?: { body: string };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
          errors?: Array<{ code: number; title: string }>;
        }>;
      };
    }>;
  }>;
}

export class WebhookService {
  /**
   * Main webhook payload processor with deduplication by event_id (wamid / status_id).
   */
  static async processWebhookPayload(payload: MetaWebhookPayload): Promise<{ processed: number; duplicates: number }> {
    if (payload.object !== 'whatsapp_business_account' || !payload.entry) {
      return { processed: 0, duplicates: 0 };
    }

    let processedCount = 0;
    let duplicateCount = 0;

    for (const entry of payload.entry) {
      if (!entry.changes) continue;

      for (const change of entry.changes) {
        const val = change.value;
        if (!val || !val.metadata) continue;

        const phoneNumberId = val.metadata.phone_number_id;

        // Process status updates
        if (val.statuses) {
          for (const statusObj of val.statuses) {
            const isNew = await this.recordEvent(statusObj.id, 'status');
            if (!isNew) {
              duplicateCount++;
              continue;
            }

            await this.handleStatusUpdate(statusObj);
            processedCount++;
          }
        }

        // Process incoming messages
        if (val.messages) {
          for (const msgObj of val.messages) {
            const isNew = await this.recordEvent(msgObj.id, 'message');
            if (!isNew) {
              duplicateCount++;
              continue;
            }

            await this.handleIncomingMessage(phoneNumberId, msgObj);
            processedCount++;
          }
        }
      }
    }

    return { processed: processedCount, duplicates: duplicateCount };
  }

  /**
   * Atomically records event_id in processed_webhook_events table.
   * Returns true if event is NEW (inserted), false if DUPLICATE.
   */
  private static async recordEvent(eventId: string, eventType: string): Promise<boolean> {
    try {
      const inserted = await db
        .insert(processedWebhookEvents)
        .values({
          eventId,
          eventType,
          processedAt: new Date(),
        })
        .onConflictDoNothing({ target: processedWebhookEvents.eventId })
        .returning({ id: processedWebhookEvents.id });

      return inserted.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Handles delivery status updates (sent, delivered, read, failed).
   */
  private static async handleStatusUpdate(statusObj: { id: string; status: string; errors?: Array<{ title: string }> }) {
    const failureReason = statusObj.errors?.[0]?.title || null;

    await db
      .update(messageLogs)
      .set({
        deliveryStatus: statusObj.status,
        failureReason,
        statusUpdatedAt: new Date(),
      })
      .where(eq(messageLogs.wamid, statusObj.id));
  }

  /**
   * Handles incoming subscriber messages (images, documents, text).
   */
  private static async handleIncomingMessage(
    phoneNumberId: string,
    msgObj: {
      from: string;
      id: string;
      type: string;
      image?: { id: string; caption?: string };
      document?: { id: string; caption?: string };
      text?: { body: string };
    }
  ) {
    const formattedPhone = msgObj.from.startsWith('+') ? msgObj.from : `+${msgObj.from}`;

    // 1. Process payment proofs if image/document
    if (msgObj.type === 'image' && msgObj.image) {
      await PaymentProofService.processIncomingProof({
        phoneNumberId,
        senderPhone: formattedPhone,
        wamid: msgObj.id,
        mediaId: msgObj.image.id,
        fileType: 'image',
        caption: msgObj.image.caption,
      });
    } else if (msgObj.type === 'document' && msgObj.document) {
      await PaymentProofService.processIncomingProof({
        phoneNumberId,
        senderPhone: formattedPhone,
        wamid: msgObj.id,
        mediaId: msgObj.document.id,
        fileType: 'document',
        caption: msgObj.document.caption,
      });
    }

    // 2. Fetch organization config from phoneNumberId
    const { wabaConfigs } = await import('@/db/schema/waba-configs');
    const { subscribers } = await import('@/db/schema/subscribers');
    const { chatbotConversations, chatbotMessages } = await import('@/db/schema/chatbot');
    const { maybeRunAgentTurn } = await import('@/server/ai/trigger');

    const [config] = await db
      .select()
      .from(wabaConfigs)
      .where(eq(wabaConfigs.phoneNumberId, phoneNumberId))
      .limit(1);

    if (!config) return;

    const orgId = config.organizationId;

    // 3. Find subscriber
    const [sub] = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.organizationId, orgId), eq(subscribers.phone, formattedPhone)))
      .limit(1);

    // 4. Find or create conversation
    let [conv] = await db
      .select()
      .from(chatbotConversations)
      .where(and(eq(chatbotConversations.organizationId, orgId), eq(chatbotConversations.phone, formattedPhone)))
      .limit(1);

    if (!conv) {
      const [newConv] = await db
        .insert(chatbotConversations)
        .values({
          organizationId: orgId,
          subscriberId: sub?.id || null,
          phone: formattedPhone,
          status: 'active',
          aiEnabled: true,
          lastInboundAt: new Date(),
        })
        .returning();
      conv = newConv;
    } else {
      await db
        .update(chatbotConversations)
        .set({
          subscriberId: sub?.id || conv.subscriberId,
          lastInboundAt: new Date(),
        })
        .where(eq(chatbotConversations.id, conv.id));
    }

    if (!conv) return;

    // 5. Insert incoming message to chatbotMessages
    const contentText =
      msgObj.text?.body ||
      msgObj.image?.caption ||
      msgObj.document?.caption ||
      '';

    const mediaId = msgObj.image?.id || msgObj.document?.id || undefined;

    await db.insert(chatbotMessages).values({
      conversationId: conv.id,
      role: 'user',
      content: contentText,
      metadata: {
        wamid: msgObj.id,
        type: msgObj.type,
        mediaId,
      },
    });

    // 6. Trigger Agent AI Turn
    await maybeRunAgentTurn(conv.id);
  }
}
