import { db, ensureMigrationsRun } from '@/db/client';
import { organizations } from '@/db/schema/organizations';
import { subscriptions } from '@/db/schema/subscriptions';
import { saasPlans } from '@/db/schema/saas-plans';
import { subscribers } from '@/db/schema/subscribers';
import { users } from '@/db/schema/users';
import { ApiError } from '@/lib/api-errors';
import { eq, count, desc, and, lt } from 'drizzle-orm';

export interface UpdateTenantSubscriptionParams {
  planId?: string;
  status?: string; // 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled'
  extendDays?: number;
  expiresAt?: string | Date;
}

export class SubscriptionService {
  /**
   * Lists all registered tenant organizations with full subscription details for Super Admin.
   */
  static async listAllTenants() {
    await ensureMigrationsRun();

    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        currency: organizations.currency,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    const result = await Promise.all(
      orgs.map(async (org) => {
        // Count active subscribers
        const [subCountResult] = await db
          .select({ value: count() })
          .from(subscribers)
          .where(eq(subscribers.organizationId, org.id));

        // Get primary admin user
        const [adminUser] = await db
          .select({
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.organizationId, org.id))
          .limit(1);

        // Get subscription & plan
        const [subRecord] = await db
          .select({
            id: subscriptions.id,
            planId: subscriptions.planId,
            status: subscriptions.status,
            expiresAt: subscriptions.expiresAt,
            planName: saasPlans.name,
            planSlug: saasPlans.slug,
            maxSubscribers: saasPlans.maxSubscribers,
            priceMonthlyUSD: saasPlans.priceMonthlyUSD,
          })
          .from(subscriptions)
          .innerJoin(saasPlans, eq(subscriptions.planId, saasPlans.id))
          .where(eq(subscriptions.organizationId, org.id))
          .limit(1);

        // Calculate days remaining
        let daysRemaining = 0;
        const now = new Date();
        const expiresAt = subRecord?.expiresAt ? new Date(subRecord.expiresAt) : null;

        if (expiresAt) {
          const diffTime = expiresAt.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          currency: org.currency || 'BOB',
          createdAt: org.createdAt,
          adminName: adminUser?.name || 'Admin',
          adminEmail: adminUser?.email || 'N/A',
          subscriptionId: subRecord?.id || null,
          planId: subRecord?.planId || null,
          planName: subRecord?.planName || 'Starter',
          planSlug: subRecord?.planSlug || 'starter',
          status: subRecord?.status || 'trialing',
          expiresAt: subRecord?.expiresAt || null,
          daysRemaining,
          currentSubscribers: Number(subCountResult?.value || 0),
          maxSubscribers: subRecord?.maxSubscribers || 300,
        };
      })
    );

    return result;
  }

  /**
   * Updates or assigns a SaaS plan / subscription details to a tenant.
   */
  static async updateTenantSubscription(organizationId: string, params: UpdateTenantSubscriptionParams) {
    await ensureMigrationsRun();

    // Verify organization exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      throw new ApiError('NOT_FOUND', 'Organización no encontrada', 404);
    }

    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };

    if (params.status) {
      updatePayload.status = params.status;
    }

    if (params.planId) {
      // Verify plan exists
      const [plan] = await db.select().from(saasPlans).where(eq(saasPlans.id, params.planId)).limit(1);
      if (!plan) {
        throw new ApiError('NOT_FOUND', 'Plan SaaS no encontrado', 404);
      }
      updatePayload.planId = params.planId;
    }

    let newExpiresAt: Date | undefined;

    if (params.expiresAt) {
      newExpiresAt = new Date(params.expiresAt);
      updatePayload.expiresAt = newExpiresAt;
    } else if (params.extendDays && params.extendDays > 0) {
      const currentExpiry = existing?.expiresAt ? new Date(existing.expiresAt) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      baseDate.setDate(baseDate.getDate() + params.extendDays);
      newExpiresAt = baseDate;
      updatePayload.expiresAt = newExpiresAt;
    }

    if (existing) {
      const [updated] = await db
        .update(subscriptions)
        .set(updatePayload)
        .where(eq(subscriptions.organizationId, organizationId))
        .returning();

      return updated;
    }

    // Create default plan assignment if none exists
    const [defaultPlan] = await db.select().from(saasPlans).limit(1);
    if (!defaultPlan) {
      throw new ApiError('INTERNAL_ERROR', 'No hay planes SaaS configurados.', 500);
    }

    const initialExpiresAt = newExpiresAt || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const [created] = await db
      .insert(subscriptions)
      .values({
        organizationId,
        planId: params.planId || defaultPlan.id,
        status: params.status || 'trialing',
        expiresAt: initialExpiresAt,
      })
      .returning();

    return created;
  }

  /**
   * Backward-compatible alias for updating status.
   */
  static async updateTenantStatus(organizationId: string, status: string) {
    return this.updateTenantSubscription(organizationId, { status });
  }

  /**
   * Process and update all expired trialing subscriptions to 'expired'.
   */
  static async checkAndProcessTrialExpirations() {
    await ensureMigrationsRun();
    const now = new Date();

    const expiredSubs = await db
      .select({
        id: subscriptions.id,
        organizationId: subscriptions.organizationId,
        expiresAt: subscriptions.expiresAt,
      })
      .from(subscriptions)
      .where(and(eq(subscriptions.status, 'trialing'), lt(subscriptions.expiresAt, now)));

    const updatedOrgs: string[] = [];

    for (const sub of expiredSubs) {
      await db
        .update(subscriptions)
        .set({ status: 'expired', updatedAt: now })
        .where(eq(subscriptions.id, sub.id));
      updatedOrgs.push(sub.organizationId);
    }

    return { processedCount: updatedOrgs.length, updatedOrgs };
  }
}
