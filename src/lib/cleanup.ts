import { db } from '@/db/client';
import { processedWebhookEvents } from '@/db/schema/processed-events';
import { sessions } from '@/db/schema/sessions';
import { sql, lt } from 'drizzle-orm';

/**
 * Purges processed_webhook_events older than the specified retention period.
 * Default: 7 days. Safe to call repeatedly (idempotent).
 *
 * @returns Number of rows deleted
 */
export async function purgeExpiredWebhookEvents(retentionDays = 7): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const result = await db
    .delete(processedWebhookEvents)
    .where(sql`${processedWebhookEvents.receivedAt} < ${cutoff}`)
    .returning({ id: processedWebhookEvents.id });

  return result.length;
}

/**
 * Purges sessions that have passed their expiresAt timestamp.
 */
export async function purgeExpiredSessions(): Promise<number> {
  const now = new Date();
  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });

  return result.length;
}
