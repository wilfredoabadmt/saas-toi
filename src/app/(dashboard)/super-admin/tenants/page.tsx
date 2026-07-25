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
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminName, setSuperAdminName] = useState('');
  const [superAdminPass, setSuperAdminPass] = useState('');
  const [isCreating, setIsCreating] = useState(false);
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

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch('/api/auth/seed-superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: superAdminEmail,
          name: superAdminName,
          password: superAdminPass,
        }),
      });

      const json = await res.json();
      if (json.success) {
        addToast(`👑 Super Usuario ${json.user.email} creado/promovido exitosamente`, 'success');
        setIsSuperAdminModalOpen(false);
        setSuperAdminEmail('');
        setSuperAdminName('');
        setSuperAdminPass('');
      } else {
        addToast(json.error?.message || 'Error al crear Super Usuario', 'error');
      }
    } catch {
      addToast('Error al conectar con el servidor', 'error');
    } finally {
      setIsCreating(false);
    }
  };

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
            Monitoreo de organizaciones registradas, consumo de abonados y suspensión/activación manual
          </p>
        </div>

        <button
          className="neu-btn-primary"
          onClick={() => setIsSuperAdminModalOpen(true)}
        >
          👑 Crear Super Usuario
        </button>
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
                        className="neu-btn"
                        style={{
                          backgroundColor: t.status === 'active' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
                          color: t.status === 'active' ? 'var(--status-danger-text)' : 'var(--status-success-text)',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
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

      {/* Modal: Crear Super Usuario */}
      {isSuperAdminModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '2rem',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                👑 Crear Nuevo Super Usuario
              </h3>
              <button
                type="button"
                onClick={() => setIsSuperAdminModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSuperAdmin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={superAdminName}
                  onChange={(e) => setSuperAdminName(e.target.value)}
                  placeholder="Ej. Admin Global SaaS"
                  className="neu-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={superAdminEmail}
                  onChange={(e) => setSuperAdminEmail(e.target.value)}
                  placeholder="superadmin@saas-toi.com"
                  className="neu-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={superAdminPass}
                  onChange={(e) => setSuperAdminPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="neu-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="neu-btn"
                  onClick={() => setIsSuperAdminModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="neu-btn-primary"
                >
                  {isCreating ? 'Guardando...' : 'Crear Super Admin 👑'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
