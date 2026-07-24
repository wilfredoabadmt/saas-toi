import { NextResponse } from 'next/server';
import { SubscriptionGuard } from '@/services/subscription-guard.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/subscriptions/current
 * Retrieves tenant current SaaS subscription status and subscriber usage metrics.
 */
export async function GET() {
  try {
    const info = await SubscriptionGuard.getCurrentSubscription(DEFAULT_ORG_ID);
    return NextResponse.json({ success: true, data: info });
  } catch (err) {
    return handleApiError(err);
  }
}
