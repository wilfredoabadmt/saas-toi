import { WabaService } from '@/services/waba.service';
import { WabaConnectButton } from '@/components/domain/waba-connect-button';

export const dynamic = 'force-dynamic';

export default async function WhatsAppPage() {
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const status = await WabaService.getStatus(defaultOrgId);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', margin: 0 }}>
          Conexión Meta WhatsApp Business (WABA)
        </h1>
        <p style={{ color: '#64748b', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Gestión de credenciales oficiales, tokens System User cifrados en reposo (AES-256-GCM) y webhooks
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Connection Status Card */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Estado de la Integración
            </span>
            <span className={status.isConnected ? 'badge badge-success' : 'badge badge-warning'}>
              {status.isConnected ? '● WABA Activo' : '● Desconectado'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                backgroundColor: status.isConnected ? '#dcfce7' : '#fef9c3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
              }}
            >
              💬
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {status.isConnected ? status.displayPhone : 'Sin conexión WABA'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                {status.isConnected ? `WABA ID: ${status.wabaId}` : 'Requiere Embedded Signup de Meta'}
              </p>
            </div>
          </div>

          {!status.isConnected ? (
            <div>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Conecte su cuenta de WhatsApp Business para enviar avisos de pago categorizados como <strong>Utility</strong> con su propia marca oficial y sin riesgos de baneo.
              </p>
              <WabaConnectButton />
            </div>
          ) : (
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 600, marginBottom: '0.25rem' }}>
                ✅ Token System User cifrado AES-256-GCM
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Conectado desde: {status.connectedAt ? new Date(status.connectedAt).toLocaleDateString('es-CL') : 'Hoy'}
              </p>
            </div>
          )}
        </div>

        {/* Security & Webhook Setup Information Card */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
            🔒 Parámetros de Cumplimiento & Webhook
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', fontWeight: 600 }}>WEBHOOK CALLBACK URL</span>
              <code style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600 }}>/api/webhooks/whatsapp</code>
            </div>

            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', fontWeight: 600 }}>SEGURIDAD DE FIRMA HMAC-SHA256</span>
              <span style={{ color: '#0f172a', fontWeight: 500 }}>Encabezado <code>X-Hub-Signature-256</code> verificado en raw body</span>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', fontWeight: 600 }}>DEDUPLICACIÓN DE EVENTOS</span>
              <span style={{ color: '#0f172a', fontWeight: 500 }}>Tabla <code>processed_webhook_events</code> por <code>wamid</code></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
