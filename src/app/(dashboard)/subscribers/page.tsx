import Link from 'next/link';
import { SubscriberTable, SubscriberItem } from '@/components/domain/subscriber-table';
import { SubscriberService } from '@/services/subscriber.service';

export const dynamic = 'force-dynamic';

export default async function SubscribersPage() {
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const result = await SubscriberService.list({ organizationId: defaultOrgId, limit: 50 });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Gestión de Abonados</h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Lista de suscriptores y cartera de cobranza del ISP
          </p>
        </div>
        <Link
          href="/subscribers/import"
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '0.9rem',
          }}
        >
          📥 Importar CSV
        </Link>
      </div>

      <SubscriberTable subscribers={result.data as SubscriberItem[]} />
    </div>
  );
}
