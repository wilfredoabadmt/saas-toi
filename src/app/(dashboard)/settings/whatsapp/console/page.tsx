import { getWabaWorkspace, getWabaWebhookConfig } from '@/app/actions/waba.actions';
import { WabaConnectionPanel } from '@/components/waba/WabaConnectionPanel';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'WhatsApp App Review Console — SaaS TOI',
  description: 'Consola de verificación técnica para screencast de App Review de Meta, visualización de activos y gestor de plantillas.',
};

export default async function AppReviewConsolePage() {
  const [workspace, webhookConfig] = await Promise.all([
    getWabaWorkspace(10),
    getWabaWebhookConfig(),
  ]);

  const connection = workspace.connection;
  const healthy = Boolean(connection && connection.isActive && connection.connectionStatus === 'active');

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
          WhatsApp App Review & Assets Console
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Gestor oficial de activos Meta Graph API v22.0, verificación de permisos y consola de pruebas live.
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
