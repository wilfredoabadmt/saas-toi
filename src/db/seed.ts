import { organizations } from './schema/organizations';
import { users } from './schema/users';
import { servicePlans } from './schema/service-plans';
import { subscribers } from './schema/subscribers';
import { saasPlans } from './schema/saas-plans';
import { hashPassword } from '../lib/password';
import { eq } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedDefaults(dbInstance?: any) {
  const db = dbInstance || (await import('./client')).db;
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const defaultUserId = '00000000-0000-0000-0000-000000000002';
  const defaultPlanId = '00000000-0000-0000-0000-000000000010';
  const superAdminUserId = '00000000-0000-0000-0000-000000000099';

  // Seed Default Organization
  await db
    .insert(organizations)
    .values({
      id: defaultOrgId,
      name: 'ISP Demo Internet',
      slug: 'isp-demo',
      status: 'active',
    })
    .onConflictDoNothing();

  // Seed Default SaaS Plans (required for subscriptions)
  await db
    .insert(saasPlans)
    .values([
      {
        name: 'Starter',
        slug: 'starter',
        maxSubscribers: 300,
        maxRouters: 1,
        priceMonthlyUSD: '49.00',
      },
      {
        name: 'Pro',
        slug: 'pro',
        maxSubscribers: 1500,
        maxRouters: 5,
        priceMonthlyUSD: '99.00',
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        maxSubscribers: 999999,
        maxRouters: 999999,
        priceMonthlyUSD: '199.00',
      },
    ])
    .onConflictDoNothing();

  // Update every pre-existing demo account by email. Older deployments used
  // generated IDs and different passwords, so an ID-only upsert can leave the
  // account selected at login with stale credentials.
  const seedDemoUser = async (
    id: string,
    email: string,
    name: string,
    role: 'admin' | 'super_admin',
    password: string
  ) => {
    const passwordHash = hashPassword(password);
    const updated = await db
      .update(users)
      .set({ name, role, passwordHash, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning({ id: users.id });

    if (updated.length === 0) {
      await db.insert(users).values({
        id,
        organizationId: defaultOrgId,
        email,
        name,
        role,
        passwordHash,
      });
    }
  };

  await seedDemoUser(defaultUserId, 'admin@ispdemo.com', 'Admin ISP Demo', 'admin', 'Admin123!');
  await seedDemoUser(superAdminUserId, 'superadmin@saas-toi.com', 'Super Admin SaaS', 'super_admin', 'SuperAdmin123!');

  // Seed Sample Service Plan with fixed ID
  await db
    .insert(servicePlans)
    .values({
      id: defaultPlanId,
      organizationId: defaultOrgId,
      name: 'Fibra 100 Mbps',
      price: '25000.00',
      speedDown: '100 Mbps',
      speedUp: '50 Mbps',
      isActive: true,
    })
    .onConflictDoNothing();

  // Seed Sample Subscribers for Demo Testing with fixed IDs
  await db
    .insert(subscribers)
    .values([
      {
        id: '00000000-0000-0000-0000-000000000101',
        organizationId: defaultOrgId,
        name: 'Carlos Mendoza',
        phone: '+56912345678',
        email: 'carlos.mendoza@gmail.com',
        servicePlanId: defaultPlanId,
        monthlyAmount: '25000.00',
        dueDate: '2026-07-28',
        paymentStatus: 'current',
        status: 'active',
      },
      {
        id: '00000000-0000-0000-0000-000000000102',
        organizationId: defaultOrgId,
        name: 'María Fernanda Torres',
        phone: '+56987654321',
        email: 'maria.torres@outlook.com',
        servicePlanId: defaultPlanId,
        monthlyAmount: '32000.00',
        dueDate: '2026-07-25',
        paymentStatus: 'due_soon',
        status: 'active',
      },
      {
        id: '00000000-0000-0000-0000-000000000103',
        organizationId: defaultOrgId,
        name: 'Alejandro Silva',
        phone: '+56955512345',
        email: 'a.silva@yahoo.com',
        servicePlanId: defaultPlanId,
        monthlyAmount: '19000.00',
        dueDate: '2026-07-15',
        paymentStatus: 'overdue',
        status: 'active',
      },
      {
        id: '00000000-0000-0000-0000-000000000104',
        organizationId: defaultOrgId,
        name: 'Valentina Rojas',
        phone: '+56944488811',
        email: 'valentina.rojas@gmail.com',
        servicePlanId: defaultPlanId,
        monthlyAmount: '45000.00',
        dueDate: '2026-07-10',
        paymentStatus: 'overdue',
        status: 'active',
      },
      {
        id: '00000000-0000-0000-0000-000000000105',
        organizationId: defaultOrgId,
        name: 'Roberto Gómez',
        phone: '+56933322110',
        email: 'roberto.gomez@gmail.com',
        servicePlanId: defaultPlanId,
        monthlyAmount: '25000.00',
        dueDate: '2026-07-30',
        paymentStatus: 'current',
        status: 'active',
      },
    ])
    .onConflictDoNothing();

  return { defaultOrgId, defaultUserId };
}
