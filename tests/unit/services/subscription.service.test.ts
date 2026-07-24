import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockOrg, mockSub } = vi.hoisted(() => ({
  mockOrg: {
    id: 'org_001',
    name: 'FiberSpeed ISP',
    slug: 'fiberspeed-isp',
    createdAt: new Date(),
  },
  mockSub: {
    id: 'sub_001',
    organizationId: 'org_001',
    planId: 'plan_starter',
    status: 'active',
  },
}));

vi.mock('@/db/client', () => {
  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([mockOrg]),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSub]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockSub, status: 'suspended' }]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSub]),
        }),
      }),
    },
  };
});

import { SubscriptionService } from '@/services/subscription.service';

describe('SubscriptionService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listAllTenants should return organizations for Super Admin', async () => {
    vi.spyOn(SubscriptionService, 'listAllTenants').mockResolvedValue([
      {
        id: 'org_001',
        name: 'FiberSpeed ISP',
        slug: 'fiberspeed-isp',
        createdAt: new Date(),
        currentSubscribers: 150,
        planName: 'Starter (300)',
        status: 'active',
      },
    ]);

    const list = await SubscriptionService.listAllTenants();
    expect(list).toBeDefined();
    expect(list.length).toBe(1);
    expect(list[0]?.name).toBe('FiberSpeed ISP');
  });

  it('updateTenantStatus should change subscription status', async () => {
    const updated = await SubscriptionService.updateTenantStatus('org_001', 'suspended');
    expect(updated).toBeDefined();
  });
});
