import { describe, it, expect, vi } from 'vitest';
import { SubscriberService } from '@/services/subscriber.service';
import { MissingTenantContextError } from '@/lib/tenant';

describe('Tenant Isolation Unit & Service Guard Tests', () => {
  it('should throw MissingTenantContextError if organizationId is empty or null', async () => {
    await expect(SubscriberService.list({ organizationId: '' })).rejects.toThrow(MissingTenantContextError);
    await expect(SubscriberService.list({ organizationId: '   ' })).rejects.toThrow(MissingTenantContextError);
  });

  it('should enforce orgId parameters on getById', async () => {
    await expect(SubscriberService.getById('', 'some-id')).rejects.toThrow(MissingTenantContextError);
  });
});
