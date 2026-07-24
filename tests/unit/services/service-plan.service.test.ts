import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServicePlanService } from '@/services/service-plan.service';

vi.mock('@/db/client', () => {
  const planData = {
    id: 'plan_001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    name: 'Fibra 100 Mbps',
    price: '25000.00',
    speedDown: '100 Mbps',
    speedUp: '50 Mbps',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve([planData]);
            return Object.assign(promise, {
              limit: vi.fn().mockResolvedValue([planData]),
              orderBy: vi.fn().mockResolvedValue([planData]),
            });
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([planData]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...planData, isActive: false }]),
          }),
        }),
      }),
    },
  };
});

describe('ServicePlanService Unit Tests', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list should return service plans scoped by tenant', async () => {
    const plans = await ServicePlanService.list(orgId);
    expect(plans.length).toBe(1);
    expect(plans[0]?.name).toBe('Fibra 100 Mbps');
  });

  it('create should insert new plan with organizationId', async () => {
    const created = await ServicePlanService.create(orgId, {
      name: 'Fibra 200 Mbps',
      price: '30000.00',
      speedDown: '200 Mbps',
      speedUp: '100 Mbps',
    });

    expect(created.name).toBe('Fibra 100 Mbps');
  });

  it('toggleStatus should update isActive status', async () => {
    const updated = await ServicePlanService.toggleStatus(orgId, 'plan_001', false);
    expect(updated?.isActive).toBe(false);
  });
});
