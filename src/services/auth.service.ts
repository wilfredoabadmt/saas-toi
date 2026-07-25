import { db, ensureMigrationsRun } from '@/db/client';
import { organizations } from '@/db/schema/organizations';
import { users } from '@/db/schema/users';
import { ApiError } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export class AuthService {
  /**
   * Hashes user password with SHA-256 for secure storage.
   */
  static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Registers a new Tenant organization and Admin user.
   */
  static async registerOrganization(input: {
    companyName: string;
    adminName: string;
    email: string;
    password: string;
  }) {
    await ensureMigrationsRun();

    const normalizedEmail = input.email.trim().toLowerCase();
    const slug = input.companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `org-${Date.now()}`;

    // Check if user email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      throw new ApiError('DUPLICATE', 'Ya existe un usuario registrado con ese email', 409);
    }

    // 1. Create Organization
    const [org] = await db
      .insert(organizations)
      .values({
        name: input.companyName.trim(),
        slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
      })
      .returning();

    if (!org) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo instanciar la organización', 500);
    }

    // 2. Create Admin User
    const [adminUser] = await db
      .insert(users)
      .values({
        organizationId: org.id,
        email: normalizedEmail,
        name: input.adminName.trim(),
        role: 'admin',
        passwordHash: this.hashPassword(input.password),
      })
      .returning();

    if (!adminUser) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo crear el usuario administrador', 500);
    }

    return {
      organization: org,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
      redirectUrl: '/onboarding',
    };
  }

  /**
   * Authenticates a user (Super Admin or ISP Admin/Operator/Technician).
   */
  static async login(input: { email: string; password: string }) {
    await ensureMigrationsRun();

    const normalizedEmail = input.email.trim().toLowerCase();
    const hash = this.hashPassword(input.password);

    // 1. Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      throw new ApiError('UNAUTHORIZED', 'Credenciales inválidas. Correo o contraseña incorrectos.', 401);
    }

    // 2. Validate password hash
    if (user.passwordHash !== hash) {
      throw new ApiError('UNAUTHORIZED', 'Credenciales inválidas. Correo o contraseña incorrectos.', 401);
    }

    // 3. Determine redirect URL based on role
    const redirectUrl = user.role === 'super_admin' ? '/super-admin/tenants' : '/subscribers';

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      redirectUrl,
    };
  }

  /**
   * Creates or promotes a Super Admin account.
   */
  static async createSuperAdmin(input: {
    email: string;
    name: string;
    password: string;
    organizationId?: string;
  }) {
    await ensureMigrationsRun();

    const normalizedEmail = input.email.trim().toLowerCase();
    const defaultOrgId = '00000000-0000-0000-0000-000000000001';

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      // Promote existing user to super_admin
      const [updated] = await db
        .update(users)
        .set({
          role: 'super_admin',
          passwordHash: this.hashPassword(input.password),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();

      if (!updated) {
        throw new ApiError('INTERNAL_ERROR', 'No se pudo actualizar el super usuario', 500);
      }

      return updated;
    }

    // Create new super_admin user
    const [created] = await db
      .insert(users)
      .values({
        organizationId: input.organizationId || defaultOrgId,
        name: input.name.trim(),
        email: normalizedEmail,
        role: 'super_admin',
        passwordHash: this.hashPassword(input.password),
      })
      .returning();

    if (!created) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo crear el super usuario', 500);
    }

    return created;
  }
}
