import Link from 'next/link';
import { CsvImportForm } from '@/components/domain/csv-import-form';

export default function SubscriberImportPage() {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/subscribers" style={{ color: 'var(--primary-accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Volver a Abonados
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>Importar Cartera de Abonados (CSV)</h1>
      </div>

      <CsvImportForm />
    </div>
  );
}
