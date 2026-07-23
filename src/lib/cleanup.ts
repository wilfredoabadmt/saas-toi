import { db } from '@/db/client';
import { processedWebhookEvents } from '@/db/schema/processed-events';
import { sql } from 'drizzle-orm';

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
