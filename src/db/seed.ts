import { db } from './client';
import { organizations } from './schema/organizations';
import { users } from './schema/users';
import { servicePlans } from './schema/service-plans';
import { subscribers } from './schema/subscribers';

export async function seedDefaults() {
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const defaultUserId = '00000000-0000-0000-0000-000000000002';

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

  // Seed Default Admin User
  await db
    .insert(users)
    .values({
      id: defaultUserId,
      organizationId: defaultOrgId,
      email: 'admin@ispdemo.com',
      name: 'Admin ISP Demo',
      role: 'admin',
      passwordHash: 'dummy_hash',
    })
    .onConflictDoNothing();

  // Seed Sample Service Plan
  const planResult = await db
    .insert(servicePlans)
    .values({
      organizationId: defaultOrgId,
      name: 'Fibra 100 Mbps',
      price: '25000.00',
      speedDown: '100 Mbps',
      speedUp: '50 Mbps',
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  const planId = planResult[0]?.id;

  // Seed Sample Subscribers for Demo Testing
  await db
    .insert(subscribers)
    .values([
      {
        organizationId: defaultOrgId,
        name: 'Carlos Mendoza',
        phone: '+56912345678',
        email: 'carlos.mendoza@gmail.com',
        servicePlanId: planId,
        monthlyAmount: '25000.00',
        dueDate: '2026-07-28',
        paymentStatus: 'current',
        status: 'active',
      },
      {
        organizationId: defaultOrgId,
        name: 'María Fernanda Torres',
        phone: '+56987654321',
        email: 'maria.torres@outlook.com',
        servicePlanId: planId,
        monthlyAmount: '32000.00',
        dueDate: '2026-07-25',
        paymentStatus: 'due_soon',
        status: 'active',
      },
      {
        organizationId: defaultOrgId,
        name: 'Alejandro Silva',
        phone: '+56955512345',
        email: 'a.silva@yahoo.com',
        servicePlanId: planId,
        monthlyAmount: '19000.00',
        dueDate: '2026-07-15',
        paymentStatus: 'overdue',
        status: 'active',
      },
      {
        organizationId: defaultOrgId,
        name: 'Valentina Rojas',
        phone: '+56944488811',
        email: 'valentina.rojas@gmail.com',
        servicePlanId: planId,
        monthlyAmount: '45000.00',
        dueDate: '2026-07-10',
        paymentStatus: 'overdue',
        status: 'active',
      },
      {
        organizationId: defaultOrgId,
        name: 'Roberto Gómez',
        phone: '+56933322110',
        email: 'roberto.gomez@gmail.com',
        servicePlanId: planId,
        monthlyAmount: '25000.00',
        dueDate: '2026-07-30',
        paymentStatus: 'current',
        status: 'active',
      },
    ])
    .onConflictDoNothing();

  return { defaultOrgId, defaultUserId };
}
