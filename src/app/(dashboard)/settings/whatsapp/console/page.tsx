import { getWabaWorkspace } from '@/app/actions/waba.actions';
import { AppReviewConsole } from '@/components/waba/AppReviewConsole';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'WhatsApp App Review Console — SaaS TOI',
  description: 'Consola de verificación técnica para screencast de App Review de Meta y gestor de plantillas.',
};

export default async function AppReviewConsolePage() {
  const workspace = await getWabaWorkspace(10);
  const connection = workspace.connection;
  const healthy = Boolean(connection && connection.isActive && connection.connectionStatus === 'active');

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
          WhatsApp App Review & Template Console
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Gestor oficial de plantillas Meta Graph API v22.0, verificación de permisos y consola de pruebas live.
        </p>
      </div>

      <AppReviewConsole
        wabaId={connection?.wabaId}
        phoneNumberId={connection?.phoneNumberId}
        displayPhone={connection?.displayPhone}
        isConnected={healthy}
        initialTemplates={workspace.templates}
      />
    </div>
  );
}
