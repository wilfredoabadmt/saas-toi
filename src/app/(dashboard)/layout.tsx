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

  const navItems = [
    { name: 'Abonados', href: '/subscribers', icon: '📋' },
    { name: 'Importar CSV', href: '/subscribers/import', icon: '📥' },
    { name: 'Planes', href: '/settings/plans', icon: '📶' },
    { name: 'Tickets', href: '/tickets', icon: '🎫' },
    { name: 'Routers', href: '/settings/routers', icon: '⚙️' },
    { name: 'Equipo', href: '/settings/team', icon: '👥' },
    { name: 'Suscripción', href: '/settings/billing', icon: '💳' },
    ...(user?.role === 'super_admin' ? [{ name: 'Tenants', href: '/super-admin/tenants', icon: '👑' }] : []),
    { name: 'Agente IA', href: '/agent', icon: '🤖' },
    { name: 'Inbox', href: '/chat', icon: '💬' },
    { name: 'WhatsApp', href: '/whatsapp', icon: '⚙️' },
    { name: 'Avisos', href: '/messaging', icon: '📣' },
  ];

  const filteredNav = navItems;

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="dashboard-layout">
          {/* Mobile Overlay */}
          <div
            className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />

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

                  <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: '#818CF8', fontWeight: 700, textTransform: 'uppercase' }}>
                    {loadingUser ? '...' : getRoleBadge(user?.role)}
                  </div>
                </div>
              </div>

              {/* Search input in sidebar */}
              <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Buscar abonado, IP..."
                  className="glass-input-dark"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                    fontSize: '0.8rem',
                    borderRadius: '10px',
                  }}
                />
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  🔍
                </span>
              </div>

              {/* Navigation Section: CARTERA DE CLIENTES */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', paddingLeft: '0.5rem' }}>
                  Gestión de Cartera
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {filteredNav.slice(0, 7).map((item) => {
                    const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`nav-item ${active ? 'active' : ''}`}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Navigation Section: CANALES & AUTOMATIZACIÓN */}
              {filteredNav.length > 7 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', paddingLeft: '0.5rem' }}>
                    Canales & WhatsApp
                  </div>
                  <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {filteredNav.slice(7).map((item) => {
                      const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`nav-item ${active ? 'active' : ''}`}
                        >
                          <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              )}
            </div>

            {/* Bottom Section: Active Tenant Organization Info */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {loadingUser ? 'Cargando...' : user?.organizationName || 'Empresa ISP'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {user?.role === 'super_admin' ? 'Super Admin SaaS' : 'Organización Activa'}
                  </div>
                </div>
              </div>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', minWidth: 0 }}>
                {/* Mobile Drawer Hamburger Button */}
                <button
                  className="sidebar-toggle touch-target"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label="Abrir Menú"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'var(--text-main)',
                    borderRadius: '10px',
                    padding: '0.35rem 0.5rem',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  ☰
                </button>

                <span className="hide-on-mobile" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>ISP Workspace</span>
                <span className="hide-on-mobile" style={{ color: 'var(--border-color)' }}>/</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                  {loadingUser ? 'Dashboard' : `${user?.organizationName || 'Dashboard'}`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <ThemeToggle />
                <div className="glass-badge glass-badge-success hide-on-mobile" style={{ padding: '0.35rem 0.75rem', fontWeight: 600, fontSize: '0.78rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor', display: 'inline-block' }}></span>
                  Connected
                </div>

                {/* Direct Logout Button in Top Header */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Cerrar Sesión e Ir a la Landing Page"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#F87171',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>🚪</span>
                  <span>{loggingOut ? 'Salir...' : 'Salir'}</span>
                </button>
              </div>
            </header>

            {/* Persistent Subscription Alert Banner when expired */}
            {user?.organizationStatus === 'expired' && (
              <div
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  borderRadius: '16px',
                  padding: '0.85rem 1.25rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>⌛</span>
                  <div>
                    <div style={{ fontWeight: 800, color: '#fb7185', fontSize: '0.88rem' }}>
                      Tu período de prueba gratuita de 15 días ha finalizado
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Selecciona un plan activo para desbloquear las funciones de cobranza automatizada y MikroTik.
                    </div>
                  </div>
                </div>

                <Link
                  href="/settings/billing"
                  style={{
                    backgroundColor: '#f43f5e',
                    color: '#ffffff',
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Activar Plan 💳
                </Link>
              </div>
            )}

            {/* Dynamic Page Viewport */}
            <main className="dashboard-content">
              {children}
            </main>
          </div>

          {/* Floating Bottom Navigation Bar (< 1024px) */}
          <nav className="bottom-nav-bar">
            <Link href="/subscribers" className={`bottom-nav-item ${isActive('/subscribers') ? 'active' : ''}`}>
              <span style={{ fontSize: '1.1rem' }}>📋</span>
              <span>Abonados</span>
            </Link>
            <Link href="/messaging" className={`bottom-nav-item ${isActive('/messaging') ? 'active' : ''}`}>
              <span style={{ fontSize: '1.1rem' }}>📣</span>
              <span>Avisos</span>
            </Link>
            <Link href="/tickets" className={`bottom-nav-item ${isActive('/tickets') ? 'active' : ''}`}>
              <span style={{ fontSize: '1.1rem' }}>🎫</span>
              <span>Tickets</span>
            </Link>
            <Link href="/settings/plans" className={`bottom-nav-item ${isActive('/settings') ? 'active' : ''}`}>
              <span style={{ fontSize: '1.1rem' }}>⚙️</span>
              <span>Ajustes</span>
            </Link>
          </nav>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
