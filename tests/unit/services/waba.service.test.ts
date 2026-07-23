import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WabaService } from '@/services/waba.service';
import { MissingTenantContextError } from '@/lib/tenant';

process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('WabaService Unit Tests', () => {
  it('should enforce tenant scope on all methods', async () => {
    await expect(WabaService.getStatus('')).rejects.toThrow(MissingTenantContextError);
    await expect(WabaService.disconnect('')).rejects.toThrow(MissingTenantContextError);
    await expect(WabaService.getDecryptedTokenInternal('')).rejects.toThrow(MissingTenantContextError);
  });
});
