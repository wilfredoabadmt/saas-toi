'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

interface SubscriptionInfo {
  planName: string;
  planSlug: string;
  maxSubscribers: number;
  currentSubscribers: number;
  usagePercent: number;
  status: string;
}

export default function BillingPage() {
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/subscriptions/current');
      const json = await res.json();
      if (json.success) {
        setSubInfo(json.data);
      }
    } catch {
      addToast('Error al cargar datos de la suscripción', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', margin: 0 }}>
          Suscripción & Plan del SaaS
        </h1>
        <p style={{ color: '#64748b', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Gestión de cupo de abonados, estado de cuenta e historial de facturación de tu ISP
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Cargando suscripción...</div>
      ) : subInfo ? (
        <>
          {/* Main Card Usage */}
          <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span className="badge badge-success" style={{ textTransform: 'uppercase', marginBottom: '0.5rem', display: 'inline-block' }}>
                  ● Estado: {subInfo.status.toUpperCase()}
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Plan Actual: {subInfo.planName}
                </h2>
              </div>

              <button
                className="btn-primary"
                onClick={() => addToast('Para solicitar upgrade de plan contacta a ventas@saas-toi.com', 'info')}
              >
                🚀 Solicitar Upgrade de Plan
              </button>
            </div>

            {/* Real-time Progress Bar */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>
                  Cupo de Abonados Consumidos
                </span>
                <span style={{ fontWeight: 800, color: subInfo.usagePercent >= 90 ? '#b91c1c' : '#2563eb', fontSize: '0.95rem' }}>
                  {subInfo.currentSubscribers} / {subInfo.maxSubscribers} Abonados ({subInfo.usagePercent}%)
                </span>
              </div>

              <div style={{ width: '100%', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${subInfo.usagePercent}%`,
                    height: '100%',
                    backgroundColor: subInfo.usagePercent >= 90 ? '#dc2626' : '#2563eb',
                    borderRadius: '6px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {subInfo.usagePercent >= 90 && (
                <div style={{ marginTop: '0.85rem', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠️ Has alcanzado el {subInfo.usagePercent}% de tu capacidad. Solicita un upgrade a Plan Pro para no interrumpir la creación de abonados.
                </div>
              )}
            </div>
          </div>

          {/* SaaS Plans Matrix */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>
              Planes Disponibles para ISPs
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', backgroundColor: subInfo.planSlug === 'starter' ? '#eff6ff' : '#ffffff' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Starter</h3>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2563eb' }}>$49 <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/mes</span></div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0 1rem 0' }}>Hasta 300 abonados</p>
                {subInfo.planSlug === 'starter' && <span className="badge badge-info">Plan Actual</span>}
              </div>

              <div style={{ border: '2px solid #2563eb', borderRadius: '12px', padding: '1.5rem', backgroundColor: subInfo.planSlug === 'pro' ? '#eff6ff' : '#ffffff' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Pro</h3>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2563eb' }}>$99 <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/mes</span></div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0 1rem 0' }}>Hasta 1,500 abonados</p>
                {subInfo.planSlug === 'pro' ? <span className="badge badge-info">Plan Actual</span> : <span className="badge badge-success">Recomendado</span>}
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', backgroundColor: subInfo.planSlug === 'enterprise' ? '#eff6ff' : '#ffffff' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Enterprise</h3>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2563eb' }}>$199 <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/mes</span></div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0 1rem 0' }}>Abonados Ilimitados</p>
                {subInfo.planSlug === 'enterprise' && <span className="badge badge-info">Plan Actual</span>}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
