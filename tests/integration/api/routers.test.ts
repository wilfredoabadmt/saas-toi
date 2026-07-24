import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRouter } = vi.hoisted(() => ({
  mockRouter: {
    id: 'router_001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    name: 'MikroTik CCR2004',
    host: '192.168.88.1',
    apiPort: 443,
    username: 'admin',
    encryptedPassword: 'mock_encrypted_password',
    iv: '0123456789abcdef01234567',
    authTag: '0123456789abcdef0123456789abcdef',
    isActive: true,
    createdAt: new Date(),
  },
}));

vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn().mockReturnValue('0123456789abcdef01234567:0123456789abcdef0123456789abcdef:mock_encrypted_password'),
  decrypt: vi.fn().mockReturnValue('mock_plain_password'),
}));

vi.mock('@/lib/mikrotik/client', () => ({
  MikroTikClient: {
    testConnection: vi.fn().mockResolvedValue({
      status: 200,
      command: 'GET https://192.168.88.1:443/rest/system/resource',
      responseBody: '{"uptime":"10d"}',
      success: true,
    }),
  },
}));

vi.mock('@/db/client', () => {
  const whereMock = vi.fn().mockImplementation(() => {
    const promise = Promise.resolve([mockRouter]);
    return Object.assign(promise, {
      limit: vi.fn().mockResolvedValue([mockRouter]),
      orderBy: vi.fn().mockResolvedValue([mockRouter]),
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
          returning: vi.fn().mockResolvedValue([mockRouter]),
        }),
      }),
    },
  };
});

import { RouterService } from '@/services/router.service';

describe('Routers API Integration Tests', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list should return configured routers scoped by tenant', async () => {
    const list = await RouterService.list(orgId);
    expect(list).toBeDefined();
    expect(list.length).toBe(1);
    expect(list[0]?.name).toBe('MikroTik CCR2004');
  });

  it('testConnection should return 200 OK result', async () => {
    const res = await RouterService.testConnection(orgId, 'router_001');
    expect(res.status).toBe(200);
    expect(res.success).toBe(true);
  });
});
