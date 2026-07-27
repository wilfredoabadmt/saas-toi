import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionGuard } from '@/services/subscription-guard.service';
import { handleApiError } from '@/lib/api-errors';
import { getSessionContext } from '@/lib/auth';

/**
 * GET /api/subscriptions/current
 * Retrieves tenant current SaaS subscription status and subscriber usage metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getSessionContext(request);
    const info = await SubscriptionGuard.getCurrentSubscription(organizationId);
    return NextResponse.json({ success: true, data: info });
  } catch (err) {
    return handleApiError(err);
  }
}
