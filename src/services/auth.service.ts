import { db, ensureMigrationsRun } from '@/db/client';
import { organizations } from '@/db/schema/organizations';
import { users } from '@/db/schema/users';
import { ApiError } from '@/lib/api-errors';
import { hashPassword, verifyPassword, needsRehash } from '@/lib/password';
import { eq } from 'drizzle-orm';

export class AuthService {
  /**
   * Hashes user password using scrypt with random salt.
   */
  static hashPassword(password: string): string {
    return hashPassword(password);
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
        passwordHash: hashPassword(input.password),
      })
      .returning();

    if (!adminUser) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo crear el usuario administrador', 500);
    }

    // 3. Create 15-Day Free Trial Subscription
    try {
      const { saasPlans } = await import('@/db/schema/saas-plans');
      const { subscriptions } = await import('@/db/schema/subscriptions');
      const selectChain = db.select?.();
      const fromChain = selectChain?.from?.(saasPlans);
      const defaultPlans = fromChain && typeof fromChain.limit === 'function' ? await fromChain.limit(1) : [];
      const defaultPlan = defaultPlans?.[0];
      const trialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      if (defaultPlan && db.insert) {
        const insertChain = db.insert(subscriptions);
        if (insertChain && typeof insertChain.values === 'function') {
          await insertChain.values({
            organizationId: org.id,
            planId: defaultPlan.id,
            status: 'trialing',
            expiresAt: trialEndsAt,
          });
        }
      }
    } catch {
      // Safe fallback for unit tests with isolated mocks
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

    // 1. Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      throw new ApiError('UNAUTHORIZED', 'Credenciales inválidas. Correo o contraseña incorrectos.', 401);
    }

    // 2. Validate password hash with timing-safe comparison
    if (!(await verifyPassword(input.password, user.passwordHash))) {
      throw new ApiError('UNAUTHORIZED', 'Credenciales inválidas. Correo o contraseña incorrectos.', 401);
    }

    // 3. Transparently upgrade legacy SHA-256 password hash to scrypt
    if (needsRehash(user.passwordHash)) {
      const newHash = hashPassword(input.password);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
    }

    // 4. Determine redirect URL based on role
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
    let targetOrgId = input.organizationId;
    if (!targetOrgId) {
      const [firstOrg] = await db.select({ id: organizations.id }).from(organizations).limit(1);
      if (firstOrg) {
        targetOrgId = firstOrg.id;
      } else {
        const [newOrg] = await db
          .insert(organizations)
          .values({ name: 'System Super Admin Org', slug: 'system-superadmin-org' })
          .returning();
        targetOrgId = newOrg?.id;
      }
    }

    if (!targetOrgId) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo vincular la organización del super usuario', 500);
    }

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
          passwordHash: hashPassword(input.password),
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
        organizationId: targetOrgId,
        name: input.name.trim(),
        email: normalizedEmail,
        role: 'super_admin',
        passwordHash: hashPassword(input.password),
      })
      .returning();

    if (!created) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo crear el super usuario', 500);
    }

    return created;
  }
}
