'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

interface RouterItem {
  id: string;
  name: string;
  host: string;
  apiPort: number;
  username: string;
  isActive: boolean;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  command: string;
  responseStatus: number;
  createdAt: string;
}

export default function RoutersPage() {
  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [apiPort, setApiPort] = useState('443');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRouters = async () => {
    try {
      const res = await fetch('/api/routers');
      const json = await res.json();
      if (json.success) {
        setRouters(json.data);
      }
    } catch {
      addToast('Error al cargar la lista de routers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/routers/audit-logs');
      const json = await res.json();
      if (json.success) {
        setAuditLogs(json.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchRouters();
    fetchAuditLogs();
  }, []);

  const handleTestConnection = async (routerId: string) => {
    setTestingId(routerId);
    try {
      const res = await fetch(`/api/routers/${routerId}/test`, { method: 'POST' });
      const json = await res.json();

      if (json.success && json.data.success) {
        addToast(`Conexión REST exitosa con MikroTik (${json.data.status} OK)`, 'success');
      } else {
        addToast(`Prueba de conexión finalizada con respuesta (${json.data?.status || 500})`, 'info');
      }
      fetchAuditLogs();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateRouter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/routers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          host,
          apiPort: Number(apiPort),
          username,
          password,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al guardar router');

      addToast(`Router ${name} registrado y clave cifrada con AES-256-GCM`, 'success');
      setIsModalOpen(false);
      setName('');
      setHost('');
      setPassword('');
      fetchRouters();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
            Routers MikroTik & Automatización de Red
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
            Integración API REST para corte y reconexión automática con cifrado AES-256-GCM
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <span>⚙️</span> Registrar Router MikroTik
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>ROUTERS CONECTADOS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.5rem 0 0.25rem 0' }}>{routers.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Infraestructura registrada</div>
        </div>

        <div className="kpi-card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>AUDITORÍA DE RED</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-accent)', margin: '0.5rem 0 0.25rem 0' }}>{auditLogs.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Comandos REST ejecutados</div>
        </div>
      </div>

      {/* Routers List Table */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
          🖥️ Routers MikroTik Configurados
        </h2>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando routers...</div>
        ) : routers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚙️</div>
            <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>No se han configurado routers MikroTik aún.</p>
            <p style={{ fontSize: '0.85rem' }}>Registra tu primer MikroTik para habilitar el corte y reconexión automática.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Nombre del Router</th>
                  <th style={{ padding: '12px 16px' }}>Host / Dirección IP</th>
                  <th style={{ padding: '12px 16px' }}>Puerto REST</th>
                  <th style={{ padding: '12px 16px' }}>Usuario API</th>
                  <th style={{ padding: '12px 16px' }}>Seguridad</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {routers.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>{r.name}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--primary-accent)', fontWeight: 600 }}><code>{r.host}</code></td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{r.apiPort}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{r.username}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-success">🔒 AES-256-GCM</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => handleTestConnection(r.id)}
                        disabled={testingId === r.id}
                      >
                        {testingId === r.id ? 'Probando...' : '⚡ Probar Conexión'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
          📜 Log de Auditoría de Comandos de Red (`router_audit_logs`)
        </h2>

        {auditLogs.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No hay comandos de red registrados recientemente.
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                  <th style={{ padding: '10px 14px' }}>Acción</th>
                  <th style={{ padding: '10px 14px' }}>Comando REST Ejecutado</th>
                  <th style={{ padding: '10px 14px' }}>Respuesta</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                      {log.action === 'suspend' ? (
                        <span style={{ color: '#b91c1c' }}>🔴 CORTE</span>
                      ) : log.action === 'reactivate' ? (
                        <span style={{ color: '#16a34a' }}>🟢 RECONEXIÓN</span>
                      ) : (
                        <span style={{ color: 'var(--primary-accent)' }}>⚡ TEST</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}><code>{log.command}</code></td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge ${log.responseStatus === 200 ? 'badge-success' : 'badge-danger'}`}>
                        {log.responseStatus} OK
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Router */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ backgroundColor: 'var(--bg-card)', width: '90%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>
              Registrar Router MikroTik
            </h2>

            <form onSubmit={handleCreateRouter} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Nombre Identificador
                </label>
                <input
                  type="text"
                  placeholder="Ej: Core Principal CCR2004"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Dirección IP / Host
                  </label>
                  <input
                    type="text"
                    placeholder="192.168.88.1"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Puerto REST
                  </label>
                  <input
                    type="number"
                    placeholder="443"
                    required
                    value={apiPort}
                    onChange={(e) => setApiPort(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Usuario API
                  </label>
                  <input
                    type="text"
                    placeholder="admin"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Contraseña / Token
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  {isSubmitting ? 'Guardando...' : 'Guardar Router (Cifrado GCM)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
