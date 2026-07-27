import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { signToken, SESSION_COOKIE_NAME } from '@/lib/session';
import { getSessionContext, requireSuperAdmin } from '@/lib/auth';
import { POST as cleanupHandler } from '@/app/api/cron/cleanup/route';

// Mock DB resolution for session testing & cleanup
const mockOrgA = '00000000-0000-0000-0000-00000000000a';
const mockOrgB = '00000000-0000-0000-0000-00000000000b';

vi.mock('@/lib/cleanup', () => ({
  purgeExpiredWebhookEvents: vi.fn().mockResolvedValue(0),
  purgeExpiredSessions: vi.fn().mockResolvedValue(0),
}));

vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>();
  return {
    ...actual,
    resolveSession: vi.fn().mockImplementation(async (cookieValue: string | undefined) => {
      if (!cookieValue) return null;
      if (cookieValue.includes('tampered')) return null;
      if (cookieValue.includes('super_admin_session')) {
        return {
          userId: 'usr_super',
          organizationId: mockOrgA,
          role: 'super_admin',
          userName: 'Super Admin',
          userEmail: 'super@saas.com',
          organizationName: 'Super Org',
          organizationStatus: 'active',
        };
      }
      if (cookieValue.includes('valid_session_a')) {
        return {
          userId: 'usr_org_a',
          organizationId: mockOrgA,
          role: 'admin',
          userName: 'Admin Org A',
          userEmail: 'admin@orga.com',
          organizationName: 'Org Alfa',
          organizationStatus: 'active',
        };
      }
      return null;
    }),
  };
});

describe('Security & Multi-Tenant Perimeter Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Requests without session cookie to API routes return 401 Unauthorized', async () => {
    const req = new NextRequest('http://localhost/api/subscribers', {
      method: 'GET',
    });

    const res = await middleware(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error).toBe('UNAUTHORIZED');
  });

  it('1b. Requests without session cookie to dashboard pages redirect to /login', async () => {
    const req = new NextRequest('http://localhost/subscribers', {
      method: 'GET',
    });

    const res = await middleware(req);
    expect([302, 307, 308]).toContain(res.status);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
  });

  it('2. Tampered or invalid session cookie causes immediate 401 rejection', async () => {
    const req = new NextRequest('http://localhost/api/subscribers', {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=tampered_invalid_token_value`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(401);
  });

  it('3. Arbitrary X-Organization-ID header is ignored for normal users (Strict Isolation)', async () => {
    const validCookieA = await signToken('valid_session_a');

    const req = new NextRequest('http://localhost/api/subscribers', {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${validCookieA}`,
        'x-organization-id': mockOrgB, // Attempting to impersonate Org B
      },
    });

    const ctx = await getSessionContext(req);
    // Verified: organizationId matches session Org A, NOT the spoofed Org B!
    expect(ctx.organizationId).toBe(mockOrgA);
    expect(ctx.organizationId).not.toBe(mockOrgB);
  });

  it('4. Non-super_admin users requesting /api/super-admin/* receive 403 Forbidden', async () => {
    const validCookieA = await signToken('valid_session_a');

    const req = new NextRequest('http://localhost/api/super-admin/tenants', {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${validCookieA}`,
      },
    });

    await expect(requireSuperAdmin(req)).rejects.toThrow('Acceso denegado');
  });

  it('4b. Super admin users requesting /api/super-admin/* pass RBAC guard', async () => {
    const superAdminCookie = await signToken('super_admin_session');

    const req = new NextRequest('http://localhost/api/super-admin/tenants', {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${superAdminCookie}`,
      },
    });

    const session = await requireSuperAdmin(req);
    expect(session.role).toBe('super_admin');
  });

  it('5. Endpoints under /api/cron/* reject requests missing valid CRON_SECRET with 401', async () => {
    const originalCronSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'test_cron_secret_key_123';

    // Petición sin header -> 401
    const reqNoHeader = new Request('http://localhost/api/cron/cleanup', { method: 'POST' });
    const resNoHeader = await cleanupHandler(reqNoHeader);
    expect(resNoHeader.status).toBe(401);

    // Petición con secret inválido -> 401
    const reqBadHeader = new Request('http://localhost/api/cron/cleanup', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong_secret' },
    });
    const resBadHeader = await cleanupHandler(reqBadHeader);
    expect(resBadHeader.status).toBe(401);

    // Petición con secret correcto -> 200 OK
    const reqValidHeader = new Request('http://localhost/api/cron/cleanup', {
      method: 'POST',
      headers: { authorization: 'Bearer test_cron_secret_key_123' },
    });
    const resValidHeader = await cleanupHandler(reqValidHeader);
    expect(resValidHeader.status).toBe(200);

    process.env.CRON_SECRET = originalCronSecret;
  });
});
