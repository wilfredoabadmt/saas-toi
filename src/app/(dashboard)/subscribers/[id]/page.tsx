import Link from 'next/link';
import { SubscriberService } from '@/services/subscriber.service';

export const dynamic = 'force-dynamic';

export default async function SubscriberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';

  let subscriber;
  try {
    subscriber = await SubscriberService.getById(defaultOrgId, id);
  } catch {
    return (
      <div>
        <p style={{ color: '#991b1b' }}>Abonado no encontrado.</p>
        <Link href="/subscribers">← Volver a lista</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/subscribers" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Volver a Abonados
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>Expediente de Abonado</h1>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '600px' }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>{subscriber.name}</h2>
        <p><strong>Teléfono:</strong> {subscriber.phone}</p>
        <p><strong>Email:</strong> {subscriber.email || 'N/A'}</p>
        <p><strong>Monto Mensual:</strong> ${subscriber.monthlyAmount}</p>
        <p><strong>Fecha de Vencimiento:</strong> {subscriber.dueDate}</p>
        <p><strong>Estado de Cobranza:</strong> {subscriber.paymentStatus}</p>
        <p><strong>Estado de Cuenta:</strong> {subscriber.status}</p>
      </div>
    </div>
  );
}
