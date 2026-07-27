'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

interface SaasPlanOption {
  id: string;
  name: string;
  maxSubscribers: number;
  priceMonthlyUSD: string;
}

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  currency: string;
  createdAt: string;
  adminName: string;
  adminEmail: string;
  subscriptionId: string | null;
  planId: string | null;
  planName: string;
  planSlug: string;
  status: string; // 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled' | 'suspended'
  expiresAt: string | null;
  daysRemaining: number;
  currentSubscribers: number;
  maxSubscribers: number;
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [plans, setPlans] = useState<SaasPlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Modal State
  const [selectedTenant, setSelectedTenant] = useState<TenantItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [extendDays, setExtendDays] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTenantsAndPlans = async () => {
    try {
      const [tenantsRes, plansRes] = await Promise.all([
        fetch('/api/super-admin/tenants'),
        fetch('/api/plans'),
      ]);

      const tenantsJson = await tenantsRes.json();
      const plansJson = await plansRes.json();

      if (tenantsJson.success) {
        setTenants(tenantsJson.data);
      }
      if (plansJson.data) {
        setPlans(plansJson.data);
      }
    } catch {
      addToast('Error al cargar la lista global de tenants', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantsAndPlans();
  }, []);

  const openManageModal = (tenant: TenantItem) => {
    setSelectedTenant(tenant);
    setNewPlanId(tenant.planId || (plans[0]?.id || ''));
    setNewStatus(tenant.status || 'active');
    setExtendDays(0);
    setIsModalOpen(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/super-admin/tenants/${selectedTenant.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: newPlanId || undefined,
          status: newStatus,
          extendDays: extendDays > 0 ? extendDays : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Error al actualizar suscripción');
      }

      addToast(`Suscripción de ${selectedTenant.name} actualizada correctamente`, 'success');
      setIsModalOpen(false);
      setSelectedTenant(null);
      fetchTenantsAndPlans();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusToggle = async (tenant: TenantItem) => {
    const targetStatus = tenant.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) throw new Error('Error al actualizar estado del tenant');

      addToast(`Suscripción de ${tenant.name} cambiada a ${targetStatus.toUpperCase()}`, 'info');
      fetchTenantsAndPlans();
    } catch (err) {
      addToast((err as Error).message, 'error');
    }
  };

  const getStatusBadge = (status: string, daysRemaining: number) => {
    switch (status) {
      case 'trialing':
        return (
          <span className="badge badge-warning">
            ⏳ PRUEBA 15 DÍAS ({daysRemaining > 0 ? `${daysRemaining}d` : 'Vence hoy'})
          </span>
        );
      case 'active':
        return <span className="badge badge-success">● ACTIVA</span>;
      case 'past_due':
        return <span className="badge badge-warning">⚠️ PAGO PENDIENTE</span>;
      case 'expired':
        return <span className="badge badge-danger">🚨 EXPIRADA (TRIAL)</span>;
      case 'canceled':
      case 'suspended':
        return <span className="badge badge-danger">🔒 SUSPENDIDA</span>;
      default:
        return <span className="badge badge-info">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div>
      {/* Header with Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="badge badge-warning" style={{ marginBottom: '0.5rem' }}>
            👑 PANEL SUPER ADMIN
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
            Gestión Global de Tenants & Suscripciones
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
            Monitoreo de ISPs registrados, trials de 15 días, cambio manual de planes y extensiones
          </p>
        </div>

        <div className="badge badge-info" style={{ width: '100%', maxWidth: '380px', lineHeight: 1.4, padding: '0.66rem 1rem', boxSizing: 'border-box', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          🔒 Los Super Usuarios se crean por CLI (<code>scripts/create-super-admin.ts</code>).
        </div>
      </div>

      {/* Tenants Table & Cards */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando tenants del SaaS...</div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay organizaciones registradas aún.</div>
        ) : (
          <>
            {/* Desktop View (≥ 768px) */}
            <div className="table-responsive hide-on-mobile">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Organización / ISP</th>
                    <th style={{ padding: '12px 16px' }}>Administrador Principal</th>
                    <th style={{ padding: '12px 16px' }}>Abonados Activos</th>
                    <th style={{ padding: '12px 16px' }}>Plan Actual</th>
                    <th style={{ padding: '12px 16px' }}>Estado & Vencimiento</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones Super Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>{t.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary-accent)' }}><code>{t.slug}</code> • Divisa: {t.currency}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.adminName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.adminEmail}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{t.currentSubscribers} / {t.maxSubscribers}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>abonados en red</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-info">{t.planName}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {getStatusBadge(t.status, t.daysRemaining)}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {t.expiresAt ? `Fin: ${new Date(t.expiresAt).toLocaleDateString()}` : 'Sin expiración'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                            onClick={() => openManageModal(t)}
                          >
                            ⚙️ Gestionar
                          </button>
                          <button
                            className="neu-btn"
                            style={{
                              backgroundColor: t.status === 'active' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
                              color: t.status === 'active' ? 'var(--status-danger-text)' : 'var(--status-success-text)',
                              padding: '0.4rem 0.75rem',
                              fontSize: '0.8rem',
                            }}
                            onClick={() => handleQuickStatusToggle(t)}
                          >
                            {t.status === 'active' ? 'Suspender' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="show-on-mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {tenants.map((t) => (
                <div
                  key={t.id}
                  className="glass-card-dark"
                  style={{
                    padding: '1rem',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{t.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--primary-accent)' }}><code>{t.slug}</code> • Divisa: {t.currency}</div>
                    </div>
                    <span className="badge badge-info">{t.planName}</span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.75rem', borderRadius: '10px' }}>
                    <div>👤 Admin: <strong style={{ color: 'var(--text-main)' }}>{t.adminName}</strong> ({t.adminEmail})</div>
                    <div style={{ marginTop: '4px' }}>📊 Consumo: <strong style={{ color: 'var(--text-main)' }}>{t.currentSubscribers} / {t.maxSubscribers} abonados</strong></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>{getStatusBadge(t.status, t.daysRemaining)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {t.expiresAt ? `Fin: ${new Date(t.expiresAt).toLocaleDateString()}` : 'Sin expiración'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      className="btn-primary"
                      style={{ minHeight: '44px', justifyContent: 'center', fontSize: '0.82rem' }}
                      onClick={() => openManageModal(t)}
                    >
                      ⚙️ Gestionar
                    </button>
                    <button
                      className="neu-btn"
                      style={{
                        minHeight: '44px',
                        justifyContent: 'center',
                        backgroundColor: t.status === 'active' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
                        color: t.status === 'active' ? 'var(--status-danger-text)' : 'var(--status-success-text)',
                        fontSize: '0.82rem',
                      }}
                      onClick={() => handleQuickStatusToggle(t)}
                    >
                      {t.status === 'active' ? 'Suspender' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MANAGE SUBSCRIPTION MODAL */}
      {isModalOpen && selectedTenant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card-dark" style={{ width: '100%', maxWidth: '520px', padding: '2rem', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#818CF8', textTransform: 'uppercase' }}>👑 GESTIÓN SUPER ADMIN</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#F8FAFC', margin: '4px 0 0 0' }}>
                  {selectedTenant.name}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Change SaaS Plan */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.5rem' }}>
                  Plan SaaS Asignado
                </label>
                <select
                  className="glass-input-dark"
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem' }}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id} style={{ backgroundColor: '#0F172A', color: '#F8FAFC' }}>
                      {p.name} — ({p.maxSubscribers} abonados) | ${p.priceMonthlyUSD}/mes
                    </option>
                  ))}
                </select>
              </div>

              {/* Force Status */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.5rem' }}>
                  Estado de Suscripción / Cuenta
                </label>
                <select
                  className="glass-input-dark"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem' }}
                >
                  <option value="trialing" style={{ backgroundColor: '#0F172A' }}>⏳ Trial de Prueba (trialing)</option>
                  <option value="active" style={{ backgroundColor: '#0F172A' }}>● Activa / Pagada (active)</option>
                  <option value="past_due" style={{ backgroundColor: '#0F172A' }}>⚠️ Pago Pendiente (past_due)</option>
                  <option value="expired" style={{ backgroundColor: '#0F172A' }}>🚨 Expirada (expired)</option>
                  <option value="suspended" style={{ backgroundColor: '#0F172A' }}>🔒 Suspendida (suspended)</option>
                  <option value="canceled" style={{ backgroundColor: '#0F172A' }}>❌ Cancelada (canceled)</option>
                </select>
              </div>

              {/* Extend Free Trial Days */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.5rem' }}>
                  Extender Prueba Gratuita (Días Adicionales)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[0, 7, 15, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExtendDays(days)}
                      style={{
                        flex: 1,
                        padding: '0.6rem 0.5rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: extendDays === days ? 'rgba(129, 140, 248, 0.25)' : 'rgba(255,255,255,0.05)',
                        color: extendDays === days ? '#818CF8' : '#CBD5E1',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {days === 0 ? 'Sin cambio' : `+${days} días`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'transparent',
                    color: '#94A3B8',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                >
                  {isSaving ? 'Guardando...' : 'Guardar Cambios 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
