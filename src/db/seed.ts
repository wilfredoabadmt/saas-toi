import { db } from './client';
import { organizations } from './schema/organizations';
import { users } from './schema/users';
import { servicePlans } from './schema/service-plans';

export async function seedDefaults() {
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const defaultUserId = '00000000-0000-0000-0000-000000000002';

  // Seed Default Organization
  await db.insert(organizations).values({
    id: defaultOrgId,
    name: 'ISP Demo Internet',
    slug: 'isp-demo',
    status: 'active',
  }).onConflictDoNothing();

  // Seed Default Admin User
  await db.insert(users).values({
    id: defaultUserId,
    organizationId: defaultOrgId,
    email: 'admin@ispdemo.com',
    name: 'Admin ISP Demo',
    role: 'admin',
    passwordHash: 'dummy_hash',
  }).onConflictDoNothing();

  // Seed Sample Service Plan
  await db.insert(servicePlans).values({
    organizationId: defaultOrgId,
    name: 'Fibra 100 Mbps',
    price: '15000.00',
    speedDown: '100 Mbps',
    speedUp: '50 Mbps',
    isActive: true,
  }).onConflictDoNothing();

  return { defaultOrgId, defaultUserId };
}
