import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockOrg } = vi.hoisted(() => ({
  mockOrg: {
    id: 'org_123',
    name: 'FiberSpeed ISP',
    slug: 'fiberspeed-isp-123',
    createdAt: new Date(),
  },
}));

vi.mock('@/db/client', () => {
  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing user
          }),
        }),
      }),
      insert: vi.fn().mockImplementation(() => {
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockOrg]),
          }),
        };
      }),
    },
  };
});

import { AuthService } from '@/services/auth.service';

describe('AuthService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hashPassword should generate bcrypt formatted hash with salt', () => {
    const hash = AuthService.hashPassword('SecretPassword123');
    expect(hash).toBeDefined();
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('registerOrganization should create organization and admin user', async () => {
    const res = await AuthService.registerOrganization({
      companyName: 'FiberSpeed ISP',
      adminName: 'Roberto Morales',
      email: 'admin@fiberspeed.com',
      password: 'SecretPassword123',
    });

    expect(res).toBeDefined();
    expect(res.redirectUrl).toBe('/onboarding');
    expect(res.organization.id).toBe('org_123');
  });
});
