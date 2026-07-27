import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/services/subscription.service';
import { handleApiError } from '@/lib/api-errors';
import { requireSuperAdmin } from '@/lib/auth';

/**
 * PATCH /api/super-admin/tenants/[id]/subscription
 * Allows Super Admin to upgrade/downgrade plan, extend trial days, or force status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id: tenantId } = await params;
    const body = await request.json();

    const { planId, status, extendDays, expiresAt } = body;

    const updated = await SubscriptionService.updateTenantSubscription(tenantId, {
      planId,
      status,
      extendDays: extendDays ? Number(extendDays) : undefined,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Suscripción de tenant actualizada correctamente',
      data: updated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
