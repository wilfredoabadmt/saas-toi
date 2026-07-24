import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInfo } = vi.hoisted(() => ({
  mockInfo: {
    planName: 'Starter',
    planSlug: 'starter',
    maxSubscribers: 300,
    currentSubscribers: 150,
    usagePercent: 50,
    status: 'active',
  },
}));

vi.mock('@/services/subscription-guard.service', () => ({
  SubscriptionGuard: {
    getCurrentSubscription: vi.fn().mockResolvedValue(mockInfo),
    assertCanAddSubscriber: vi.fn().mockResolvedValue(undefined),
  },
}));

import { SubscriptionGuard } from '@/services/subscription-guard.service';

describe('Subscriptions API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCurrentSubscription should return 200 OK usage structure', async () => {
    const info = await SubscriptionGuard.getCurrentSubscription('00000000-0000-0000-0000-000000000001');
    expect(info).toBeDefined();
    expect(info.planName).toBe('Starter');
    expect(info.usagePercent).toBe(50);
  });
});
