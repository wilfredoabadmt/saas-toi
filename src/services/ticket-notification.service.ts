import { WabaService } from './waba.service';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { Ticket } from '@/db/schema/tickets';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema/subscribers';
import { eq, and } from 'drizzle-orm';
import { assertTenantScope } from '@/lib/tenant';

export class TicketNotificationService {
  /**
   * Sends a WhatsApp status update message to the subscriber.
   */
  static async notifySubscriber(organizationId: string, ticket: Ticket) {
    const orgId = assertTenantScope(organizationId);

    // 1. Get subscriber phone
    const [sub] = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.id, ticket.subscriberId), eq(subscribers.organizationId, orgId)))
      .limit(1);

    if (!sub) return;

    try {
      // 2. Get WABA decrypted credentials
      const credentials = await WabaService.getDecryptedTokenInternal(orgId);

      // 3. Format state message
      const statusLabels: Record<string, string> = {
        open: 'ABIERTO',
        in_progress: 'EN PROCESO DE ATENCIÓN',
        resolved: 'RESUELTO',
        closed: 'CERRADO',
      };

      const statusText = statusLabels[ticket.status] || ticket.status;
      const techText = ticket.assignedTechnician ? `\nTécnico asignado: ${ticket.assignedTechnician}` : '';

      const messageText = `📢 Actualización de Ticket ${ticket.ticketNumber}\n\nEstimado/a ${sub.name}, tu ticket por "${ticket.description}" ha cambiado a estado: *${statusText}*.${techText}\n\nGracias por preferir nuestro servicio ISP.`;

      // 4. Send WhatsApp message
      await WhatsAppClient.sendTextMessage({
        phoneNumberId: credentials.phoneNumberId,
        accessToken: credentials.token,
        toPhone: sub.phone,
        text: messageText,
      });
    } catch {
      // Non-blocking notification fallback
    }
  }
}
