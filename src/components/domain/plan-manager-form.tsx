'use client';

import React, { useState } from 'react';

export interface ServicePlanItem {
  id: string;
  name: string;
  price: string;
  speedDown: string | null;
  speedUp: string | null;
  isActive: boolean;
}

interface PlanManagerFormProps {
  initialPlans: ServicePlanItem[];
}

export function PlanManagerForm({ initialPlans }: PlanManagerFormProps) {
  const [plans, setPlans] = useState<ServicePlanItem[]>(initialPlans);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [speedDown, setSpeedDown] = useState('');
  const [speedUp, setSpeedUp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price,
          speedDown: speedDown || '100 Mbps',
          speedUp: speedUp || '50 Mbps',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al crear plan');

      setPlans([json.data, ...plans]);
      setName('');
      setPrice('');
      setSpeedDown('');
      setSpeedUp('');
      setMessage('✅ Plan de internet creado exitosamente.');
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (planId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setPlans(plans.map((p) => (p.id === planId ? { ...p, isActive: json.data.isActive } : p)));
      }
    } catch (err) {
      console.error('Error toggling plan status:', err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
      {/* Create Plan Form */}
      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem 0' }}>
          ➕ Crear Nuevo Plan de Internet
        </h3>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              Nombre Comercial del Plan
            </label>
            <input
              type="text"
              placeholder="Ej: Fibra 300 Mbps Gamer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              Valor Tarifa Mensual ($)
            </label>
            <input
              type="number"
              placeholder="Ej: 29990"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                Ancho Bajada
              </label>
              <input
                type="text"
                placeholder="Ej: 300 Mbps"
                value={speedDown}
                onChange={(e) => setSpeedDown(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                Ancho Subida
              </label>
              <input
                type="text"
                placeholder="Ej: 150 Mbps"
                value={speedUp}
                onChange={(e) => setSpeedUp(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
            {isSubmitting ? 'Guardando...' : '🚀 Guardar Plan de Internet'}
          </button>
        </form>

        {message && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: '#f8fafc', fontSize: '0.85rem', fontWeight: 500 }}>
            {message}
          </div>
        )}
      </div>

      {/* Plans List Table */}
      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem 0' }}>
          📋 Tarifario Activo del ISP ({plans.length})
        </h3>

        {plans.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay planes registrados aún.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {plans.map((p) => (
              <div
                key={p.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{p.name}</strong>
                    <span className={p.isActive ? 'badge badge-success' : 'badge badge-danger'}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#64748b' }}>
                    <span>⬇️ Bajada: <strong>{p.speedDown || '100 Mbps'}</strong></span>
                    <span>⬆️ Subida: <strong>{p.speedUp || '50 Mbps'}</strong></span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>
                    ${Number(p.price).toLocaleString('es-CL')}
                  </div>
                  <button
                    onClick={() => handleToggle(p.id, p.isActive)}
                    style={{
                      marginTop: '0.25rem',
                      background: 'none',
                      border: 'none',
                      color: p.isActive ? '#b91c1c' : '#2563eb',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {p.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
