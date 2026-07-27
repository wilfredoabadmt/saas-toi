import { db, ensureMigrationsRun } from '../src/db/client';
import { users } from '../src/db/schema/users';
import { organizations } from '../src/db/schema/organizations';
import { hashPassword } from '../src/lib/password';
import { eq } from 'drizzle-orm';

export async function reseedDemoUsers() {
  await ensureMigrationsRun();

  console.log('[Seed Demo Users] Seeding and updating passwords for demo accounts...');

  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const defaultUserId = '00000000-0000-0000-0000-000000000002';
  const superAdminUserId = '00000000-0000-0000-0000-000000000099';

  // Ensure default demo org exists
  await db
    .insert(organizations)
    .values({
      id: defaultOrgId,
      name: 'ISP Demo Internet',
      slug: 'isp-demo',
      status: 'active',
    })
    .onConflictDoNothing();

  // 1. Super Admin: superadmin@saas-toi.com / SuperAdmin123!
  const superAdminHash = hashPassword('SuperAdmin123!');
  const [existingSuperAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'superadmin@saas-toi.com'))
    .limit(1);

  if (existingSuperAdmin) {
    await db
      .update(users)
      .set({
        passwordHash: superAdminHash,
        role: 'super_admin',
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingSuperAdmin.id));
  } else {
    await db.insert(users).values({
      id: superAdminUserId,
      organizationId: defaultOrgId,
      email: 'superadmin@saas-toi.com',
      name: 'Super Admin SaaS',
      role: 'super_admin',
      passwordHash: superAdminHash,
    });
  }

  // 2. Admin ISP: admin@ispdemo.com / Admin123!
  const adminHash = hashPassword('Admin123!');
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@ispdemo.com'))
    .limit(1);

  if (existingAdmin) {
    await db
      .update(users)
      .set({
        passwordHash: adminHash,
        role: 'admin',
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingAdmin.id));
  } else {
    await db.insert(users).values({
      id: defaultUserId,
      organizationId: defaultOrgId,
      email: 'admin@ispdemo.com',
      name: 'Admin ISP Demo',
      role: 'admin',
      passwordHash: adminHash,
    });
  }

  console.log('[Seed Demo Users Success] Updated passwords for superadmin@saas-toi.com and admin@ispdemo.com');
}

if (require.main === module) {
  reseedDemoUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Demo Users Error]:', err);
      process.exit(1);
    });
}
