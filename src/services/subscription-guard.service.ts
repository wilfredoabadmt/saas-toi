import { db, ensureMigrationsRun } from '@/db/client';
import { subscribers } from '@/db/schema/subscribers';
import { subscriptions } from '@/db/schema/subscriptions';
import { saasPlans } from '@/db/schema/saas-plans';
import { assertTenantScope } from '@/lib/tenant';
import { ApiError } from '@/lib/api-errors';
import { eq, count } from 'drizzle-orm';

export interface SubscriptionInfo {
  planName: string;
  planSlug: string;
  maxSubscribers: number;
  currentSubscribers: number;
  usagePercent: number;
  status: string;
}

export class SubscriptionGuard {
  /**
   * Retrieves current SaaS subscription info and subscriber usage for a tenant.
   */
  static async getCurrentSubscription(organizationId: string): Promise<SubscriptionInfo> {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    // Count current subscribers
    const [subCountResult] = await db
      .select({ value: count() })
      .from(subscribers)
      .where(eq(subscribers.organizationId, orgId));

    const currentSubscribers = Number(subCountResult?.value || 0);

    // Fetch subscription record
    const [subRecord] = await db
      .select({
        status: subscriptions.status,
        planName: saasPlans.name,
        planSlug: saasPlans.slug,
        maxSubscribers: saasPlans.maxSubscribers,
      })
      .from(subscriptions)
      .innerJoin(saasPlans, eq(subscriptions.planId, saasPlans.id))
      .where(eq(subscriptions.organizationId, orgId))
      .limit(1);

    const maxSubscribers = subRecord?.maxSubscribers || 300; // Default Starter 300
    const planName = subRecord?.planName || 'Starter';
    const planSlug = subRecord?.planSlug || 'starter';
    const status = subRecord?.status || 'active';

    const usagePercent = Math.min(100, Math.round((currentSubscribers / maxSubscribers) * 100));

    return {
      planName,
      planSlug,
      maxSubscribers,
      currentSubscribers,
      usagePercent,
      status,
    };
  }

  /**
   * Asserts that tenant can add specified count of subscribers without exceeding plan limit.
   */
  static async assertCanAddSubscriber(organizationId: string, countToAdd: number = 1) {
    const subInfo = await this.getCurrentSubscription(organizationId);

    if (subInfo.status === 'suspended') {
      throw new ApiError('FORBIDDEN', 'La suscripción del ISP se encuentra suspendida. Contacta a soporte para reactivar', 403);
    }

    if (subInfo.currentSubscribers + countToAdd > subInfo.maxSubscribers) {
      throw new ApiError(
        'FORBIDDEN',
        `Has alcanzado el límite máximo de abonados de tu plan ${subInfo.planName} (${subInfo.maxSubscribers}). Actualiza tu plan a Pro para continuar`,
        403
      );
    }
  }
}
