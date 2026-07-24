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
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockOrg]),
        }),
      }),
    },
  };
});

import { AuthService } from '@/services/auth.service';

describe('Registration API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registerOrganization should return 201 data structure and onboarding redirect', async () => {
    const res = await AuthService.registerOrganization({
      companyName: 'FiberSpeed ISP',
      adminName: 'Roberto Morales',
      email: 'admin@fiberspeed.com',
      password: 'SecretPassword123',
    });

    expect(res.organization).toBeDefined();
    expect(res.user).toBeDefined();
    expect(res.redirectUrl).toBe('/onboarding');
  });
});
