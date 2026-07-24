import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/services/subscription.service';
import { handleApiError } from '@/lib/api-errors';

/**
 * GET /api/super-admin/tenants
 * Lists all registered tenant organizations for Super Admin.
 */
export async function GET() {
  try {
    const tenants = await SubscriptionService.listAllTenants();
    return NextResponse.json({ success: true, data: tenants });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/super-admin/tenants
 * Updates subscription status of a tenant.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, status } = body;

    if (!organizationId || !status) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'organizationId y status son requeridos' }, { status: 400 });
    }

    const updated = await SubscriptionService.updateTenantStatus(organizationId, status);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
