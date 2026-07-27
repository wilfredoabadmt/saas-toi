/**
 * src/components/waba/WabaConnectionPanel.tsx
 * ---------------------------------------------------------------------------
 * Server Component: Vista de Conexión WABA e Integraciones Meta.
 *
 * Muestra los 3 Paneles Glassmorphic (.glass-card-dark):
 *   1. PANEL 1: Estado de Conexión Meta 1-Clic (WhatsApp Cloud API + Facebook & Instagram Direct)
 *   2. PANEL 2: Consola de WhatsApp App Review & Pruebas Live (Plantillas + Mensaje de Prueba)
 *   3. PANEL 3: Datos de Webhook de Meta (URL Callback + Verify Token e inputs con copiado 1-Clic)
 */

import { getWabaWorkspace, getWabaWebhookConfig } from '@/app/actions/waba.actions';
import { EmbeddedSignupButton } from './EmbeddedSignupButton';
import { WabaConnectionActions } from './WabaConnectionActions';
import { MetaChannelsPanel } from './MetaChannelsPanel';
import { AppReviewConsole } from './AppReviewConsole';
import { WebhookInfoCard } from './WebhookInfoCard';

export async function WabaConnectionPanel() {
  const [workspace, webhookConfig] = await Promise.all([
    getWabaWorkspace(10),
    getWabaWebhookConfig(),
  ]);

  const { connection, phoneProfile, templates } = workspace;
  const healthy = Boolean(connection && connection.isActive && connection.connectionStatus === 'active');
  const approvedTemplates = templates.filter((t) => t.status?.toUpperCase() === 'APPROVED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      {/* ------------------------------------------------------------------- */}
      {/* PANEL 1: Estado de Conexión Meta 1-Clic                             */}
      {/* ------------------------------------------------------------------- */}
      <section
        style={{
          borderRadius: 'var(--radius-2xl, 20px)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          backgroundColor: 'var(--bg-card, rgba(18, 20, 26, 0.65))',
          boxShadow: 'var(--shadow-card, 0 20px 50px rgba(0,0,0,0.5))',
          padding: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #F8FAFC)', margin: 0, letterSpacing: '-0.02em' }}>
              WhatsApp Cloud API (Conexión 1-Clic Meta)
            </h2>
            <p style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.88rem', margin: '0.35rem 0 0 0' }}>
              Conecta el número oficial de tu empresa en segundos mediante Embedded Signup sin ingresar IDs ni tokens manualmente.
            </p>
          </div>

          <span
            style={{
              padding: '0.3rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: healthy ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${healthy ? '#10b981' : 'var(--border-color)'}`,
              color: healthy ? '#34D399' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            {healthy ? '✓ Conectado' : 'Sin conectar'}
          </span>
        </div>

        {!healthy || !connection ? (
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ maxWidth: '40rem', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Haz clic en el botón principal para iniciar sesión con tu cuenta comercial de Meta y Vincular tu número de WhatsApp Business.
            </p>
            <EmbeddedSignupButton />
          </div>
        ) : (
          <div style={{ marginTop: '1.5rem' }}>
            {connection.lastError && (
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-xl, 14px)',
                  border: '1px solid #f43f5e',
                  backgroundColor: 'rgba(244,63,94,0.15)',
                  color: '#FB7185',
                  fontSize: '0.88rem',
                }}
              >
                <strong style={{ display: 'block' }}>Aviso de Meta:</strong>
                <span>{connection.lastError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <InfoBox label="Número Vinculado" value={connection.displayPhone ?? '—'} />
              <InfoBox label="Nombre Verificado" value={connection.verifiedName ?? '—'} />
              <InfoBox label="Calidad de Línea" value={phoneProfile?.quality_rating ?? 'GREEN'} highlight />
              <InfoBox label="Plantillas Aprobadas" value={approvedTemplates.length} />
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <WabaConnectionActions
                connectionId={connection.id}
                connectedNumber={connection.displayPhone}
              />
            </div>
          </div>
        )}
      </section>

      {/* Sub-tarjeta para Canales Sociales (Facebook Pages & Instagram Direct) */}
      <MetaChannelsPanel />

      {/* ------------------------------------------------------------------- */}
      {/* PANEL 2: Consola de WhatsApp App Review & Pruebas Live              */}
      {/* ------------------------------------------------------------------- */}
      <AppReviewConsole
        wabaId={connection?.wabaId}
        phoneNumberId={connection?.phoneNumberId}
        displayPhone={connection?.displayPhone}
        isConnected={healthy}
        initialTemplates={templates}
      />

      {/* ------------------------------------------------------------------- */}
      {/* PANEL 3: Datos de Webhook (Informativo para el Admin)               */}
      {/* ------------------------------------------------------------------- */}
      <WebhookInfoCard
        callbackUrl={webhookConfig.callbackUrl}
        verifyToken={webhookConfig.verifyToken}
        hasAppSecret={webhookConfig.hasAppSecret}
      />
    </div>
  );
}

function InfoBox({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-xl, 14px)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
      }}
    >
      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span
        style={{
          display: 'block',
          marginTop: '0.25rem',
          fontSize: '1rem',
          fontWeight: 700,
          color: highlight ? '#34D399' : 'var(--text-main)',
          fontFamily: typeof value === 'string' && value.startsWith('+') ? 'monospace' : 'inherit',
        }}
      >
        {value}
      </span>
    </div>
  );
}
