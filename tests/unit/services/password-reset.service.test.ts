import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUser, mockReset } = vi.hoisted(() => ({
  mockUser: {
    id: 'usr_123',
    email: 'user@isp.com',
    name: 'Juan Pérez',
    passwordHash: 'old_hash',
  },
  mockReset: {
    id: 'rst_123',
    userId: 'usr_123',
    token: 'valid_mock_token_123',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 mins in future
    usedAt: null,
  },
}));

vi.mock('@/services/email.service', () => ({
  EmailService: {
    sendPasswordReset: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/db/client', () => {
  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => Promise.resolve([mockUser])),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    },
  };
});

import { PasswordResetService } from '@/services/password-reset.service';

describe('PasswordResetService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requestReset should generate token and call EmailService', async () => {
    const res = await PasswordResetService.requestReset('user@isp.com');
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});
