import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { AuthService } from '@/services/auth.service';

vi.mock('@/services/auth.service', () => ({
  AuthService: {
    login: vi.fn(),
  },
}));

vi.mock('@/lib/session', () => ({
  SESSION_COOKIE_NAME: 'saas_toi_session',
  createSession: vi.fn().mockResolvedValue({
    cookieValue: 'mock_signed_cookie_token',
    expiresAt: new Date(Date.now() + 86400000),
  }),
}));

describe('Auth Login Route Robustness & Error Handling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 Bad Request when body is empty or missing email/password', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('BAD_REQUEST');
  });

  it('should log warning when SESSION_SECRET is missing', async () => {
    const originalSecret = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;

    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.mocked(AuthService.login).mockResolvedValueOnce({
      user: { id: 'usr_1', organizationId: 'org_1', name: 'User 1', email: 'u1@test.com', role: 'admin' },
      redirectUrl: '/subscribers',
    });

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'u1@test.com', password: 'Password123!' }),
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(200);
    expect(spyWarn).toHaveBeenCalledWith(expect.stringContaining('[AUTH ERROR] SESSION_SECRET is missing'));

    spyWarn.mockRestore();
    process.env.SESSION_SECRET = originalSecret;
  });

  it('should return clean 401 JSON response on invalid credentials error', async () => {
    const ApiError = (await import('@/lib/api-errors')).ApiError;
    vi.mocked(AuthService.login).mockRejectedValueOnce(
      new ApiError('UNAUTHORIZED', 'Credenciales inválidas', 401)
    );

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong@test.com', password: 'WrongPassword' }),
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error).toBe('UNAUTHORIZED');
    expect(json.message).toBe('Credenciales inválidas');
  });
});
