import React from 'react';
import { db } from '@/db/client';
import { requireSuperAdmin } from '@/lib/auth';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { organizations, subscriptions, saasPlans } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

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

        {/* Tenants Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Organizaciones Registradas</h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-full">
              {tenants.length} empresas
            </span>
          </div>

          {tenants.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              No se han registrado empresas ISP aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="px-5 py-3.5">Organización</th>
                    <th className="px-5 py-3.5">Identificador / Slug</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5">Plan SaaS</th>
                    <th className="px-5 py-3.5">Moneda</th>
                    <th className="px-5 py-3.5">Fecha Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 font-medium text-slate-800 dark:text-slate-200">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-500/20">
                            {t.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-slate-900 dark:text-white font-bold">{t.name}</div>
                            <div className="text-xs text-slate-400 font-normal">ID: {t.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-xs font-mono bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded">
                          {t.slug}
                        </code>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${
                          t.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {t.status === 'active' ? 'Activo' : t.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {t.subscription?.plan?.name || 'Starter (Demo)'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {t.currency || 'BOB'}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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