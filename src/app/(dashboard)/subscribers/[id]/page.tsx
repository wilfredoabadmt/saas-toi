import Link from 'next/link';
import { SubscriberService } from '@/services/subscriber.service';
import { PaymentProofService } from '@/services/payment-proof.service';
import { PaymentProofViewer, PaymentProofItem } from '@/components/domain/payment-proof-viewer';

export const dynamic = 'force-dynamic';

export default async function SubscriberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';

  let subscriber;
  let proofs: PaymentProofItem[] = [];

  try {
    subscriber = await SubscriberService.getById(defaultOrgId, id);
    proofs = (await PaymentProofService.listBySubscriber(defaultOrgId, id)) as unknown as PaymentProofItem[];
  } catch {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#b91c1c', fontWeight: 600 }}>Abonado no encontrado.</p>
        <Link href="/subscribers" className="btn-primary" style={{ marginTop: '1rem' }}>
          ← Volver a Abonados
        </Link>
      </div>
    );
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'current':
        return <span className="badge badge-success">● Al día</span>;
      case 'due_soon':
        return <span className="badge badge-warning">● Por vencer</span>;
      case 'overdue':
        return <span className="badge badge-danger">● Vencido</span>;
      default:
        return <span className="badge badge-info">{st}</span>;
    }
  };

  return (
    <div>
      {/* Header Breadcrumb */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/subscribers" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
          ← Volver a lista de abonados
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', margin: '0.5rem 0 0 0' }}>
          Expediente del Abonado
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Subscriber Info Card */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{subscriber.name}</h2>
            {getStatusBadge(subscriber.paymentStatus)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Teléfono WhatsApp:</span>
              <strong style={{ color: '#0f172a' }}>{subscriber.phone}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Monto Mensual:</span>
              <strong style={{ color: '#0f172a' }}>${subscriber.monthlyAmount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Fecha de Vencimiento:</span>
              <strong style={{ color: '#0f172a' }}>{subscriber.dueDate}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Email:</span>
              <span style={{ color: '#0f172a' }}>{subscriber.email || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Opt-out WhatsApp:</span>
              <span style={{ fontWeight: 600, color: subscriber.optedOutWhatsapp ? '#b91c1c' : '#15803d' }}>
                {subscriber.optedOutWhatsapp ? 'Sí (Bloqueado)' : 'No (Permitido)'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Proofs S3 Section */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
            📸 Comprobantes de Pago Recibidos ({proofs.length})
          </h3>

          {proofs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧾</div>
              <p style={{ fontSize: '0.88rem' }}>No se han recibido comprobantes de pago para este abonado.</p>
            </div>
          ) : (
            <div>
              {proofs.map((proof) => (
                <PaymentProofViewer key={proof.id} proof={proof} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
