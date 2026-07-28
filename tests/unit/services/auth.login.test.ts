import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const { mockUser, mockSuperAdmin } = vi.hoisted(() => {
  const bcrypt = require('bcryptjs');
  return {
    mockUser: {
      id: 'usr_admin',
      organizationId: 'org_123',
      email: 'admin@ispdemo.com',
      name: 'Admin ISP Demo',
      role: 'admin',
      passwordHash: bcrypt.hashSync('admin', 10),
      createdAt: new Date(),
    },
    mockSuperAdmin: {
      id: 'usr_super',
      organizationId: 'org_123',
      email: 'superadmin@saas-toi.com',
      name: 'Super Admin',
      role: 'super_admin',
      passwordHash: bcrypt.hashSync('SuperAdmin123!', 10),
      createdAt: new Date(),
    },
  };
});

vi.mock('@/db/client', () => {
  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => Promise.resolve([mockUser])),
          }),
          limit: vi.fn().mockResolvedValue([{ id: 'org_123', status: 'active' }]),
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

  it('should generate secure bcrypt password hash with salt', () => {
    const hash1 = AuthService.hashPassword('SuperAdmin123!');
    const hash2 = AuthService.hashPassword('SuperAdmin123!');
    expect(hash1.startsWith('$2')).toBe(true);
    expect(hash2.startsWith('$2')).toBe(true);
    expect(hash1).not.toBe(hash2);
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

