import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUser } = vi.hoisted(() => ({
  mockUser: {
    id: 'usr_123',
    email: 'user@isp.com',
    name: 'Juan Pérez',
    passwordHash: 'old_hash',
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
            limit: vi.fn().mockResolvedValue([mockUser]),
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

describe('Auth Password Reset Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requestReset should handle email recovery requests gracefully', async () => {
    const res = await PasswordResetService.requestReset('user@isp.com');
    expect(res.success).toBe(true);
  });
});
