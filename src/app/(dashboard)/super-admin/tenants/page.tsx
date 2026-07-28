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

    if (tenants.length === 0) {
      return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg">No hay tenants registrados aún.</div>;
    }

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Administración de Tenants (ISPs)</h1>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Organización</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plan SaaS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{t.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      t.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {t.subscription?.plan?.name || 'Sin Plan'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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