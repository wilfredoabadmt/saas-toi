import { describe, it, expect, vi } from 'vitest';
import { assertTenantScope, MissingTenantContextError } from '@/lib/tenant';
import { SubscriberService } from '@/services/subscriber.service';
import { WabaService } from '@/services/waba.service';
import { MessagingService } from '@/services/messaging.service';
import { PaymentProofService } from '@/services/payment-proof.service';

vi.mock('@/db/client', () => ({
  ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

describe('Tenant Isolation Verification (Principle I)', () => {
  it('assertTenantScope should throw MissingTenantContextError if organizationId is missing or empty', () => {
    expect(() => assertTenantScope('')).toThrow(MissingTenantContextError);
    expect(() => assertTenantScope('   ')).toThrow(MissingTenantContextError);
    expect(() => assertTenantScope(undefined as unknown as string)).toThrow(MissingTenantContextError);
  });

  it('assertTenantScope should return valid tenant UUID when present', () => {
    const validOrgId = '00000000-0000-0000-0000-000000000001';
    expect(assertTenantScope(validOrgId)).toBe(validOrgId);
  });

  it('SubscriberService methods must strictly enforce organizationId parameter', async () => {
    await expect(SubscriberService.list({ organizationId: '' })).rejects.toThrow(MissingTenantContextError);
    await expect(SubscriberService.getById('', 'sub-1')).rejects.toThrow(MissingTenantContextError);
    await expect(SubscriberService.softDelete('', 'sub-1')).rejects.toThrow(MissingTenantContextError);
  });

  it('WabaService methods must strictly enforce organizationId parameter', async () => {
    await expect(WabaService.getStatus('')).rejects.toThrow(MissingTenantContextError);
    await expect(WabaService.disconnect('')).rejects.toThrow(MissingTenantContextError);
    await expect(WabaService.getDecryptedTokenInternal('')).rejects.toThrow(MissingTenantContextError);
  });

  it('MessagingService methods must strictly enforce organizationId parameter', async () => {
    await expect(MessagingService.listLogs({ organizationId: '' })).rejects.toThrow(MissingTenantContextError);
    await expect(MessagingService.sendReminderTemplates({ organizationId: '', subscriberIds: ['sub-1'] })).rejects.toThrow(MissingTenantContextError);
  });

  it('PaymentProofService methods must strictly enforce organizationId parameter', async () => {
    await expect(PaymentProofService.listBySubscriber('', 'sub-1')).rejects.toThrow(MissingTenantContextError);
    await expect(PaymentProofService.reviewProof('', 'proof-1', 'approved')).rejects.toThrow(MissingTenantContextError);
  });
});
