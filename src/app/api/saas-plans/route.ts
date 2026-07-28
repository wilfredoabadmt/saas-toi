import { NextResponse } from 'next/server';
import { db, ensureMigrationsRun } from '@/db/client';
import { saasPlans } from '@/db/schema/saas-plans';
import { requireSuperAdmin } from '@/lib/auth';

/**
 * GET /api/saas-plans
 * Lists all SaaS subscription plans for Super Admin tenant management.
 */
export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);
    await ensureMigrationsRun();

    const plans = await db
      .select({
        id: saasPlans.id,
        name: saasPlans.name,
        slug: saasPlans.slug,
        maxSubscribers: saasPlans.maxSubscribers,
        maxRouters: saasPlans.maxRouters,
        priceMonthlyUSD: saasPlans.priceMonthlyUSD,
        isActive: saasPlans.isActive,
      })
      .from(saasPlans)
      .orderBy(saasPlans.priceMonthlyUSD);

    return NextResponse.json({ success: true, data: plans });
  } catch (err) {
    console.error('[SAAS PLANS API ERROR]:', err);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Error al obtener planes SaaS' },
      { status: 500 }
    );
  }
}
