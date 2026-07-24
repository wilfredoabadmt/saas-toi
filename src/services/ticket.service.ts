import { db, ensureMigrationsRun } from '@/db/client';
import { tickets, NewTicket } from '@/db/schema/tickets';
import { subscribers } from '@/db/schema/subscribers';
import { assertTenantScope } from '@/lib/tenant';
import { ApiError } from '@/lib/api-errors';
import { eq, and, desc } from 'drizzle-orm';
import { TicketNotificationService } from './ticket-notification.service';

export interface ListTicketsFilters {
  status?: string;
  priority?: string;
  assignedTechnician?: string;
}

export class TicketService {
  /**
   * Lists tickets scoped by tenant.
   */
  static async list(organizationId: string, filters?: ListTicketsFilters) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const conditions = [eq(tickets.organizationId, orgId)];

    if (filters?.status) {
      conditions.push(eq(tickets.status, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(tickets.priority, filters.priority));
    }
    if (filters?.assignedTechnician) {
      conditions.push(eq(tickets.assignedTechnician, filters.assignedTechnician));
    }

    const result = await db
      .select({
        ticket: tickets,
        subscriber: {
          id: subscribers.id,
          name: subscribers.name,
          phone: subscribers.phone,
          address: subscribers.address,
        },
      })
      .from(tickets)
      .leftJoin(subscribers, eq(tickets.subscriberId, subscribers.id))
      .where(and(...conditions))
      .orderBy(desc(tickets.createdAt));

    return result;
  }

  /**
   * Gets a ticket by ID.
   */
  static async getById(organizationId: string, id: string) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const [row] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), eq(tickets.organizationId, orgId)))
      .limit(1);

    if (!row) {
      throw new ApiError('NOT_FOUND', 'Ticket de soporte no encontrado', 404);
    }

    return row;
  }

  /**
   * Creates a new ticket autonumbered per tenant (TCK-1001, etc.).
   */
  static async create(
    organizationId: string,
    input: Omit<NewTicket, 'id' | 'organizationId' | 'ticketNumber' | 'createdAt' | 'updatedAt'>
  ) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    // Count existing tickets for org to compute ticketNumber
    const existing = await db
      .select()
      .from(tickets)
      .where(eq(tickets.organizationId, orgId));

    const nextSeq = existing.length + 1001;
    const ticketNumber = `TCK-${nextSeq}`;

    const [created] = await db
      .insert(tickets)
      .values({
        ...input,
        organizationId: orgId,
        ticketNumber,
      })
      .returning();

    if (!created) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo crear el ticket de soporte', 500);
    }

    // Trigger initial notification
    await TicketNotificationService.notifySubscriber(orgId, created);

    return created;
  }

  /**
   * Updates ticket status, assigned technician, or internal notes.
   */
  static async update(
    organizationId: string,
    id: string,
    input: Partial<Omit<NewTicket, 'id' | 'organizationId' | 'ticketNumber'>>
  ) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const [updated] = await db
      .update(tickets)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(tickets.id, id), eq(tickets.organizationId, orgId)))
      .returning();

    if (!updated) {
      throw new ApiError('NOT_FOUND', 'Ticket no encontrado', 404);
    }

    // Notify subscriber on status or technician update
    await TicketNotificationService.notifySubscriber(orgId, updated);

    return updated;
  }
}
