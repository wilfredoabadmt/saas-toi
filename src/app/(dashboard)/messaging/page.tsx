import { MessageSendForm } from '@/components/domain/message-send-form';
import { MessagingService } from '@/services/messaging.service';

export const dynamic = 'force-dynamic';

export default async function MessagingPage() {
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const logs = await MessagingService.listLogs({ organizationId: defaultOrgId, limit: 30 });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', margin: 0 }}>
          Recordatorios de Cobranza & Historial Meta
        </h1>
        <p style={{ color: '#64748b', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Gatillo de plantillas oficial (Utility) y trazabilidad completa de entrega (Sent, Delivered, Read, Failed)
        </p>
      </div>

      <MessageSendForm />

      {/* Message Logs Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
          Historial Reciente de Mensajes y Webhooks ({logs.data.length})
        </h3>

        {logs.data.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
            <p>No hay registros de envíos o mensajes entrantes en el historial.</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Fecha & Hora</th>
                  <th style={{ padding: '12px 16px' }}>Dirección</th>
                  <th style={{ padding: '12px 16px' }}>Tipo</th>
                  <th style={{ padding: '12px 16px' }}>Contenido / Preview</th>
                  <th style={{ padding: '12px 16px' }}>Estado Entrega</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.82rem' }}>
                      {new Date(log.sentAt).toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {log.direction === 'outbound' ? (
                        <span className="badge badge-info">📤 Saliente</span>
                      ) : (
                        <span className="badge badge-success">📥 Entrante</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{log.messageType}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{log.contentPreview || log.templateName || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className={
                          log.deliveryStatus === 'read' || log.deliveryStatus === 'delivered'
                            ? 'badge badge-success'
                            : log.deliveryStatus === 'failed'
                            ? 'badge badge-danger'
                            : 'badge badge-warning'
                        }
                      >
                        {log.deliveryStatus}
                      </span>
                    </td>
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
