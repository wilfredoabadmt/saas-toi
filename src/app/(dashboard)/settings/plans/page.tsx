'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

interface ServicePlan {
  id: string;
  name: string;
  price: string;
  speedDown: string;
  speedUp: string;
  isActive: boolean;
}

export default function ServicePlansPage() {
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [speedDown, setSpeedDown] = useState('');
  const [speedUp, setSpeedUp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      const json = await res.json();
      if (json.success) {
        setPlans(json.data);
      }
    } catch {
      addToast('Error al cargar planes de internet', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, speedDown, speedUp }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al crear el plan');

      addToast(`Plan ${name} creado exitosamente`, 'success');
      setName('');
      setPrice('');
      setSpeedDown('');
      setSpeedUp('');
      setIsModalOpen(false);
      fetchPlans();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (plan: ServicePlan) => {
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });

      if (!res.ok) throw new Error('Error al actualizar estado del plan');

      addToast(`Plan ${plan.name} ${!plan.isActive ? 'activado' : 'desactivado'}`, 'info');
      fetchPlans();
    } catch (err) {
      addToast((err as Error).message, 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
            Planes de Internet & Tarifas
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
            Configuración comercial de planes de conectividad y velocidades Mbps por tenant
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <span>➕</span> Nuevo Plan de Internet
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>PLANES CONFIGURADOS</span>
            <span className="badge badge-success">Activos</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.5rem 0 0.25rem 0' }}>
            {plans.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Planes comerciales en oferta</div>
        </div>
      </div>

      {/* Plans List Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando planes...</div>
        ) : plans.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📶</div>
            <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>No se han configurado planes de internet aún.</p>
            <p style={{ fontSize: '0.85rem' }}>Crea el primer plan para asociarlo a los abonados de tu ISP.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Nombre del Plan</th>
                  <th style={{ padding: '12px 16px' }}>Velocidad (Bajada / Subida)</th>
                  <th style={{ padding: '12px 16px' }}>Tarifa Mensual</th>
                  <th style={{ padding: '12px 16px' }}>Estado Comercial</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>{plan.name}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                      ⚡ {plan.speedDown} / ⬆️ {plan.speedUp}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>${plan.price}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${plan.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {plan.isActive ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        style={{
                          backgroundColor: plan.isActive ? '#fee2e2' : '#dcfce7',
                          color: plan.isActive ? '#b91c1c' : '#15803d',
                          border: 'none',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleToggleStatus(plan)}
                      >
                        {plan.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Plan */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ backgroundColor: 'var(--bg-card)', width: '90%', maxWidth: '480px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>
              Nuevo Plan de Internet
            </h2>

            <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Nombre del Plan
                </label>
                <input
                  type="text"
                  placeholder="Ej: Fibra 200 Mbps Hogar"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Precio Mensual ($)
                </label>
                <input
                  type="text"
                  placeholder="25000.00"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Velocidad Bajada
                  </label>
                  <input
                    type="text"
                    placeholder="200 Mbps"
                    required
                    value={speedDown}
                    onChange={(e) => setSpeedDown(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Velocidad Subida
                  </label>
                  <input
                    type="text"
                    placeholder="100 Mbps"
                    required
                    value={speedUp}
                    onChange={(e) => setSpeedUp(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  style={{ backgroundColor: 'var(--bg-main)', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Crear Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
