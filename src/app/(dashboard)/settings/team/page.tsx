'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { UserRole } from '@/lib/rbac';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('billing');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/team');
      const json = await res.json();
      if (json.success) {
        setMembers(json.data);
      }
    } catch {
      addToast('Error al cargar la lista de miembros del equipo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al invitar integrante');

      addToast(`Miembro ${name} invitado con rol ${role.toUpperCase()}`, 'success');
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setRole('billing');
      fetchMembers();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: UserRole) => {
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error('Error al actualizar rol');

      addToast(`Rol de ${member.name} actualizado a ${newRole.toUpperCase()}`, 'info');
      fetchMembers();
    } catch (err) {
      addToast((err as Error).message, 'error');
    }
  };

  const handleToggleStatus = async (member: TeamMember) => {
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !member.isActive }),
      });

      if (!res.ok) throw new Error('Error al cambiar acceso del miembro');

      addToast(`Acceso de ${member.name} ${!member.isActive ? 'habilitado' : 'deshabilitado'}`, 'info');
      fetchMembers();
    } catch (err) {
      addToast((err as Error).message, 'error');
    }
  };

  const adminCount = members.filter((m) => m.role === 'admin').length;
  const billingCount = members.filter((m) => m.role === 'billing').length;
  const techCount = members.filter((m) => m.role === 'technician').length;

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'admin': return <span className="badge badge-success">👑 Administrador</span>;
      case 'billing': return <span className="badge badge-info">💳 Cobranzas / Cajero</span>;
      case 'technician': return <span className="badge badge-warning">👷 Técnico de Campo</span>;
      default: return <span className="badge">{r}</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
            Equipo & Control de Acceso (RBAC)
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
            Gestión de usuarios del tenant con permisos diferenciados para Administradores, Cobranzas y Técnicos
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <span>👥</span> Invitar Integrante
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>TOTAL EQUIPO</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.5rem 0 0.25rem 0' }}>{members.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Usuarios activos en tenant</div>
        </div>

        <div className="kpi-card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>ADMINISTRADORES</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a', margin: '0.5rem 0 0.25rem 0' }}>{adminCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Acceso irrestricto</div>
        </div>

        <div className="kpi-card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>COBRANZAS / CAJEROS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-accent)', margin: '0.5rem 0 0.25rem 0' }}>{billingCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Abonados e Inbox Chat</div>
        </div>

        <div className="kpi-card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>TÉCNICOS DE CAMPO</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706', margin: '0.5rem 0 0.25rem 0' }}>{techCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Módulo de Tickets</div>
        </div>
      </div>

      {/* Team List Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando equipo...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
            <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>No hay otros usuarios invitados en el equipo.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Nombre</th>
                  <th style={{ padding: '12px 16px' }}>Email</th>
                  <th style={{ padding: '12px 16px' }}>Rol Asignado</th>
                  <th style={{ padding: '12px 16px' }}>Cambiar Rol</th>
                  <th style={{ padding: '12px 16px' }}>Estado</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>{m.name}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{m.email}</td>
                    <td style={{ padding: '14px 16px' }}>{getRoleBadge(m.role)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m, e.target.value as UserRole)}
                        style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }}
                      >
                        <option value="admin">Administrador</option>
                        <option value="billing">Cobranzas / Cajero</option>
                        <option value="technician">Técnico de Campo</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${m.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {m.isActive ? '● Habilitado' : '○ Suspendido'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        style={{
                          backgroundColor: m.isActive ? '#fee2e2' : '#dcfce7',
                          color: m.isActive ? '#b91c1c' : '#15803d',
                          border: 'none',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleToggleStatus(m)}
                      >
                        {m.isActive ? 'Revocar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Invitar Miembro */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ backgroundColor: 'var(--bg-card)', width: '90%', maxWidth: '480px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>
              Invitar Integrante al Equipo
            </h2>

            <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="juan.perez@isp.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Rol & Nivel de Permisos
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                >
                  <option value="billing">Cobranzas / Cajero (Abonados, Pagos e Inbox)</option>
                  <option value="technician">Técnico de Campo (Acceso exclusivo a Tickets)</option>
                  <option value="admin">Administrador (Acceso Total)</option>
                </select>
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
                  {isSubmitting ? 'Enviando...' : 'Invitar Integrante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
