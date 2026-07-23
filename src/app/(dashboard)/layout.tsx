import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <aside
        style={{
          width: '240px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>SaaS TOI ISP</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <Link
            href="/subscribers"
            style={{ color: '#cbd5e1', textDecoration: 'none', padding: '0.5rem', borderRadius: '4px' }}
          >
            📋 Abonados
          </Link>
          <Link
            href="/whatsapp"
            style={{ color: '#cbd5e1', textDecoration: 'none', padding: '0.5rem', borderRadius: '4px' }}
          >
            💬 WhatsApp WABA
          </Link>
          <Link
            href="/messaging"
            style={{ color: '#cbd5e1', textDecoration: 'none', padding: '0.5rem', borderRadius: '4px' }}
          >
            📣 Recordatorios
          </Link>
        </nav>
      </aside>
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '2rem' }}>{children}</main>
    </div>
  );
}
