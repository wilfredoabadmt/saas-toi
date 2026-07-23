import { describe, it, expect, vi } from 'vitest';
import { WebhookService } from '@/services/webhook.service';

vi.mock('@/db/client', () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => [{ id: 'event-1' }],
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => [{ id: 'log-1' }],
      }),
    }),
  },
}));

describe('src/services/webhook.service.ts', () => {
  it('should ignore payloads that are not whatsapp_business_account', async () => {
    const res = await WebhookService.processWebhookPayload({ object: 'page' });
    expect(res.processed).toBe(0);
  });

  it('should process status events correctly', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '123', phone_number_id: 'phone-1' },
                statuses: [
                  {
                    id: 'wamid.test_status_1',
                    status: 'delivered',
                    timestamp: '1690000000',
                    recipient_id: '5491155551234',
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
