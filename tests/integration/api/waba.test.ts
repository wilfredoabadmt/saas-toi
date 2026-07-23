import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import { WabaService } from '@/services/waba.service';
import { WhatsAppClient } from '@/lib/whatsapp/client';

// Mock DB and WhatsAppClient for WABA API integration testing
vi.mock('@/lib/whatsapp/client', () => ({
  WhatsAppClient: {
    exchangeCodeForToken: vi.fn(),
    subscribeAppToWaba: vi.fn(),
  },
}));

vi.mock('@/db/client', () => {
  const mockConfig = {
    organizationId: '00000000-0000-0000-0000-000000000001',
    wabaId: 'waba_123',
    phoneNumberId: 'phone_456',
    displayPhone: '+56912345678',
    encryptedToken: 'mock_encrypted_token',
    connectionStatus: 'connected',
    connectedAt: new Date(),
    disconnectedAt: null,
  };

  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockConfig]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockConfig]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockConfig, connectionStatus: 'disconnected' }]),
          }),
        }),
      }),
    },
  };
});

describe('WABA API Integration Tests', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getStatus should return connection status without exposing encryptedToken', async () => {
    const status = await WabaService.getStatus(orgId);

    expect(status.isConnected).toBe(true);
    expect(status.displayPhone).toBe('+56912345678');
    expect(status.wabaId).toBe('waba_123');
    // Ensure token is strictly hidden from status output
    expect((status as unknown as Record<string, unknown>).encryptedToken).toBeUndefined();
    expect((status as unknown as Record<string, unknown>).token).toBeUndefined();
  });

  it('connect should exchange code, encrypt token, and subscribe webhook', async () => {
    const mockExchange = {
      accessToken: 'EAAG_mock_access_token_123',
      wabaId: 'waba_123',
      phoneNumberId: 'phone_456',
      displayPhone: '+56912345678',
    };

    vi.mocked(WhatsAppClient.exchangeCodeForToken).mockResolvedValue(mockExchange);
    vi.mocked(WhatsAppClient.subscribeAppToWaba).mockResolvedValue({ success: true });

    const result = await WabaService.connect(orgId, 'mock_auth_code');

    expect(result.isConnected).toBe(true);
    expect(result.displayPhone).toBe('+56912345678');
    expect(WhatsAppClient.exchangeCodeForToken).toHaveBeenCalledWith('mock_auth_code');
  });

  it('disconnect should set connectionStatus to disconnected', async () => {
    const result = await WabaService.disconnect(orgId);

    expect(result.isConnected).toBe(false);
    expect(result.connectionStatus).toBe('disconnected');
  });
});
