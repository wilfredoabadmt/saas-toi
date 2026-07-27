import { getWabaWorkspace, getWabaWebhookConfig } from '@/app/actions/waba.actions';
import { WabaConnectionPanel } from '@/components/waba/WabaConnectionPanel';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Integraciones Meta & WhatsApp — SaaS TOI',
  description: 'Conecta y administra tus canales de comunicación: WhatsApp Business, Facebook, Instagram y Webhooks.',
};

export default async function IntegrationsPage() {
  const [workspace, webhookConfig] = await Promise.all([
    getWabaWorkspace(10),
    getWabaWebhookConfig(),
  ]);

  const connection = workspace.connection;
  const healthy = Boolean(connection && connection.isActive && connection.connectionStatus === 'active');

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
          WhatsApp App Review & Meta Integrations
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Conexión 1-Clic mediante Embedded Signup, verificación en tiempo real de activos de Meta y consola de pruebas live.
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
