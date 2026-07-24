import { db, ensureMigrationsRun } from '@/db/client';
import { messageLogs, MessageLog } from '@/db/schema/message-logs';
import { subscribers } from '@/db/schema/subscribers';
import { assertTenantScope } from '@/lib/tenant';
import { WabaService } from './waba.service';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { ApiError } from '@/lib/api-errors';
import { eq, and, desc, asc } from 'drizzle-orm';

export interface ConversationSummary {
  subscriberId?: string;
  name: string;
  phone: string;
  email?: string;
  paymentStatus?: string;
  monthlyAmount?: string;
  dueDate?: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

export class ChatInboxService {
  /**
   * Lists all active conversation threads for tenant.
   */
  static async listConversations(organizationId: string): Promise<ConversationSummary[]> {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    // Fetch all subscribers for tenant
    const subList = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.organizationId, orgId));

    // Fetch recent logs for tenant
    const logs = await db
      .select()
      .from(messageLogs)
      .where(eq(messageLogs.organizationId, orgId))
      .orderBy(desc(messageLogs.createdAt));

    // Group logs by subscriberId
    const threadMap = new Map<string, { subscriber?: typeof subList[0]; logs: MessageLog[] }>();

    for (const sub of subList) {
      threadMap.set(sub.id, { subscriber: sub, logs: [] });
    }

    for (const log of logs) {
      if (log.subscriberId && threadMap.has(log.subscriberId)) {
        threadMap.get(log.subscriberId)!.logs.push(log);
      }
    }

    const conversations: ConversationSummary[] = [];

    for (const entry of threadMap.values()) {
      const sub = entry.subscriber;
      if (!sub) continue;

      const subLogs = entry.logs;
      const lastLog = subLogs[0];

      const unreadCount = subLogs.filter(
        (l) => l.direction === 'inbound' && l.deliveryStatus !== 'read'
      ).length;

      conversations.push({
        subscriberId: sub.id,
        name: sub.name,
        phone: sub.phone,
        email: sub.email || undefined,
        paymentStatus: sub.paymentStatus,
        monthlyAmount: sub.monthlyAmount,
        dueDate: sub.dueDate,
        lastMessage: lastLog?.contentPreview || 'Sin mensajes aún',
        lastMessageAt: lastLog?.createdAt || sub.createdAt,
        unreadCount,
      });
    }

    // Sort by last message date descending
    return conversations.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  /**
   * Carga el historial de mensajes de un abonado.
   */
  static async getMessages(organizationId: string, subscriberId: string) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const logs = await db
      .select()
      .from(messageLogs)
      .where(and(eq(messageLogs.organizationId, orgId), eq(messageLogs.subscriberId, subscriberId)))
      .orderBy(asc(messageLogs.createdAt));

    return logs;
  }

  /**
   * Envía un mensaje de respuesta del agente desde el Inbox web.
   */
  static async sendAgentMessage(organizationId: string, subscriberId: string, text: string) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    // 1. Get subscriber phone
    const [sub] = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.id, subscriberId), eq(subscribers.organizationId, orgId)))
      .limit(1);

    if (!sub) {
      throw new ApiError('NOT_FOUND', 'Abonado no encontrado', 404);
    }

    // 2. Get WABA decrypted token
    const credentials = await WabaService.getDecryptedTokenInternal(orgId);

    // 3. Send text message via Meta API
    const result = await WhatsAppClient.sendTextMessage({
      phoneNumberId: credentials.phoneNumberId,
      accessToken: credentials.token,
      toPhone: sub.phone,
      text,
    });

    // 4. Log message in database
    const [log] = await db
      .insert(messageLogs)
      .values({
        organizationId: orgId,
        subscriberId: sub.id,
        wamid: result.wamid,
        direction: 'outbound',
        messageType: 'text',
        contentPreview: text,
        deliveryStatus: 'sent',
      })
      .returning();

    return log;
  }
}
