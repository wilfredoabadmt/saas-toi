import { db } from '@/db/client';
import { subscribers, NewSubscriber } from '@/db/schema/subscribers';
import { assertTenantScope } from '@/lib/tenant';
import { ApiError } from '@/lib/api-errors';
import { eq, and, sql, count, desc } from 'drizzle-orm';

/**
 * Calculates payment status based on due date.
 * - current: dueDate > today + 5 days
 * - due_soon: today <= dueDate <= today + 5 days
 * - overdue: dueDate < today
 */
export function calculatePaymentStatus(dueDateStr: string): 'current' | 'due_soon' | 'overdue' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'overdue';
  } else if (diffDays <= 5) {
    return 'due_soon';
  } else {
    return 'current';
  }
}

export class SubscriberService {
  /**
   * List subscribers scoped strictly to organizationId.
   */
  static async list(params: {
    organizationId: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    paymentStatus?: string;
  }) {
    const orgId = assertTenantScope(params.organizationId);
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(subscribers.organizationId, orgId)];

    if (params.status) {
      conditions.push(eq(subscribers.status, params.status));
    }

    if (params.paymentStatus) {
      conditions.push(eq(subscribers.paymentStatus, params.paymentStatus));
    }

    if (params.search) {
      conditions.push(
        sql`(${subscribers.name} ILIKE ${`%${params.search}%`} OR ${subscribers.phone} ILIKE ${`%${params.search}%`})`
      );
    }

    const whereClause = and(...conditions);

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(subscribers)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(subscribers.createdAt)),
      db
        .select({ total: count() })
        .from(subscribers)
        .where(whereClause),
    ]);

    const total = totalResult?.[0]?.total ?? 0;

    // Recalculate dynamic payment status for each subscriber
    const dataWithCalculatedStatus = (data || []).map((sub) => {
      const currentCalculatedStatus = calculatePaymentStatus(sub.dueDate);
      return {
        ...sub,
        paymentStatus: currentCalculatedStatus,
      };
    });

    return {
      data: dataWithCalculatedStatus,
      pagination: {
        page,
        limit,
        total: Number(total || 0),
        totalPages: Math.ceil(Number(total || 0) / limit),
      },
    };
  }

  /**
   * Create subscriber scoped strictly to organizationId.
   */
  static async create(organizationId: string, input: Omit<NewSubscriber, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) {
    const orgId = assertTenantScope(organizationId);

    // Check for duplicate phone in tenant
    const existing = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.organizationId, orgId), eq(subscribers.phone, input.phone)))
      .limit(1);

    if (existing && existing.length > 0) {
      throw new ApiError('DUPLICATE', 'Ya existe un abonado con este número de teléfono en su ISP', 409);
    }

    const paymentStatus = calculatePaymentStatus(input.dueDate);

    const [created] = await db
      .insert(subscribers)
      .values({
        ...input,
        organizationId: orgId,
        paymentStatus,
      })
      .returning();

    if (!created) {
      throw new ApiError('INTERNAL_ERROR', 'Error al crear abonado', 500);
    }

    return created;
  }

  /**
   * Get single subscriber by ID, verified against organizationId.
   */
  static async getById(organizationId: string, id: string) {
    const orgId = assertTenantScope(organizationId);

    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.id, id), eq(subscribers.organizationId, orgId)))
      .limit(1);

    if (!subscriber) {
      throw new ApiError('NOT_FOUND', 'Abonado no encontrado', 404);
    }

    return {
      ...subscriber,
      paymentStatus: calculatePaymentStatus(subscriber.dueDate),
    };
  }

  /**
   * Update subscriber by ID, verified against organizationId.
   */
  static async update(organizationId: string, id: string, input: Partial<NewSubscriber>) {
    const orgId = assertTenantScope(organizationId);

    await this.getById(orgId, id); // throws 404 if not found or belongs to another tenant

    const updateData: Partial<NewSubscriber> = { ...input, updatedAt: new Date() };

    if (input.dueDate) {
      updateData.paymentStatus = calculatePaymentStatus(input.dueDate);
    }

    const [updated] = await db
      .update(subscribers)
      .set(updateData)
      .where(and(eq(subscribers.id, id), eq(subscribers.organizationId, orgId)))
      .returning();

    return updated;
  }

  /**
   * Soft-delete / cancel subscriber, verified against organizationId.
   */
  static async softDelete(organizationId: string, id: string) {
    const orgId = assertTenantScope(organizationId);

    const [updated] = await db
      .update(subscribers)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(subscribers.id, id), eq(subscribers.organizationId, orgId)))
      .returning();

    if (!updated) {
      throw new ApiError('NOT_FOUND', 'Abonado no encontrado', 404);
    }

    return updated;
  }
}
