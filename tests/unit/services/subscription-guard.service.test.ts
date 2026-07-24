import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@/lib/api-errors';

const { mockSubCount, mockSubRecord } = vi.hoisted(() => ({
  mockSubCount: [{ value: 250 }],
  mockSubRecord: [{
    status: 'active',
    planName: 'Starter',
    planSlug: 'starter',
    maxSubscribers: 300,
  }],
}));

vi.mock('@/db/client', () => {
  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockSubRecord),
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockSubRecord),
              }),
            }),
          }),
        }),
      }),
    },
  };
});

import { SubscriptionGuard } from '@/services/subscription-guard.service';

describe('SubscriptionGuard Unit Tests', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCurrentSubscription should return subscriber usage metrics', async () => {
    vi.spyOn(SubscriptionGuard, 'getCurrentSubscription').mockResolvedValue({
      planName: 'Starter',
      planSlug: 'starter',
      maxSubscribers: 300,
      currentSubscribers: 250,
      usagePercent: 83,
      status: 'active',
    });

    const info = await SubscriptionGuard.getCurrentSubscription(orgId);
    expect(info).toBeDefined();
    expect(info.maxSubscribers).toBe(300);
  });

  it('assertCanAddSubscriber should throw ApiError 403 when subscriber limit is exceeded', async () => {
    vi.spyOn(SubscriptionGuard, 'getCurrentSubscription').mockResolvedValue({
      planName: 'Starter',
      planSlug: 'starter',
      maxSubscribers: 300,
      currentSubscribers: 300,
      usagePercent: 100,
      status: 'active',
    });

    await expect(SubscriptionGuard.assertCanAddSubscriber(orgId, 1)).rejects.toThrow(ApiError);
  });
});
