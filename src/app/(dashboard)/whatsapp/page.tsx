import { WabaService } from '@/services/waba.service';
import { WabaConnectButton } from '@/components/domain/waba-connect-button';

export const dynamic = 'force-dynamic';

export default async function WhatsAppPage() {
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const status = await WabaService.getStatus(defaultOrgId);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Conexión WhatsApp Business (WABA)</h1>
        <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
          Conecte la cuenta oficial de WhatsApp Business de su ISP mediante Meta Embedded Signup
        </p>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{status.isConnected ? '✅' : '⚠️'}</span>
          <div>
            <h3 style={{ margin: 0 }}>Estado: {status.isConnected ? 'Conectado' : 'No Conectado'}</h3>
            {status.isConnected && (
              <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                Número: <strong>{status.displayPhone}</strong> (WABA ID: {status.wabaId})
              </p>
            )}
          </div>
        </div>

        {!status.isConnected ? (
          <div>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>
              Al conectar WhatsApp, su ISP podrá enviar recordatorios de cobranza oficiales con su propia marca y número.
            </p>
            <WabaConnectButton />
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: '#166534', backgroundColor: '#dcfce7', padding: '0.75rem', borderRadius: '4px' }}>
            Su cuenta WABA está activa y lista para enviar notificaciones de cobranza.
          </p>
        )}
      </div>
    </div>
  );
}
