'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ToastProvider } from '@/components/ui/toast-provider';
import { ThemeProvider, ThemeToggle } from '@/components/ui/theme-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          {sidebarOpen ? '✕' : '☰'}
        </button>

        {/* Mobile Overlay */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sleek Left Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div>
            {/* Brand Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                  flexShrink: 0,
                }}
              >
                T
              </div>
              <div style={{ overflow: 'hidden' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: '#ffffff', whiteSpace: 'nowrap' }}>
                  SaaS TOI ISP
                </h2>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Multi-Tenant Platform</span>
              </div>
            </div>

            {/* Quick Search */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid #334155',
                }}
              >
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>🔍</span>
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
                  }}
                />
              </div>
            </div>

            {/* Navigation Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  Gestión de Cartera
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <Link href="/subscribers" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>📋</span> Abonados
                    <span style={{ marginLeft: 'auto', backgroundColor: '#334155', color: '#cbd5e1', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px' }}>
                      Active
                    </span>
                  </Link>
                  <Link href="/subscribers/import" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>📥</span> Importar CSV
                  </Link>
                  <Link href="/settings/plans" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>📶</span> Planes de Internet
                  </Link>
                  <Link href="/tickets" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>🎫</span> Tickets & Averías
                    <span style={{ marginLeft: 'auto', backgroundColor: '#d97706', color: '#ffffff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px' }}>
                      Soporte
                    </span>
                  </Link>
                  <Link href="/settings/routers" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>⚙️</span> Routers MikroTik
                  </Link>
                  <Link href="/settings/team" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>👥</span> Equipo & RBAC
                  </Link>
                  <Link href="/settings/billing" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>💳</span> Suscripción SaaS
                  </Link>
                  <Link href="/super-admin/tenants" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>👑</span> Super Admin Tenants
                  </Link>
                </nav>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  Canales & WhatsApp
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <Link href="/chat" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>💬</span> Inbox Multi-Agente
                    <span style={{ marginLeft: 'auto', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px' }}>
                      Live
                    </span>
                  </Link>
                  <Link href="/whatsapp" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>⚙️</span> Conexión WABA
                    <span style={{ marginLeft: 'auto', backgroundColor: '#15803d', color: '#ffffff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px' }}>
                      Meta API
                    </span>
                  </Link>
                  <Link href="/messaging" className="nav-item" onClick={() => setSidebarOpen(false)}>
                    <span>📣</span> Recordatorios
                  </Link>
                </nav>
              </div>
            </div>
          </div>

          {/* Sidebar Footer User Info */}
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '10px',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: '1px solid #334155',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                flexShrink: 0,
              }}
            >
              AD
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                ISP Demo Internet
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Admin Scope</div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="dashboard-main">
          {/* Top Header Bar */}
          <header className="dashboard-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>ISP Workspace</span>
              <span style={{ color: '#cbd5e1' }}>/</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Dashboard Insights</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ThemeToggle />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#15803d', backgroundColor: '#dcfce7', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 500 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
                <span className="header-breadcrumb-extra">Database</span> Connected
              </div>
              <div className="header-breadcrumb-extra" style={{ fontSize: '0.8rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '6px', fontWeight: 500 }}>
                Tenant ID: <code>0000...0001</code>
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
