import { db, ensureMigrationsRun } from '@/db/client';
import { organizations } from '@/db/schema/organizations';
import { subscriptions } from '@/db/schema/subscriptions';
import { saasPlans } from '@/db/schema/saas-plans';
import { subscribers } from '@/db/schema/subscribers';
import { ApiError } from '@/lib/api-errors';
import { eq, count, desc } from 'drizzle-orm';

export class SubscriptionService {
  /**
   * Lists all registered organizations with subscription status for Super Admin.
   */
  static async listAllTenants() {
    await ensureMigrationsRun();

    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    const result = await Promise.all(
      orgs.map(async (org) => {
        const [subCountResult] = await db
          .select({ value: count() })
          .from(subscribers)
          .where(eq(subscribers.organizationId, org.id));

        const [subRecord] = await db
          .select({
            status: subscriptions.status,
            planName: saasPlans.name,
            maxSubscribers: saasPlans.maxSubscribers,
          })
          .from(subscriptions)
          .innerJoin(saasPlans, eq(subscriptions.planId, saasPlans.id))
          .where(eq(subscriptions.organizationId, org.id))
          .limit(1);

        return {
          ...org,
          currentSubscribers: Number(subCountResult?.value || 0),
          planName: subRecord?.planName || 'Starter (300)',
          status: subRecord?.status || 'active',
        };
      })
    );

    return result;
  }

  /**
   * Updates or assigns a SaaS plan to a tenant.
   */
  static async updateTenantStatus(organizationId: string, status: string) {
    await ensureMigrationsRun();

    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(subscriptions)
        .set({ status, updatedAt: new Date() })
        .where(eq(subscriptions.organizationId, organizationId))
        .returning();

      return updated;
    }

    // Create default plan assignment
    const [defaultPlan] = await db.select().from(saasPlans).limit(1);
    if (!defaultPlan) {
      throw new ApiError('INTERNAL_ERROR', 'No hay planes configurados en el sistema', 500);
    }

    const [created] = await db
      .insert(subscriptions)
      .values({
        organizationId,
        planId: defaultPlan.id,
        status,
      })
      .returning();

    return created;
  }
}
