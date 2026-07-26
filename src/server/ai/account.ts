import { and, desc, eq, inArray, sql, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { subscribers, servicePlans, tickets, paymentProofs, paymentPromise, paymentReceipt } from '@/db/schema';
import { assertTenantScope } from '@/lib/tenant';
import {
  daysSince,
  normalizeServiceStatus,
  toIsoDate,
  toMoney,
  UNKNOWN_ACCOUNT,
  type AccountSnapshot,
} from '@/server/ai/account-context';

export * from '@/server/ai/account-context';

/**
 * Resuelve el estado de cuenta a partir del teléfono del contacto.
 *
 * Contrato: NUNCA lanza. Si algo falla (tabla ausente, abonado no encontrado),
 * devuelve `UNKNOWN_ACCOUNT` y el prompt le dice al agente que no tiene datos.
 * Un error de dominio no debe tumbar el turno.
 */
export async function getAccountSnapshot(input: {
  organizationId: string;
  /** Teléfono del contacto de WhatsApp (ej. '+59169926886' o '59169926886'). */
  phone: string;
}): Promise<AccountSnapshot> {
  try {
    return await loadSnapshot(input);
  } catch (err) {
    console.error('[agente] estado de cuenta no disponible:', err);
    return UNKNOWN_ACCOUNT;
  }
}

async function loadSnapshot(input: {
  organizationId: string;
  phone: string;
}): Promise<AccountSnapshot> {
  const orgId = assertTenantScope(input.organizationId);

  const rawPhone = input.phone.trim();
  const phoneWithPlus = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
  const phoneWithoutPlus = rawPhone.replace(/^\+/, '');

  // 1. Abonado por teléfono (+ join a plan de servicio)
  const subs = await db
    .select({
      id: subscribers.id,
      name: subscribers.name,
      phone: subscribers.phone,
      monthlyAmount: subscribers.monthlyAmount,
      dueDate: subscribers.dueDate,
      status: subscribers.status,
      paymentStatus: subscribers.paymentStatus,
      planName: servicePlans.name,
      planPrice: servicePlans.price,
    })
    .from(subscribers)
    .leftJoin(servicePlans, eq(subscribers.servicePlanId, servicePlans.id))
    .where(
      and(
        eq(subscribers.organizationId, orgId),
        or(
          eq(subscribers.phone, phoneWithPlus),
          eq(subscribers.phone, phoneWithoutPlus)
        )
      )
    )
    .limit(1);

  const sub = subs[0];
  if (!sub) return UNKNOWN_ACCOUNT;

  // 2. Facturas / Saldo vencido
  const isOverdue = sub.paymentStatus === 'overdue';
  const saldo = isOverdue ? toMoney(sub.monthlyAmount) : '0.00';
  const diasVencido = isOverdue ? daysSince(sub.dueDate) : 0;

  // 3. Último pago (comprobante aprobado más reciente)
  const pagos = await db
    .select({
      amount: paymentProofs.extractedAmount,
      reviewedAt: paymentProofs.reviewedAt,
    })
    .from(paymentProofs)
    .where(
      and(
        eq(paymentProofs.organizationId, orgId),
        eq(paymentProofs.subscriberId, sub.id),
        eq(paymentProofs.reviewStatus, 'approved')
      )
    )
    .orderBy(desc(paymentProofs.reviewedAt))
    .limit(1);

  // 4. Tickets abiertos
  const openTickets = await db
    .select({
      id: tickets.id,
      category: tickets.category,
      status: tickets.status,
      createdAt: tickets.createdAt,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.organizationId, orgId),
        eq(tickets.subscriberId, sub.id),
        inArray(tickets.status, ['open', 'in_progress'])
      )
    )
    .orderBy(desc(tickets.createdAt))
    .limit(5);

  // 5. Promesas de pago activas
  const promesas = await db
    .select({
      promisedFor: paymentPromise.promisedFor,
      amount: paymentPromise.amount,
    })
    .from(paymentPromise)
    .where(
      and(
        eq(paymentPromise.organizationId, orgId),
        eq(paymentPromise.subscriberId, sub.id),
        eq(paymentPromise.status, 'pendiente')
      )
    )
    .limit(1);

  // 6. Comprobantes en revisión
  const recibos = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(paymentReceipt)
    .where(
      and(
        eq(paymentReceipt.organizationId, orgId),
        eq(paymentReceipt.subscriberId, sub.id),
        eq(paymentReceipt.status, 'en_revision')
      )
    );

  const pago = pagos[0];
  const promesa = promesas[0];

  return {
    found: true,
    subscriberId: sub.id,
    nombre: sub.name,
    codigoCliente: sub.id.slice(0, 8),
    plan: sub.planName
      ? { nombre: sub.planName, precio: sub.planPrice ?? null }
      : null,
    estadoServicio: normalizeServiceStatus(sub.status, sub.paymentStatus),
    saldoVencido: saldo,
    moneda: process.env.BILLING_CURRENCY?.trim() || 'USD',
    diasVencido,
    fechaCorte: sub.dueDate ? String(sub.dueDate) : null,
    ultimoPago:
      pago && pago.reviewedAt
        ? { fecha: toIsoDate(pago.reviewedAt) ?? '', monto: toMoney(pago.amount ?? sub.monthlyAmount) }
        : null,
    promesaVigente: promesa
      ? {
          fecha: String(promesa.promisedFor),
          monto: promesa.amount ? toMoney(promesa.amount) : null,
        }
      : null,
    ticketsAbiertos: openTickets.map((t) => ({
      id: t.id,
      categoria: String(t.category),
      estado: String(t.status),
      abiertoEl: toIsoDate(t.createdAt) ?? '',
    })),
    comprobantesEnRevision: recibos[0]?.n ?? 0,
  };
}
