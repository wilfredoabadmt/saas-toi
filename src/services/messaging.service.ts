import { db, ensureMigrationsRun } from '@/db/client';
import { messageLogs } from '@/db/schema/message-logs';
import { subscribers } from '@/db/schema/subscribers';
import { assertTenantScope } from '@/lib/tenant';
import { WabaService } from './waba.service';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { RateLimiter } from '@/lib/rate-limiter';
import { ApiError } from '@/lib/api-errors';
import { eq, and, inArray, desc } from 'drizzle-orm';

export interface SendReminderResult {
  totalRequested: number;
  sent: number;
  skipped: number;
  skippedReasons: Array<{ subscriberId: string; reason: string }>;
  results: Array<{ subscriberId: string; wamid?: string; status: 'sent' | 'failed' | 'skipped' }>;
}

export class MessagingService {
  /**
   * Sends Utility template payment reminders to a list of subscribers.
   */
  static async sendReminderTemplates(params: {
    organizationId: string;
    subscriberIds: string[];
    templateName?: string;
  }): Promise<SendReminderResult> {
    const orgId = assertTenantScope(params.organizationId);
    const templateName = params.templateName || 'payment_reminder';

    if (params.subscriberIds.length === 0) {
      return { totalRequested: 0, sent: 0, skipped: 0, skippedReasons: [], results: [] };
    }

    // 1. Get decrypted WABA token & info (throws 400 if WABA not connected)
    const waba = await WabaService.getDecryptedTokenInternal(orgId);

    // 2. Fetch subscribers scoped to organizationId
    const subList = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.organizationId, orgId), inArray(subscribers.id, params.subscriberIds)));

    const skippedReasons: Array<{ subscriberId: string; reason: string }> = [];
    const results: Array<{ subscriberId: string; wamid?: string; status: 'sent' | 'failed' | 'skipped' }> = [];
    let sentCount = 0;

    for (const sub of subList) {
      // Check opt-out
      if (sub.optedOutWhatsapp) {
        skippedReasons.push({ subscriberId: sub.id, reason: 'opted_out' });
        results.push({ subscriberId: sub.id, status: 'skipped' });
        continue;
      }

      // Check rate limit per tenant
      if (!RateLimiter.tryConsume(orgId)) {
        throw new ApiError('RATE_LIMIT_EXCEEDED', 'Se ha alcanzado el límite de envíos por minuto de su ISP. Intente nuevamente en 1 minuto.', 429);
      }

      try {
        const components = [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: sub.name },
              { type: 'text', text: `$${sub.monthlyAmount}` },
              { type: 'text', text: sub.dueDate },
            ],
          },
        ];

        const sendRes = await WhatsAppClient.sendTemplateMessage({
          phoneNumberId: waba.phoneNumberId,
          accessToken: waba.token,
          toPhone: sub.phone,
          templateName,
          components,
        });

        // Register message log
        await db.insert(messageLogs).values({
          organizationId: orgId,
          subscriberId: sub.id,
          wamid: sendRes.wamid,
          direction: 'outbound',
          messageType: 'template',
          templateName,
          contentPreview: `Aviso de cobro: ${sub.name} - $${sub.monthlyAmount} (Vence ${sub.dueDate})`,
          deliveryStatus: 'sent',
        });

        results.push({ subscriberId: sub.id, wamid: sendRes.wamid, status: 'sent' });
        sentCount++;
      } catch (err) {
        // Remediation C3: Handle WABA token auth failure
        if (err instanceof ApiError && err.code === 'UNAUTHORIZED') {
          await WabaService.handleAuthFailure(orgId);
        }

        results.push({ subscriberId: sub.id, status: 'failed' });
      }
    }

    return {
      totalRequested: params.subscriberIds.length,
      sent: sentCount,
      skipped: skippedReasons.length,
      skippedReasons,
      results,
    };
  }

  /**
   * List message logs for tenant.
   */
  static async listLogs(params: { organizationId: string; page?: number; limit?: number; subscriberId?: string }) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(params.organizationId);
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(messageLogs.organizationId, orgId)];

    if (params.subscriberId) {
      conditions.push(eq(messageLogs.subscriberId, params.subscriberId));
    }

    const logs = await db
      .select()
      .from(messageLogs)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(messageLogs.sentAt));

    return {
      data: logs,
      pagination: { page, limit },
    };
  }
}
