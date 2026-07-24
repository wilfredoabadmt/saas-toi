import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUser } = vi.hoisted(() => ({
  mockUser: {
    id: 'usr_001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    email: 'carlos.tech@isp.com',
    name: 'Carlos Técnico',
    role: 'technician',
    isActive: true,
    createdAt: new Date(),
  },
}));

vi.mock('@/db/client', () => {
  const whereMock = vi.fn().mockImplementation(() => {
    const promise = Promise.resolve([mockUser]);
    return Object.assign(promise, {
      limit: vi.fn().mockResolvedValue([mockUser]),
      orderBy: vi.fn().mockResolvedValue([mockUser]),
    });
  });

  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: whereMock,
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockUser, role: 'admin' }]),
          }),
        }),
      }),
    },
  };
});

import { TeamService } from '@/services/team.service';

describe('TeamService Unit Tests', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listMembers should return team members scoped by tenant', async () => {
    const list = await TeamService.listMembers(orgId);
    expect(list.length).toBe(1);
    expect(list[0]?.email).toBe('carlos.tech@isp.com');
  });

  it('inviteMember should insert user with specified role', async () => {
    const created = await TeamService.inviteMember(orgId, {
      email: 'carlos.tech@isp.com',
      name: 'Carlos Técnico',
      role: 'technician',
    });

    expect(created.role).toBe('technician');
  });

  it('updateMember should modify role or status', async () => {
    const updated = await TeamService.updateMember(orgId, 'usr_001', {
      role: 'admin',
    });

    expect(updated.role).toBe('admin');
  });
});
