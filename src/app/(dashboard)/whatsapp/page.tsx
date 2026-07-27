import { getWabaWorkspace, getWabaWebhookConfig } from '@/app/actions/waba.actions';
import { WabaConnectionPanel } from '@/components/waba/WabaConnectionPanel';

export const dynamic = 'force-dynamic';

export default async function WhatsAppPage() {
  const [workspace, webhookConfig] = await Promise.all([
    getWabaWorkspace(10),
    getWabaWebhookConfig(),
  ]);

  const connection = workspace.connection;
  const healthy = Boolean(connection && connection.isActive && connection.connectionStatus === 'active');

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

      <WabaConnectionPanel
        initialWabaId={connection?.wabaId}
        initialPhoneNumberId={connection?.phoneNumberId}
        initialDisplayPhone={connection?.displayPhone}
        initialVerifiedName={connection?.verifiedName}
        initialQualityRating={workspace.phoneProfile?.quality_rating}
        initialVerificationStatus={connection?.connectionStatus}
        initialIsConnected={healthy}
        initialTemplates={workspace.templates}
        callbackUrl={webhookConfig.callbackUrl}
        verifyToken={webhookConfig.verifyToken}
        hasAppSecret={webhookConfig.hasAppSecret}
      />
    </div>
  );
}
