import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessagingService } from '@/services/messaging.service';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { WabaService } from '@/services/waba.service';

vi.mock('@/lib/whatsapp/client', () => ({
  WhatsAppClient: {
    sendTemplateMessage: vi.fn(),
  },
}));

vi.mock('@/services/waba.service', () => ({
  WabaService: {
    getDecryptedTokenInternal: vi.fn(),
    handleAuthFailure: vi.fn(),
  },
}));

vi.mock('@/db/client', () => {
  const mockSubscriber = {
    id: 'sub_001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    name: 'Juan Pérez',
    phone: '+56912345678',
    monthlyAmount: '25000.00',
    dueDate: '2026-07-28',
    paymentStatus: 'overdue',
    optedOutWhatsapp: false,
  };

  const mockLog = {
    id: 'log_001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    subscriberId: 'sub_001',
    wamid: 'wamid_test_123',
    direction: 'outbound',
    messageType: 'template',
    deliveryStatus: 'sent',
    sentAt: new Date(),
  };

  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve([mockSubscriber]);
            return Object.assign(promise, {
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([mockLog]),
                }),
              }),
              orderBy: vi.fn().mockResolvedValue([mockSubscriber]),
            });
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([mockLog]),
      }),
    },
  };
});

describe('Messaging API Integration Tests', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sendReminderTemplates should successfully process overdue subscribers', async () => {
    vi.mocked(WabaService.getDecryptedTokenInternal).mockResolvedValue({
      token: 'mock_token',
      phoneNumberId: 'phone_123',
      wabaId: 'waba_123',
    });

    vi.mocked(WhatsAppClient.sendTemplateMessage).mockResolvedValue({
      wamid: 'wamid_test_123',
    });

    const result = await MessagingService.sendReminderTemplates({
      organizationId: orgId,
      subscriberIds: ['sub_001'],
    });

    expect(result.totalRequested).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.results[0]?.wamid).toBe('wamid_test_123');
    expect(WhatsAppClient.sendTemplateMessage).toHaveBeenCalled();
  });

  it('listLogs should return message logs scoped by tenant', async () => {
    const logs = await MessagingService.listLogs({ organizationId: orgId, limit: 10 });

    expect(logs.data.length).toBeGreaterThan(0);
    expect(logs.pagination.limit).toBe(10);
  });
});
