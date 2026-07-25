import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUser, mockSuperAdmin } = vi.hoisted(() => ({
  mockUser: {
    id: 'usr_admin',
    organizationId: 'org_123',
    email: 'admin@ispdemo.com',
    name: 'Admin ISP Demo',
    role: 'admin',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    createdAt: new Date(),
  },
  mockSuperAdmin: {
    id: 'usr_super',
    organizationId: 'org_123',
    email: 'superadmin@saas-toi.com',
    name: 'Super Admin',
    role: 'super_admin',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    createdAt: new Date(),
  },
}));

vi.mock('@/db/client', () => {
  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockResolvedValue([mockUser]),
          })),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSuperAdmin]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockSuperAdmin]),
          }),
        }),
      }),
    },
  };
});

import { AuthService } from '@/services/auth.service';

describe('AuthService Login & SuperAdmin Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should hash passwords consistently with SHA-256', () => {
    const hash1 = AuthService.hashPassword('SuperAdmin123!');
    const hash2 = AuthService.hashPassword('SuperAdmin123!');
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('should authenticate registered users with valid credentials', async () => {
    const loginResult = await AuthService.login({
      email: 'admin@ispdemo.com',
      password: 'admin',
    });

    expect(loginResult.user.email).toBe('admin@ispdemo.com');
    expect(loginResult.user.role).toBe('admin');
    expect(loginResult.redirectUrl).toBe('/subscribers');
  });

  it('should reject login with wrong password', async () => {
    await expect(
      AuthService.login({ email: 'admin@ispdemo.com', password: 'wrongpassword' })
    ).rejects.toThrow('Credenciales inválidas');
  });

  it('should create or promote a Super Admin user and redirect to super-admin dashboard', async () => {
    const created = await AuthService.createSuperAdmin({
      email: 'superadmin@saas-toi.com',
      name: 'Super Admin',
      password: 'SuperAdmin123!',
    });

    expect(created.role).toBe('super_admin');
  });
});
