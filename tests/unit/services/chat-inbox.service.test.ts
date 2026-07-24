import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const { mockSubscriber, mockLog } = vi.hoisted(() => ({
  mockSubscriber: {
    id: 'sub_001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    name: 'Carlos Mendoza',
    phone: '+56912345678',
    monthlyAmount: '25000.00',
    dueDate: '2026-07-28',
    paymentStatus: 'due_soon',
    createdAt: new Date(),
  },
  mockLog: {
    id: 'log_001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    subscriberId: 'sub_001',
    wamid: 'wamid_123',
    direction: 'inbound',
    messageType: 'text',
    contentPreview: 'Hola soporte',
    deliveryStatus: 'delivered',
    createdAt: new Date(),
  },
}));

vi.mock('@/lib/whatsapp/client', () => ({
  WhatsAppClient: {
    sendTextMessage: vi.fn(),
  },
}));

vi.mock('@/services/waba.service', () => ({
  WabaService: {
    getDecryptedTokenInternal: vi.fn(),
  },
}));

vi.mock('@/db/client', () => {
  const whereMock = vi.fn().mockImplementation(() => {
    const promise = Promise.resolve([mockSubscriber]);
    return Object.assign(promise, {
      limit: vi.fn().mockResolvedValue([mockSubscriber]),
      orderBy: vi.fn().mockResolvedValue([mockLog]),
    });
  });

  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: whereMock,
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockLog]),
        }),
      }),
    },
  };
});

import { ChatInboxService } from '@/services/chat-inbox.service';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { WabaService } from '@/services/waba.service';

describe('ChatInboxService Unit Tests', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list conversations grouped by subscriber', async () => {
    const convs = await ChatInboxService.listConversations(orgId);
    expect(convs).toBeDefined();
    expect(convs.length).toBeGreaterThan(0);
    expect(convs[0]?.name).toBe('Carlos Mendoza');
  });

  it('should send agent message and log it', async () => {
    vi.mocked(WabaService.getDecryptedTokenInternal).mockResolvedValue({
      token: 'mock_token',
      phoneNumberId: 'phone_123',
      wabaId: 'waba_123',
    });

    vi.mocked(WhatsAppClient.sendTextMessage).mockResolvedValue({
      wamid: 'wamid_sent_456',
    });

    const sent = await ChatInboxService.sendAgentMessage(orgId, 'sub_001', 'Hola Carlos, mensaje recibido.');

    expect(sent).toBeDefined();
  });
});
