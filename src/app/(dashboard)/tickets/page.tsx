'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

interface TicketItem {
  ticket: {
    id: string;
    ticketNumber: string;
    category: string;
    priority: string;
    status: string;
    description: string;
    assignedTechnician: string | null;
    internalNotes: string | null;
    createdAt: string;
  };
  subscriber: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
  } | null;
}

export default function TicketsPage() {
  const [ticketList, setTicketList] = useState<TicketItem[]>([]);
  const [subscribers, setSubscribers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { addToast } = useToast();

  // Edit State
  const [editStatus, setEditStatus] = useState('open');
  const [editTech, setEditTech] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Create State
  const [newSubId, setNewSubId] = useState('');
  const [newCategory, setNewCategory] = useState('no_service');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDescription, setNewDescription] = useState('');

  const fetchTickets = async () => {
    try {
      const url = statusFilter ? `/api/tickets?status=${statusFilter}` : '/api/tickets';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setTicketList(json.data);
      }
    } catch {
      addToast('Error al cargar tickets de soporte', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const res = await fetch('/api/subscribers');
      const json = await res.json();
      if (json.success) {
        setSubscribers(json.data);
        if (json.data.length > 0) setNewSubId(json.data[0].id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchSubscribers();
  }, [statusFilter]);

  const handleOpenEditModal = (item: TicketItem) => {
    setSelectedTicket(item);
    setEditStatus(item.ticket.status);
    setEditTech(item.ticket.assignedTechnician || '');
    setEditNotes(item.ticket.internalNotes || '');
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          assignedTechnician: editTech || undefined,
          internalNotes: editNotes || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al actualizar ticket');

      addToast(`Ticket ${selectedTicket.ticket.ticketNumber} actualizado (Notificación enviada)`, 'success');
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubId || !newDescription.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: newSubId,
          category: newCategory,
          priority: newPriority,
          description: newDescription,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al crear ticket');

      addToast(`Ticket ${json.data.ticketNumber} creado exitosamente`, 'success');
      setIsCreateModalOpen(false);
      setNewDescription('');
      fetchTickets();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openCount = ticketList.filter((t) => t.ticket.status === 'open').length;
  const inProgressCount = ticketList.filter((t) => t.ticket.status === 'in_progress').length;
  const resolvedCount = ticketList.filter((t) => t.ticket.status === 'resolved').length;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'open': return <span className="badge badge-warning">● Abierto</span>;
      case 'in_progress': return <span className="badge badge-info">⚙️ En Proceso</span>;
      case 'resolved': return <span className="badge badge-success">✓ Resuelto</span>;
      case 'closed': return <span className="badge badge-secondary">🔒 Cerrado</span>;
      default: return <span className="badge">{st}</span>;
    }
  };

  const getPriorityBadge = (pr: string) => {
    switch (pr) {
      case 'critical': return <span style={{ color: '#b91c1c', fontWeight: 800, fontSize: '0.75rem' }}>🔥 Crítica</span>;
      case 'high': return <span style={{ color: '#c2410c', fontWeight: 700, fontSize: '0.75rem' }}>⚠️ Alta</span>;
      case 'medium': return <span style={{ color: '#0284c7', fontWeight: 600, fontSize: '0.75rem' }}>🟡 Media</span>;
      default: return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>🟢 Baja</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
            Tickets de Soporte & Averías
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
            Atención de incidencias de red, asignación a técnicos de campo y avisos por WhatsApp
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <span>🎫</span> Crear Ticket Manual
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="kpi-card-accent">
          <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>TICKETS ABIERTOS</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.4rem 0 0.25rem 0' }}>{openCount}</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Averías urgentes pendientes de atención</div>
        </div>

        <div className="kpi-card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>EN PROCESO</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--primary-accent)', margin: '0.4rem 0 0.25rem 0' }}>{inProgressCount}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Técnicos asignados en campo</div>
        </div>

        <div className="kpi-card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>RESUELTOS</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#10b981', margin: '0.4rem 0 0.25rem 0' }}>{resolvedCount}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Solucionados hoy</div>
        </div>
      </div>

      {/* Main List Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            style={{ border: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', backgroundColor: statusFilter === '' ? '#ffffff' : 'transparent', color: statusFilter === '' ? '#0f172a' : '#64748b', boxShadow: statusFilter === '' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}
            onClick={() => setStatusFilter('')}
          >
            Todos ({ticketList.length})
          </button>
          <button
            style={{ border: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', backgroundColor: statusFilter === 'open' ? '#ffffff' : 'transparent', color: statusFilter === 'open' ? '#0f172a' : '#64748b', boxShadow: statusFilter === 'open' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}
            onClick={() => setStatusFilter('open')}
          >
            Abiertos ({openCount})
          </button>
          <button
            style={{ border: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', backgroundColor: statusFilter === 'in_progress' ? '#ffffff' : 'transparent', color: statusFilter === 'in_progress' ? '#0f172a' : '#64748b', boxShadow: statusFilter === 'in_progress' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}
            onClick={() => setStatusFilter('in_progress')}
          >
            En Proceso ({inProgressCount})
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando tickets...</div>
        ) : ticketList.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎫</div>
            <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>No hay tickets de soporte reportados.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Ticket #</th>
                  <th style={{ padding: '12px 16px' }}>Abonado</th>
                  <th style={{ padding: '12px 16px' }}>Descripción de Avería</th>
                  <th style={{ padding: '12px 16px' }}>Prioridad</th>
                  <th style={{ padding: '12px 16px' }}>Estado</th>
                  <th style={{ padding: '12px 16px' }}>Técnico Asignado</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ticketList.map((item) => (
                  <tr key={item.ticket.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--primary-accent)' }}>{item.ticket.ticketNumber}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.subscriber?.name || 'Abonado no registrado'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.subscriber?.phone}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', maxWidth: '240px' }}>{item.ticket.description}</td>
                    <td style={{ padding: '14px 16px' }}>{getPriorityBadge(item.ticket.priority)}</td>
                    <td style={{ padding: '14px 16px' }}>{getStatusBadge(item.ticket.status)}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-main)', fontWeight: 600 }}>
                      {item.ticket.assignedTechnician ? `👷 ${item.ticket.assignedTechnician}` : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Sin asignar</span>}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--primary-accent)', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => handleOpenEditModal(item)}
                      >
                        Gestionar / Asignar →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Editar / Asignar Ticket */}
      {selectedTicket && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ backgroundColor: 'var(--bg-card)', width: '90%', maxWidth: '520px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Gestionar Ticket {selectedTicket.ticket.ticketNumber}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Cliente: <strong>{selectedTicket.subscriber?.name}</strong> ({selectedTicket.subscriber?.phone})
            </p>

            <form onSubmit={handleUpdateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Estado del Ticket
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                >
                  <option value="open">Abierto (Pendiente)</option>
                  <option value="in_progress">En Proceso (Técnico Asignado)</option>
                  <option value="resolved">Resuelto (Atendido)</option>
                  <option value="closed">Cerrado</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Técnico de Campo Asignado
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez (Nivel 2)"
                  value={editTech}
                  onChange={(e) => setEditTech(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Notas Internas de Soporte
                </label>
                <textarea
                  rows={3}
                  placeholder="Instrucciones para la visita en terreno o resolución..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  style={{ backgroundColor: 'var(--bg-main)', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setSelectedTicket(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar & Avisar por WhatsApp 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Ticket */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ backgroundColor: 'var(--bg-card)', width: '90%', maxWidth: '520px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>
              Crear Ticket de Soporte
            </h2>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Abonado
                </label>
                <select
                  value={newSubId}
                  onChange={(e) => setNewSubId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                >
                  {subscribers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Categoría
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                  >
                    <option value="no_service">Sin Servicio</option>
                    <option value="slow_internet">Lentitud</option>
                    <option value="wifi_password">Cambio de Clave WiFi</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Prioridad
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Descripción del Problema
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalle de la avería reportada..."
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  style={{ backgroundColor: 'var(--bg-main)', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Creando...' : 'Generar Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
