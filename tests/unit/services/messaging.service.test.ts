import { describe, it, expect } from 'vitest';
import { MessagingService } from '@/services/messaging.service';
import { MissingTenantContextError } from '@/lib/tenant';

describe('MessagingService Unit Tests', () => {
  it('should enforce tenant scope on listLogs and sendReminderTemplates', async () => {
    await expect(MessagingService.listLogs({ organizationId: '' })).rejects.toThrow(MissingTenantContextError);
    await expect(
      MessagingService.sendReminderTemplates({ organizationId: '', subscriberIds: ['sub-1'] })
    ).rejects.toThrow(MissingTenantContextError);
  });
});
