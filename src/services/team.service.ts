import { db, ensureMigrationsRun } from '@/db/client';
import { users } from '@/db/schema/users';
import { assertTenantScope } from '@/lib/tenant';
import { ApiError } from '@/lib/api-errors';
import { UserRole } from '@/lib/rbac';
import { eq, and, desc } from 'drizzle-orm';

export class TeamService {
  /**
   * Lists team members for tenant.
   */
  static async listMembers(organizationId: string) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const members = await db
      .select({
        id: users.id,
        organizationId: users.organizationId,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.organizationId, orgId))
      .orderBy(desc(users.createdAt));

    return members.map((m) => ({ ...m, role: m.role as UserRole, isActive: true }));
  }

  /**
   * Invites or creates a new team member.
   */
  static async inviteMember(
    organizationId: string,
    input: {
      email: string;
      name: string;
      role: UserRole;
    }
  ) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const [created] = await db
      .insert(users)
      .values({
        organizationId: orgId,
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        role: input.role,
        passwordHash: 'invited_user_hash',
      })
      .onConflictDoNothing({ target: users.email })
      .returning();

    if (!created) {
      throw new ApiError('DUPLICATE', 'Ya existe un usuario registrado con ese email', 409);
    }

    return { ...created, role: created.role as UserRole, isActive: true };
  }

  /**
   * Updates role or active status of a team member.
   */
  static async updateMember(
    organizationId: string,
    userId: string,
    input: Partial<{
      role: UserRole;
      isActive: boolean;
    }>
  ) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const [updated] = await db
      .update(users)
      .set({
        ...(input.role ? { role: input.role } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.organizationId, orgId)))
      .returning();

    if (!updated) {
      throw new ApiError('NOT_FOUND', 'Miembro del equipo no encontrado', 404);
    }

    return { ...updated, role: updated.role as UserRole, isActive: input.isActive ?? true };
  }
}
