import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { subscribers, tickets, paymentPromise, paymentReceipt } from '@/db/schema';
import { assertTenantScope } from '@/lib/tenant';
import {
  resolveTicketCategory,
  validatePromiseDate,
  type AgentActionType,
} from '@/server/ai/actions';

export type ExecResult =
  | { ok: true; detail?: string }
  | { ok: false; reason: string };

type Ctx = {
  organizationId: string;
  conversationId: string;
  subscriberId: string;
  profile: {
    allowPaymentPromise: boolean;
    allowTicketCreation: boolean;
    allowReceiptCapture: boolean;
    maxPromiseDays: number;
  };
};

function newId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

/* -------------------------------------------------------------------------- */
/* Promesa de pago                                                             */
/* -------------------------------------------------------------------------- */

export async function execRegistrarPromesa(
  ctx: Ctx,
  action: Extract<AgentActionType, { action: 'registrar_promesa_pago' }>
): Promise<ExecResult> {
  const orgId = assertTenantScope(ctx.organizationId);

  if (!ctx.profile.allowPaymentPromise) {
    return { ok: false, reason: 'capacidad deshabilitada' };
  }

  const date = validatePromiseDate(action.fecha, {
    maxDays: ctx.profile.maxPromiseDays,
  });
  if (!date.ok) return { ok: false, reason: `fecha ${date.reason}` };

  if (action.monto !== undefined && action.monto > 1_000_000) {
    return { ok: false, reason: 'monto fuera de rango' };
  }

  try {
    const existing = await db
      .select({ id: paymentPromise.id })
      .from(paymentPromise)
      .where(
        and(
          eq(paymentPromise.organizationId, orgId),
          eq(paymentPromise.subscriberId, ctx.subscriberId),
          eq(paymentPromise.status, 'pendiente')
        )
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(paymentPromise)
        .set({
          promisedFor: date.date,
          amount: action.monto?.toFixed(2) ?? null,
          conversationId: ctx.conversationId,
          updatedAt: new Date(),
        })
        .where(eq(paymentPromise.id, existing[0].id));
      return { ok: true, detail: 'promesa actualizada' };
    }

    await db.insert(paymentPromise).values({
      id: newId('prm'),
      organizationId: orgId,
      subscriberId: ctx.subscriberId,
      conversationId: ctx.conversationId,
      promisedFor: date.date,
      amount: action.monto?.toFixed(2) ?? null,
      status: 'pendiente',
      source: 'ia',
    });
    return { ok: true, detail: 'promesa registrada' };
  } catch (err) {
    console.error('[agente] no se pudo registrar la promesa:', err);
    return { ok: false, reason: 'error de base de datos' };
  }
}

/* -------------------------------------------------------------------------- */
/* Ticket de soporte                                                           */
/* -------------------------------------------------------------------------- */

export async function execCrearTicket(
  ctx: Ctx,
  action: Extract<AgentActionType, { action: 'crear_ticket' }>
): Promise<ExecResult> {
  const orgId = assertTenantScope(ctx.organizationId);

  if (!ctx.profile.allowTicketCreation) {
    return { ok: false, reason: 'capacidad deshabilitada' };
  }

  const categoriaRaw = resolveTicketCategory(action.categoria);
  if (!categoriaRaw) return { ok: false, reason: 'categoría no permitida' };

  // Mapear categoría canónica a categorías de tickets del sistema
  const categoriaMap: Record<string, 'no_service' | 'slow_internet' | 'wifi_password' | 'other'> = {
    sin_servicio: 'no_service',
    lentitud: 'slow_internet',
    intermitencia: 'slow_internet',
    cableado: 'other',
    equipo_danado: 'no_service',
    cambio_domicilio: 'other',
    otro: 'other',
  };
  const systemCategory = categoriaMap[categoriaRaw] || 'other';

  try {
    const dupSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dup = await db
      .select({ id: tickets.id, createdAt: tickets.createdAt })
      .from(tickets)
      .where(
        and(
          eq(tickets.organizationId, orgId),
          eq(tickets.subscriberId, ctx.subscriberId),
          eq(tickets.category, systemCategory)
        )
      )
      .orderBy(desc(tickets.createdAt))
      .limit(1);

    if (dup[0] && dup[0].createdAt > dupSince) {
      return { ok: true, detail: `ticket existente ${dup[0].id}` };
    }

    const ticketNum = `TKT-${Date.now().toString().slice(-6)}`;

    await db.insert(tickets).values({
      organizationId: orgId,
      subscriberId: ctx.subscriberId,
      ticketNumber: ticketNum,
      category: systemCategory,
      priority: systemCategory === 'no_service' ? 'high' : 'medium',
      status: 'open',
      description: `[IA] ${action.descripcion}`,
    });
    return { ok: true, detail: 'ticket creado' };
  } catch (err) {
    console.error('[agente] no se pudo crear el ticket:', err);
    return { ok: false, reason: 'error de base de datos' };
  }
}

/* -------------------------------------------------------------------------- */
/* Comprobante de pago                                                         */
/* -------------------------------------------------------------------------- */

export async function execRegistrarComprobante(
  ctx: Ctx,
  action: Extract<AgentActionType, { action: 'registrar_comprobante' }>,
  mediaMessage: { id: string; mediaId: string | null } | null
): Promise<ExecResult> {
  const orgId = assertTenantScope(ctx.organizationId);

  if (!ctx.profile.allowReceiptCapture) {
    return { ok: false, reason: 'capacidad deshabilitada' };
  }
  if (!mediaMessage) return { ok: false, reason: 'sin imagen reciente' };

  try {
    await db
      .insert(paymentReceipt)
      .values({
        id: newId('rcp'),
        organizationId: orgId,
        subscriberId: ctx.subscriberId,
        conversationId: ctx.conversationId,
        messageId: mediaMessage.id,
        storageKey: mediaMessage.mediaId,
        declaredAmount: action.monto?.toFixed(2) ?? null,
        reference: action.referencia ?? null,
        status: 'en_revision',
      })
      .onConflictDoNothing({ target: paymentReceipt.messageId });
    return { ok: true, detail: 'comprobante en revisión' };
  } catch (err) {
    console.error('[agente] no se pudo registrar el comprobante:', err);
    return { ok: false, reason: 'error de base de datos' };
  }
}

/* -------------------------------------------------------------------------- */
/* Nota en el expediente                                                       */
/* -------------------------------------------------------------------------- */

export async function execNotaAbonado(
  ctx: Ctx,
  action: Extract<AgentActionType, { action: 'nota_abonado' }>
): Promise<ExecResult> {
  const orgId = assertTenantScope(ctx.organizationId);

  try {
    const rows = await db
      .select({ id: subscribers.id, notes: subscribers.notes })
      .from(subscribers)
      .where(and(eq(subscribers.organizationId, orgId), eq(subscribers.id, ctx.subscriberId)))
      .limit(1);

    const sub = rows[0];
    if (!sub) return { ok: false, reason: 'abonado no encontrado' };

    const stamped = `[IA ${new Date().toISOString().slice(0, 10)}] ${action.note}`;
    await db
      .update(subscribers)
      .set({
        notes: sub.notes ? `${sub.notes}\n${stamped}` : stamped,
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, sub.id));
    return { ok: true };
  } catch (err) {
    console.error('[agente] no se pudo guardar la nota:', err);
    return { ok: false, reason: 'error de base de datos' };
  }
}
