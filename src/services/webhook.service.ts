import { db } from '@/db/client';
import { processedWebhookEvents } from '@/db/schema/processed-events';
import { messageLogs } from '@/db/schema/message-logs';
import { PaymentProofService } from './payment-proof.service';
import { eq } from 'drizzle-orm';

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
    }
  ) {
    if (msgObj.type === 'image' && msgObj.image) {
      await PaymentProofService.processIncomingProof({
        phoneNumberId,
        senderPhone: `+${msgObj.from}`,
        wamid: msgObj.id,
        mediaId: msgObj.image.id,
        fileType: 'image',
        caption: msgObj.image.caption,
      });
    } else if (msgObj.type === 'document' && msgObj.document) {
      await PaymentProofService.processIncomingProof({
        phoneNumberId,
        senderPhone: `+${msgObj.from}`,
        wamid: msgObj.id,
        mediaId: msgObj.document.id,
        fileType: 'document',
        caption: msgObj.document.caption,
      });
    }
  }
}
