import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      {/* Sleek Left Sidebar */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '1.5rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
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
              }}
            >
              T
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: '#ffffff' }}>
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
                <Link href="/subscribers" className="nav-item">
                  <span>📋</span> Abonados
                  <span style={{ marginLeft: 'auto', backgroundColor: '#334155', color: '#cbd5e1', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px' }}>
                    Active
                  </span>
                </Link>
                <Link href="/subscribers/import" className="nav-item">
                  <span>📥</span> Importar CSV
                </Link>
              </nav>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                Canales & WhatsApp
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Link href="/whatsapp" className="nav-item">
                  <span>💬</span> Conexión WABA
                  <span style={{ marginLeft: 'auto', backgroundColor: '#15803d', color: '#ffffff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px' }}>
                    Meta API
                  </span>
                </Link>
                <Link href="/messaging" className="nav-item">
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '64px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>ISP Workspace</span>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Dashboard Insights</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#15803d', backgroundColor: '#dcfce7', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 500 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
              Database Connected
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '6px', fontWeight: 500 }}>
              Tenant ID: <code>0000...0001</code>
            </div>
          </div>
        </header>

        {/* Dynamic Page Viewport */}
        <main style={{ flex: 1, padding: '2rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
