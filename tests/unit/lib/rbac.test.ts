import { describe, it, expect } from 'vitest';
import { hasPermission, assertRolePermission } from '@/lib/rbac';
import { ApiError } from '@/lib/api-errors';

describe('RBAC Role Matrix Unit Tests', () => {
  it('admin role should have permission for all routes', () => {
    expect(hasPermission('admin', '/subscribers')).toBe(true);
    expect(hasPermission('admin', '/settings/routers')).toBe(true);
    expect(hasPermission('admin', '/whatsapp')).toBe(true);
  });

  it('billing role should only have access to subscribers, messaging and chat', () => {
    expect(hasPermission('billing', '/subscribers')).toBe(true);
    expect(hasPermission('billing', '/messaging')).toBe(true);
    expect(hasPermission('billing', '/chat')).toBe(true);
    expect(hasPermission('billing', '/settings/routers')).toBe(false);
    expect(hasPermission('billing', '/whatsapp')).toBe(false);
  });

  it('technician role should only have access to tickets', () => {
    expect(hasPermission('technician', '/tickets')).toBe(true);
    expect(hasPermission('technician', '/subscribers')).toBe(false);
    expect(hasPermission('technician', '/settings/plans')).toBe(false);
  });

  it('assertRolePermission should throw ApiError(403) for unauthorized route', () => {
    expect(() => assertRolePermission('technician', '/settings/routers')).toThrow(ApiError);
  });
});
