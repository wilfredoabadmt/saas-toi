'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  currentSubscribers: number;
  planName: string;
  status: string;
  createdAt: string;
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/super-admin/tenants');
      const json = await res.json();
      if (json.success) {
        setTenants(json.data);
      }
    } catch {
      addToast('Error al cargar la lista global de tenants', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleStatusToggle = async (tenant: TenantItem) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: tenant.id, status: newStatus }),
      });

      if (!res.ok) throw new Error('Error al actualizar estado del tenant');

      addToast(`Suscripción de ${tenant.name} marcada como ${newStatus.toUpperCase()}`, 'info');
      fetchTenants();
    } catch (err) {
      addToast((err as Error).message, 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', backgroundColor: '#fef3c7', color: '#b45309', padding: '0.2rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          👑 PANEL SUPER ADMIN
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
          Gestión Global de Tenants & Suscripciones
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Monitoreo de organizaciones registradas, consumo de abonados y suspensión/activación manual
        </p>
      </div>

      {/* Tenants Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando tenants del SaaS...</div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay organizaciones registradas aún.</div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Organización / ISP</th>
                  <th style={{ padding: '12px 16px' }}>Slug</th>
                  <th style={{ padding: '12px 16px' }}>Abonados Activos</th>
                  <th style={{ padding: '12px 16px' }}>Plan Asignado</th>
                  <th style={{ padding: '12px 16px' }}>Estado Suscripción</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones Super Admin</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>{t.name}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--primary-accent)' }}><code>{t.slug}</code></td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-main)' }}>{t.currentSubscribers}</td>
                    <td style={{ padding: '14px 16px' }}><span className="badge badge-info">{t.planName}</span></td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${t.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        style={{
                          backgroundColor: t.status === 'active' ? '#fee2e2' : '#dcfce7',
                          color: t.status === 'active' ? '#b91c1c' : '#15803d',
                          border: 'none',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleStatusToggle(t)}
                      >
                        {t.status === 'active' ? 'Suspender Tenant' : 'Activar Tenant'}
                      </button>
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
}
