import { db } from '@/db/client';
import { servicePlans, NewServicePlan } from '@/db/schema/service-plans';
import { assertTenantScope } from '@/lib/tenant';
import { ApiError } from '@/lib/api-errors';
import { eq, and, desc } from 'drizzle-orm';

export class ServicePlanService {
  /**
   * List service plans scoped strictly to organizationId.
   */
  static async list(organizationId: string) {
    const orgId = assertTenantScope(organizationId);

    const plans = await db
      .select()
      .from(servicePlans)
      .where(eq(servicePlans.organizationId, orgId))
      .orderBy(desc(servicePlans.createdAt));

    return plans;
  }

  /**
   * Get plan by ID with tenant scope enforcement.
   */
  static async getById(organizationId: string, id: string) {
    const orgId = assertTenantScope(organizationId);

    const result = await db
      .select()
      .from(servicePlans)
      .where(and(eq(servicePlans.id, id), eq(servicePlans.organizationId, orgId)))
      .limit(1);

    const plan = result[0];
    if (!plan) {
      throw new ApiError('NOT_FOUND', 'Plan de servicio no encontrado', 404);
    }

    return plan;
  }

  /**
   * Create service plan scoped strictly to organizationId.
   */
  static async create(
    organizationId: string,
    input: {
      name: string;
      price: string;
      speedDown?: string;
      speedUp?: string;
      isActive?: boolean;
    }
  ) {
    const orgId = assertTenantScope(organizationId);

    const newPlan: NewServicePlan = {
      organizationId: orgId,
      name: input.name.trim(),
      price: input.price,
      speedDown: input.speedDown?.trim() || null,
      speedUp: input.speedUp?.trim() || null,
      isActive: input.isActive ?? true,
    };

    const inserted = await db.insert(servicePlans).values(newPlan).returning();
    const createdPlan = inserted[0];
    if (!createdPlan) {
      throw new ApiError('INTERNAL_ERROR', 'Error al crear el plan de servicio', 500);
    }

    return createdPlan;
  }

  /**
   * Update service plan.
   */
  static async update(
    organizationId: string,
    id: string,
    input: Partial<{
      name: string;
      price: string;
      speedDown: string;
      speedUp: string;
      isActive: boolean;
    }>
  ) {
    const orgId = assertTenantScope(organizationId);
    await ServicePlanService.getById(orgId, id);

    const updateData: Partial<NewServicePlan> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.price !== undefined) updateData.price = input.price;
    if (input.speedDown !== undefined) updateData.speedDown = input.speedDown.trim();
    if (input.speedUp !== undefined) updateData.speedUp = input.speedUp.trim();
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const updated = await db
      .update(servicePlans)
      .set(updateData)
      .where(and(eq(servicePlans.id, id), eq(servicePlans.organizationId, orgId)))
      .returning();

    return updated[0];
  }

  /**
   * Toggle active commercial status.
   */
  static async toggleStatus(organizationId: string, id: string, isActive: boolean) {
    return ServicePlanService.update(organizationId, id, { isActive });
  }
}
