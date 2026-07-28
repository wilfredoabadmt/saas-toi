import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ErrorFallback } from '@/components/ui/error-fallback';
// Asumiendo que tienes un componente cliente para renderizar la tabla
// import { TenantsClientPage } from './_components/tenants-client-page';

async function getTenants() {
  await requireRole('super_admin');
  const tenants = await db.query.organizations.findMany({
    with: {
      subscription: {
        with: {
          plan: true,
        },
      },
    },
    orderBy: (orgs, { desc }) => [desc(orgs.createdAt)],
  });
  return tenants;
}

export default async function SuperAdminTenantsPage() {
  try {
    const tenants = await getTenants();

    if (tenants.length === 0) {
      return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg">No hay tenants registrados aún.</div>;
    }

    // Aquí renderizarías la tabla de tenants, probablemente en un componente cliente
    // return <TenantsClientPage tenants={tenants} />;
    return <div><h1>Tenants</h1><pre>{JSON.stringify(tenants, null, 2)}</pre></div>

  } catch (error) {
    console.error('[PAGE_TENANTS_ERROR]', error);
    return (
      <ErrorFallback title="Error al cargar Tenants" message="No se pudo establecer la conexión con la base de datos. Por favor, inténtalo de nuevo más tarde." />
    );
  }
}