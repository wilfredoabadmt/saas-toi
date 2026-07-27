import { describe, it, expect, vi } from 'vitest';
import { requireSuperAdmin } from '@/lib/auth';
import { EmailService } from '@/services/email.service';
import { hasPermission } from '@/lib/rbac';

describe('Phase 4 Hardening Unit Tests', () => {
  it('hasPermission should deny non-super_admin access to /super-admin routes', () => {
    expect(hasPermission('super_admin', '/super-admin/tenants')).toBe(true);
    expect(hasPermission('admin', '/super-admin/tenants')).toBe(false);
    expect(hasPermission('billing', '/super-admin/tenants')).toBe(false);
    expect(hasPermission('technician', '/super-admin/tenants')).toBe(false);
  });

  it('EmailService should log and handle dispatch when no API key is set', async () => {
    const res = await EmailService.sendPasswordReset('user@test.com', 'https://app.com/reset?token=123');
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.messageId).toContain('msg_');
  });

  it('EmailService should support Resend API when RESEND_API_KEY is configured', async () => {
    const originalApiKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 're_mock_test_key_12345';

    const globalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'resend_msg_999' }),
    } as Response);

    const res = await EmailService.sendPasswordReset('test@resend.com', 'https://app.com/reset');
    expect(res.success).toBe(true);
    expect(res.messageId).toBe('resend_msg_999');

    globalThis.fetch = globalFetch;
    process.env.RESEND_API_KEY = originalApiKey;
  });

  it('requireSuperAdmin should throw 401/403 when session is missing or invalid role', async () => {
    await expect(requireSuperAdmin()).rejects.toThrow();
  });
});
