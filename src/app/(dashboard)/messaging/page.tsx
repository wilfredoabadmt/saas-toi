import { MessageSendForm } from '@/components/domain/message-send-form';
import { MessagingService } from '@/services/messaging.service';

export const dynamic = 'force-dynamic';

export default async function MessagingPage() {
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const logs = await MessagingService.listLogs({ organizationId: defaultOrgId, limit: 20 });

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Recordatorios de Cobranza (WhatsApp Utility)</h1>
        <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
          Programación y envío masivo de notificaciones oficiales de vencimiento
        </p>
      </div>

      <MessageSendForm />

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Historial Reciente de Envíos</h3>
        {logs.data.length === 0 ? (
          <p style={{ color: '#64748b' }}>No hay registros de envíos recientes.</p>
        ) : (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Fecha</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Dirección</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Contenido / Preview</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Estado Entrega</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 16px' }}>{new Date(log.sentAt).toLocaleString()}</td>
                    <td style={{ padding: '10px 16px' }}>{log.direction === 'outbound' ? '📤 Saliente' : '📥 Entrante'}</td>
                    <td style={{ padding: '10px 16px' }}>{log.contentPreview || log.templateName}</td>
                    <td style={{ padding: '10px 16px' }}>{log.deliveryStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
