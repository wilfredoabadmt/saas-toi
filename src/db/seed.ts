import { eq } from 'drizzle-orm';
import { organizations } from './schema/organizations';
import { users } from './schema/users';
import { servicePlans } from './schema/service-plans';
import { subscribers } from './schema/subscribers';
import { saasPlans } from './schema/saas-plans';
import { hashPassword } from '../lib/password';

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

  // Seed/Update Default Admin User
  await db
    .insert(users)
    .values({
      id: defaultUserId,
      organizationId: defaultOrgId,
      email: 'admin@ispdemo.com',
      name: 'Admin ISP Demo',
      role: 'admin',
      passwordHash: hashPassword('Admin123!'),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        passwordHash: hashPassword('Admin123!'),
        updatedAt: new Date(),
      },
    });

  // Seed/Update Default Super Admin User
  await db
    .insert(users)
    .values({
      id: superAdminUserId,
      organizationId: defaultOrgId,
      email: 'superadmin@saas-toi.com',
      name: 'Super Admin SaaS',
      role: 'super_admin',
      passwordHash: hashPassword('SuperAdmin123!'),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        passwordHash: hashPassword('SuperAdmin123!'),
        updatedAt: new Date(),
      },
    });

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
