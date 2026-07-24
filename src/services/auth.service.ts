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
}
