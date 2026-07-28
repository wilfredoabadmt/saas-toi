import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { requireSuperAdmin } from '@/lib/auth';
import { organizations, subscriptions, saasPlans } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    await requireSuperAdmin();

    const rows = await db
      .select({
        organization: organizations,
        subscription: subscriptions,
        plan: saasPlans,
      })
      .from(organizations)
      .leftJoin(subscriptions, eq(organizations.id, subscriptions.organizationId))
      .leftJoin(saasPlans, eq(subscriptions.planId, saasPlans.id))
      .orderBy(desc(organizations.createdAt));

    const tenants = rows.map(({ organization, subscription, plan }) => ({
      ...organization,
      subscription: subscription
        ? {
            ...subscription,
            plan: plan || null,
          }
        : null,
    }));

    return NextResponse.json(tenants);
  } catch (error: unknown) {
    console.error('[API_SUPER_ADMIN_TENANTS_ERROR]', error);
    return NextResponse.json({ error: 'No se pudieron cargar los tenants.' }, { status: 500 });
  }
}