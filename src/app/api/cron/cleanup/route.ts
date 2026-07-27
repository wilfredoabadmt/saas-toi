import { NextResponse } from 'next/server';
import { purgeExpiredWebhookEvents, purgeExpiredSessions } from '@/lib/cleanup';

/**
 * POST /api/cron/cleanup
 * Purges processed_webhook_events older than 7 days and expired user sessions.
 * Strictly protected by Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const cronHeader = request.headers.get('x-cron-secret');

  const providedSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cronHeader;

  if (!cronSecret || cronSecret === 'REEMPLAZA_cron_secret' || providedSecret !== cronSecret) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'CRON_SECRET inválido o no configurado.' },
      { status: 401 }
    );
  }

  try {
    const deletedEvents = await purgeExpiredWebhookEvents(7);
    const deletedSessions = await purgeExpiredSessions();

    return NextResponse.json({
      success: true,
      deletedEvents,
      deletedSessions,
      message: `Purged ${deletedEvents} expired webhook events and ${deletedSessions} expired sessions`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
