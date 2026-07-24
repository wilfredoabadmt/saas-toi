'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ToastProvider } from '@/components/ui/toast-provider';
import { ThemeProvider, ThemeToggle } from '@/components/ui/theme-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
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
                  RM
                </div>

                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      Roberto Morales
                    </h2>
                    <img
                      src="/logotoi.webp"
                      alt="SaaS TOI Logo"
                      className="logo-animated-glow"
                      style={{ height: '26px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                    />
                  </div>

                  <span style={{ fontSize: '0.72rem', color: '#818CF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    👑 Admin ISP
                  </span>
                </div>
              </div>

              {/* Quick Search */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '0.55rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar abonado, ID..."
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      padding: 0,
                      boxShadow: 'none',
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
                    <Link href="/super-admin/tenants" className={`nav-item ${isActive('/super-admin/tenants') ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <span>👑</span> Super Admin Tenants
                    </Link>
                  </nav>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                    Canales & WhatsApp
                  </div>
                  <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
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

            {/* Sidebar Footer User Info */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid rgba(255,255,255,0.08)',
                marginTop: '1.5rem',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  FiberSpeed ISP
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Plan Pro (1500)</div>
              </div>

              <Link href="/onboarding" style={{ color: '#818CF8', fontSize: '1.1rem', textDecoration: 'none' }} title="Asistente de Inicio">
                ⚙️
              </Link>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="dashboard-main">
            {/* Top Header Bar */}
            <header className="dashboard-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ISP Workspace</span>
                <span style={{ color: 'var(--border-color)' }}>/</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Dashboard Insights</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <ThemeToggle />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.12)', padding: '0.35rem 0.85rem', borderRadius: '999px', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
                  <span className="header-breadcrumb-extra">Database</span> Connected
                </div>
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
