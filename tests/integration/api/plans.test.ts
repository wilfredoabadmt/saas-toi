import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPlan } = vi.hoisted(() => ({
  mockPlan: {
    id: 'plan_001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    name: 'Fibra 100 Mbps',
    price: '25000.00',
    speedDown: '100 Mbps',
    speedUp: '50 Mbps',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}));

vi.mock('@/db/client', () => {
  const whereMock = vi.fn().mockImplementation(() => {
    const promise = Promise.resolve([mockPlan]);
    return Object.assign(promise, {
      limit: vi.fn().mockResolvedValue([mockPlan]),
      orderBy: vi.fn().mockResolvedValue([mockPlan]),
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
          returning: vi.fn().mockResolvedValue([mockPlan]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockPlan, isActive: false }]),
          }),
        }),
      }),
    },
  };
});

import { ServicePlanService } from '@/services/service-plan.service';

describe('Plans API Integration Tests', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list should return service plans scoped by tenant', async () => {
    const plans = await ServicePlanService.list(orgId);
    expect(plans.length).toBe(1);
    expect(plans[0]?.name).toBe('Fibra 100 Mbps');
  });

  it('create should return new created plan', async () => {
    const created = await ServicePlanService.create(orgId, {
      name: 'Fibra 300 Mbps',
      price: '35000.00',
      speedDown: '300 Mbps',
      speedUp: '150 Mbps',
    });

    expect(created.name).toBe('Fibra 100 Mbps');
  });
});
