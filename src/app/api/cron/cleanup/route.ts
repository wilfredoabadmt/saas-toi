import { NextResponse } from 'next/server';
import { purgeExpiredWebhookEvents } from '@/lib/cleanup';

/**
 * POST /api/cron/cleanup
 * Purges processed_webhook_events older than 7 days.
 * Designed to be called by a cron scheduler (e.g., Vercel Cron, external cron).
 * Protected by CRON_SECRET header to prevent unauthorized access.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const deleted = await purgeExpiredWebhookEvents(7);
    return NextResponse.json({
      success: true,
      deleted,
      message: `Purged ${deleted} expired webhook events`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
