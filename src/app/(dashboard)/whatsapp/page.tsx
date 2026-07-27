import { WabaConnectionPanel } from '@/components/waba/WabaConnectionPanel';

export const dynamic = 'force-dynamic';

export default async function WhatsAppPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
          Conexión Meta WhatsApp Business (WABA)
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Gestión de credenciales oficiales, tokens System User cifrados en reposo (AES-256-GCM) y webhooks
        </p>
      </div>

      <WabaConnectionPanel />
    </div>
  );
}
