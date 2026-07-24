import Link from 'next/link';
import { SubscriberTable, SubscriberItem } from '@/components/domain/subscriber-table';
import { SubscriberService } from '@/services/subscriber.service';

export const dynamic = 'force-dynamic';

export default async function SubscribersPage() {
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const result = await SubscriberService.list({ organizationId: defaultOrgId, limit: 100 });
  const allSubscribers = (result.data || []) as SubscriberItem[];

  // Compute KPI metrics
  const totalSubscribers = result.pagination.total;
  const currentCount = allSubscribers.filter((s) => s.paymentStatus === 'current').length;
  const dueSoonCount = allSubscribers.filter((s) => s.paymentStatus === 'due_soon').length;
  const overdueCount = allSubscribers.filter((s) => s.paymentStatus === 'overdue').length;

  const totalRevenue = allSubscribers.reduce((acc, sub) => acc + Number(sub.monthlyAmount || 0), 0);
  const overdueRevenue = allSubscribers
    .filter((s) => s.paymentStatus === 'overdue')
    .reduce((acc, sub) => acc + Number(sub.monthlyAmount || 0), 0);

  return (
    <div>
      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
            Gestión & Cobranza de Abonados
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
            Panel de control de cartera, importación CSV y estado de vencimiento del ISP
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }} className="page-header-actions">
          <Link href="/subscribers/import" className="btn-primary">
            <span>📥</span> Importar Abonados (CSV)
          </Link>
          <Link
            href="/messaging"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>📣</span> Gatillar Recordatorios
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid inspired by the reference mockup */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* KPI 1: Total Subscribers */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>TOTAL ABONADOS</span>
            <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
              +24% mes
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.5rem 0 0.25rem 0' }}>
            {totalSubscribers}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Clientes activos en red ISP</div>
        </div>

        {/* KPI 2: Estimated Revenue (Hero Metric Card in Lavender Accent) */}
        <div className="kpi-card-accent">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', fontWeight: 800 }}>
            <span>RECAUDACIÓN MENSUAL</span>
            <span style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: '#18181B', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
              🚀 Hero Metric
            </span>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.4rem 0 0.25rem 0' }}>
            ${totalRevenue.toLocaleString('es-CL')}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Monto total proyectado en cartera</div>
        </div>

        {/* KPI 3: Overdue Amount */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>CARTERA VENCIDA</span>
            <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
              {overdueCount} abonados
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', margin: '0.5rem 0 0.25rem 0' }}>
            ${overdueRevenue.toLocaleString('es-CL')}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pendiente de cobro en WhatsApp</div>
        </div>

        {/* KPI 4: Collection Rate */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>TASA DE COBRANZA</span>
            <span style={{ backgroundColor: '#fef9c3', color: '#a16207', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
              Status
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', margin: '0.5rem 0 0.25rem 0' }}>
            {totalSubscribers > 0 ? Math.round((currentCount / totalSubscribers) * 100) : 100}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{currentCount} al día / {dueSoonCount} por vencer</div>
        </div>
      </div>

      {/* Main Subscriber Table */}
      <SubscriberTable subscribers={allSubscribers} />
    </div>
  );
}
