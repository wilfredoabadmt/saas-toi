'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export interface SubscriberItem {
  id: string;
  name: string;
  phone: string;
  monthlyAmount: string;
  dueDate: string;
  paymentStatus: 'current' | 'due_soon' | 'overdue' | string;
  status: string;
  email?: string | null;
  servicePlanId?: string | null;
  address?: string | null;
  notes?: string | null;
}

interface PlanItem {
  id: string;
  name: string;
  price: string;
}

interface SubscriberTableProps {
  subscribers: SubscriberItem[];
  isLoading?: boolean;
}

export function SubscriberTable({ subscribers: initialSubscribers, isLoading: initialLoading }: SubscriberTableProps) {
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>(initialSubscribers);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubscriberItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [servicePlanId, setServicePlanId] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync initial subscribers
  useEffect(() => {
    setSubscribers(initialSubscribers);
  }, [initialSubscribers]);

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/plans');
        const json = await res.json();
        if (json.success) {
          setPlans(json.data);
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      }
    };
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setName('');
    setPhone('+569'); // standard default format placeholder
    setEmail('');
    setServicePlanId(plans[0]?.id || '');
    setMonthlyAmount(plans[0]?.price || '25000');
    // Default due date: 5 days from now in YYYY-MM-DD
    const date = new Date();
    date.setDate(date.getDate() + 5);
    setDueDate(date.toISOString().split('T')[0] || '');
    setAddress('');
    setNotes('');
    setIsCreateOpen(true);
  };

  const openEditModal = (sub: SubscriberItem) => {
    setSelectedSub(sub);
    setName(sub.name);
    setPhone(sub.phone);
    setEmail(sub.email || '');
    setServicePlanId(sub.servicePlanId || '');
    setMonthlyAmount(sub.monthlyAmount);
    setDueDate(sub.dueDate);
    setAddress(sub.address || '');
    setNotes(sub.notes || '');
    setIsEditOpen(true);
  };

  const handlePlanChange = (planId: string) => {
    setServicePlanId(planId);
    const selectedPlan = plans.find((p) => p.id === planId);
    if (selectedPlan) {
      setMonthlyAmount(String(Number(selectedPlan.price)));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !monthlyAmount || !dueDate) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          servicePlanId: servicePlanId || undefined,
          monthlyAmount: Number(monthlyAmount),
          dueDate,
          address: address || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al crear abonado');

      // Refresh list
      setSubscribers([json.data, ...subscribers]);
      setIsCreateOpen(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !name || !phone || !monthlyAmount || !dueDate) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/subscribers/${selectedSub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email: email || '',
          servicePlanId: servicePlanId || '',
          monthlyAmount: Number(monthlyAmount),
          dueDate,
          address: address || '',
          notes: notes || '',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al actualizar abonado');

      setSubscribers(subscribers.map((s) => (s.id === selectedSub.id ? json.data : s)));
      setIsEditOpen(false);
      setSelectedSub(null);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este abonado? Se realizará un borrado lógico.')) return;

    try {
      const res = await fetch(`/api/subscribers/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al eliminar abonado');

      setSubscribers(subscribers.filter((s) => s.id !== id));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (initialLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando abonados...</div>;
  }

  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'current' && sub.paymentStatus === 'current') ||
      (filter === 'due_soon' && sub.paymentStatus === 'due_soon') ||
      (filter === 'overdue' && sub.paymentStatus === 'overdue');

    const matchesSearch =
      sub.name.toLowerCase().includes(search.toLowerCase()) ||
      sub.phone.includes(search);

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <span className="badge badge-success">● Al día</span>;
      case 'due_soon':
        return <span className="badge badge-warning">● Por vencer</span>;
      case 'overdue':
        return <span className="badge badge-danger">● Vencido</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button className="btn-primary" onClick={openCreateModal}>
          ➕ Registrar Abonado Nuevo
        </button>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {/* Table Filter & Search Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: 'var(--bg-main)', padding: '0.35rem', borderRadius: 'var(--radius-xl)' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                border: 'none',
                padding: '0.45rem 0.95rem',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: filter === 'all' ? 'var(--primary-accent)' : 'transparent',
                color: filter === 'all' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: filter === 'all' ? 'var(--shadow-button)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Todos ({subscribers.length})
            </button>
            <button
              onClick={() => setFilter('current')}
              style={{
                border: 'none',
                padding: '0.45rem 0.95rem',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: filter === 'current' ? 'var(--primary-accent)' : 'transparent',
                color: filter === 'current' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: filter === 'current' ? 'var(--shadow-button)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Al día ({subscribers.filter((s) => s.paymentStatus === 'current').length})
            </button>
            <button
              onClick={() => setFilter('due_soon')}
              style={{
                border: 'none',
                padding: '0.45rem 0.95rem',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: filter === 'due_soon' ? 'var(--primary-accent)' : 'transparent',
                color: filter === 'due_soon' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: filter === 'due_soon' ? 'var(--shadow-button)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Por Vencer ({subscribers.filter((s) => s.paymentStatus === 'due_soon').length})
            </button>
            <button
              onClick={() => setFilter('overdue')}
              style={{
                border: 'none',
                padding: '0.45rem 0.95rem',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: filter === 'overdue' ? 'var(--primary-accent)' : 'transparent',
                color: filter === 'overdue' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: filter === 'overdue' ? 'var(--shadow-button)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Vencidos ({subscribers.filter((s) => s.paymentStatus === 'overdue').length})
            </button>
          </div>

          {/* Search input inside table */}
          <div style={{ flex: 1, maxWidth: '280px' }}>
            <input
              type="text"
              placeholder="Filtrar por nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.95rem',
                borderRadius: 'var(--radius-xl)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>

        {/* Table Data */}
        {filteredSubscribers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <p style={{ fontWeight: 500 }}>No se encontraron abonados con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Abonado</th>
                  <th style={{ padding: '12px 16px' }}>Teléfono WhatsApp</th>
                  <th style={{ padding: '12px 16px' }}>Monto Mensual</th>
                  <th style={{ padding: '12px 16px' }}>Fecha Vencimiento</th>
                  <th style={{ padding: '12px 16px' }}>Estado Cobranza</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-main)' }}>{sub.name}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{sub.phone}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-main)' }}>${sub.monthlyAmount}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{sub.dueDate}</td>
                    <td style={{ padding: '14px 16px' }}>{getStatusBadge(sub.paymentStatus)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Link
                        href={`/subscribers/${sub.id}`}
                        style={{
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--primary-accent)',
                          padding: '0.35rem 0.6rem',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        Expediente
                      </Link>
                      <button
                        onClick={() => openEditModal(sub)}
                        style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          padding: '0.35rem 0.6rem',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          padding: '0.35rem 0.6rem',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ backgroundColor: 'var(--bg-card)', width: '90%', maxWidth: '520px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>
              Registrar Nuevo Abonado
            </h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Nombre Completo</label>
                  <input type="text" placeholder="Ej: Carlos Silva" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Teléfono (E.164)</label>
                  <input type="text" placeholder="+56912345678" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Email (Opcional)</label>
                  <input type="email" placeholder="carlos@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Plan de Internet</label>
                  <select value={servicePlanId} onChange={(e) => handlePlanChange(e.target.value)}>
                    <option value="">-- Sin Plan --</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} - ${Number(p.price).toLocaleString()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tarifa Mensual ($)</label>
                  <input type="number" placeholder="25000" required value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Fecha de Vencimiento</label>
                  <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Dirección (Opcional)</label>
                <input type="text" placeholder="Calle Falsa 123" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Notas Internas (Opcional)</label>
                <textarea rows={2} placeholder="Notas del cliente..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" style={{ backgroundColor: 'var(--bg-main)', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsCreateOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar Abonado'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedSub && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ backgroundColor: 'var(--bg-card)', width: '90%', maxWidth: '520px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>
              Editar Abonado: {selectedSub.name}
            </h2>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Nombre Completo</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Teléfono (E.164)</label>
                  <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Plan de Internet</label>
                  <select value={servicePlanId} onChange={(e) => handlePlanChange(e.target.value)}>
                    <option value="">-- Sin Plan --</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} - ${Number(p.price).toLocaleString()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tarifa Mensual ($)</label>
                  <input type="number" required value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Fecha de Vencimiento</label>
                  <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Dirección</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Notas Internas</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" style={{ backgroundColor: 'var(--bg-main)', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsEditOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
