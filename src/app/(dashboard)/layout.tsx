'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ToastProvider } from '@/components/ui/toast-provider';
import { ThemeProvider, ThemeToggle } from '@/components/ui/theme-provider';

interface UserSession {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  organizationId: string;
  organizationName: string;
  organizationStatus: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch((err) => console.error('[LAYOUT AUTH ME ERROR]:', err))
      .finally(() => setLoadingUser(false));
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return '👑 Super Admin';
      case 'admin':
        return '👑 Admin ISP';
      case 'tech':
        return '🔧 Técnico';
      case 'operator':
        return '💬 Operador';
      default:
        return '👤 Usuario';
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[LOGOUT ERROR]:', err);
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="dashboard-layout">
          {/* Mobile Hamburger Toggle */}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          {/* Mobile Overlay */}
          <div
            className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />

          {/* Single Floating Container Panel Sidebar (rounded-3xl) */}
          <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div>
              {/* User Avatar + Admin Name + Brand Logo Side-by-Side */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#818CF8',
                    color: '#18181B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.05rem',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(129, 140, 248, 0.3)',
                  }}
                >
                  {loadingUser ? '...' : getInitials(user?.userName)}
                </div>

                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {loadingUser ? 'Cargando...' : user?.userName || 'Usuario'}
                    </h2>
                    <img
                      src="/logotoi.webp"
                      alt="SaaS TOI Logo"
                      className="logo-animated-glow"
                      style={{ height: '26px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                    />
                  </div>

                  <span style={{ fontSize: '0.72rem', color: '#818CF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {loadingUser ? '...' : getRoleBadge(user?.role)}
                  </span>
                </div>
              </div>

              {/* Quick Search */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div
                  className="glass-input-auto"
                  style={{
                    borderRadius: '9999px',
                    padding: '0.55rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar abonado, ID..."
                    style={{
                      background: 'none',
                      border: 'none',
                      boxShadow: 'none',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      padding: 0,
                    }}
                  />
                </div>
              </div>

              {/* Navigation Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                    Gestión de Cartera
                  </div>
                  <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <Link href="/subscribers" className={`nav-item ${isActive('/subscribers') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>📋</span> Abonados
                    </Link>
                    <Link href="/subscribers/import" className={`nav-item ${isActive('/subscribers/import') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>📥</span> Importar CSV
                    </Link>
                    <Link href="/settings/plans" className={`nav-item ${isActive('/settings/plans') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>📶</span> Planes de Internet
                    </Link>
                    <Link href="/tickets" className={`nav-item ${isActive('/tickets') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>🎫</span> Tickets & Averías
                    </Link>
                    <Link href="/settings/routers" className={`nav-item ${isActive('/settings/routers') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>⚙️</span> Routers MikroTik
                    </Link>
                    <Link href="/settings/team" className={`nav-item ${isActive('/settings/team') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>👥</span> Equipo & RBAC
                    </Link>
                    <Link href="/settings/billing" className={`nav-item ${isActive('/settings/billing') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>💳</span> Suscripción SaaS
                    </Link>
                    {user?.role === 'super_admin' && (
                      <Link href="/super-admin/tenants" className={`nav-item ${isActive('/super-admin/tenants') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span>👑</span> Super Admin Tenants
                      </Link>
                    )}
                  </nav>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                    Canales & WhatsApp
                  </div>
                  <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <Link href="/agent" className={`nav-item ${isActive('/agent') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>🤖</span> Agente de IA
                    </Link>
                    <Link href="/chat" className={`nav-item ${isActive('/chat') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>💬</span> Inbox Multi-Agente
                    </Link>
                    <Link href="/whatsapp" className={`nav-item ${isActive('/whatsapp') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>⚙️</span> Conexión WABA
                    </Link>
                    <Link href="/messaging" className={`nav-item ${isActive('/messaging') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>📣</span> Recordatorios
                    </Link>
                  </nav>
                </div>
              </div>
            </div>

            {/* Sidebar Footer User Info & Logout Button */}
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div
                className="glass-auto"
                style={{
                  borderRadius: '16px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {loadingUser ? 'Cargando ISP...' : user?.organizationName || 'Mi Organización ISP'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {user?.role === 'super_admin' ? 'Super Admin SaaS' : 'Organización Activa'}
                  </div>
                </div>

                <Link href="/onboarding" style={{ color: 'var(--primary-accent)', fontSize: '1.1rem', textDecoration: 'none' }} title="Asistente de Inicio">
                  ⚙️
                </Link>
              </div>

              {/* Botón de Cerrar Sesión en Sidebar */}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  color: '#F87171',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.18)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                }}
              >
                <span>🚪</span>
                <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="dashboard-main">
            {/* Top Header Bar */}
            <header className="dashboard-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ISP Workspace</span>
                <span style={{ color: 'var(--border-color)' }}>/</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {loadingUser ? 'Dashboard Insights' : `${user?.organizationName || 'Dashboard'}`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <ThemeToggle />
                <div className="glass-badge glass-badge-success" style={{ padding: '0.35rem 0.85rem', fontWeight: 600, fontSize: '0.8rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor', display: 'inline-block' }}></span>
                  <span className="header-breadcrumb-extra">Database</span> Connected
                </div>

                {/* Direct Logout Button in Top Header */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Cerrar Sesión e Ir a la Landing Page"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#F87171',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  }}
                >
                  <span>🚪</span>
                  <span>{loggingOut ? 'Salir...' : 'Salir'}</span>
                </button>
              </div>
            </header>

            {/* Dynamic Page Viewport */}
            <main className="dashboard-content">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
