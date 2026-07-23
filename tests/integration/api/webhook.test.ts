import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-verify';
import { WebhookService } from '@/services/webhook.service';
import crypto from 'crypto';

vi.mock('@/db/client', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'event_001' }]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

describe('Webhook Integration Tests', () => {
  const secret = 'test_webhook_app_secret';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifyMetaWebhookSignature should validate correct HMAC-SHA256 signature', () => {
    const rawBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const signature = `sha256=${hmac}`;

    const isValid = verifyMetaWebhookSignature(rawBody, signature, secret);
    expect(isValid).toBe(true);
  });

  it('verifyMetaWebhookSignature should reject invalid or forged signature', () => {
    const rawBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const forgedSignature = 'sha256=invalid_hash_value_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    const isValid = verifyMetaWebhookSignature(rawBody, forgedSignature, secret);
    expect(isValid).toBe(false);
  });

  it('processWebhookPayload should deduplicate identical events', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '+56912345678',
                  phone_number_id: 'phone_123',
                },
                statuses: [
                  {
                    id: 'wamid.12345',
                    status: 'delivered',
                    timestamp: '1600000000',
                    recipient_id: 'sub_123',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await WebhookService.processWebhookPayload(payload);
    expect(res.processed).toBe(1);
    expect(res.duplicates).toBe(0);
  });
});
