import React from 'react';
import { db } from '@/db/client';
import { requireSuperAdmin } from '@/lib/auth';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { organizations, subscriptions, saasPlans } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { TenantManagerTable } from './_components/tenant-manager-table';

async function getTenants() {
  await requireSuperAdmin();

  const rows = await db
    .select({
      organization: organizations,
      subscription: subscriptions,
      plan: saasPlans,
    })
    .from(organizations)
    .leftJoin(subscriptions, eq(organizations.id, subscriptions.organizationId))
    .leftJoin(saasPlans, eq(subscriptions.planId, saasPlans.id))
    .orderBy(desc(organizations.createdAt));

  return rows.map(({ organization, subscription, plan }) => ({
    ...organization,
    subscription: subscription
      ? {
          ...subscription,
          plan: plan || null,
        }
      : null,
  }));
}

export default async function SuperAdminTenantsPage() {
  try {
    const tenants = await getTenants();
    const activeCount = tenants.filter((t) => t.status === 'active').length;
    const withPlanCount = tenants.filter((t) => t.subscription?.plan).length;

    return (
      <div className="space-y-6">
        {/* Page Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Administración de Tenants (Empresas ISP)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Panel centralizado de control y suscripciones para proveedores de internet SaaS.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total ISPs</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{tenants.length}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl">
              🏢
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">ISPs Activas</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl">
              🟢
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Con Plan Asignado</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{withPlanCount}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xl">
              💳
            </div>
          </div>
        </div>

        {/* Tenants Management Interactive Table */}
        <TenantManagerTable initialTenants={tenants} />
      </div>
    );
  } catch (error) {
    console.error('[PAGE_TENANTS_ERROR]', error);
    return (
      <ErrorFallback
        title="Error al cargar Tenants"
        message="No se pudo consultar la lista de organizaciones. Por favor, intente nuevamente."
      />
    );
  }
}