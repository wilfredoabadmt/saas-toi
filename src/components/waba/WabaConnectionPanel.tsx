/**
 * src/components/waba/WabaConnectionPanel.tsx
 * ---------------------------------------------------------------------------
 * Server Component: panel de estado de la conexión de WhatsApp Business.
 *
 * Renderiza:
 *   1. Estado de la conexión (Métricas / Embedded Signup)
 *   2. Formulario manual de reconexión/credenciales (WABA ID, Phone Number ID, Access Token)
 *   3. Configuración del Webhook de WhatsApp (Callback URL, Verify Token, firma HMAC)
 */

import { getWabaWorkspace, getWabaWebhookConfig } from '@/app/actions/waba.actions';

import { EmbeddedSignupButton } from './EmbeddedSignupButton';
import { WabaConnectionActions } from './WabaConnectionActions';
import { WabaManualConnectionCard } from './WabaManualConnectionCard';
import { MetaChannelsPanel } from './MetaChannelsPanel';

export async function WabaConnectionPanel() {
    const [workspace, webhookConfig] = await Promise.all([
        getWabaWorkspace(10),
        getWabaWebhookConfig(),
    ]);

    /* --- 1. Módulo sin configurar (faltan env vars) ---------------------- */
    if (workspace.unavailableReason?.startsWith('Módulo no configurado')) {
        return (
            <div>
                <Card>
                    <Header
                        title="WhatsApp Business"
                        badge={<Badge tone="neutral">No configurado</Badge>}
                    />
                    <p style={{ marginTop: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        {workspace.unavailableReason}
                    </p>
                    <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Define las variables de entorno en Coolify y reinicia el contenedor.
                    </p>
                </Card>

                <WabaManualConnectionCard
                    callbackUrl={webhookConfig.callbackUrl}
                    verifyToken={webhookConfig.verifyToken}
                    hasAppSecret={webhookConfig.hasAppSecret}
                />
            </div>
        );
    }

    /* --- 2. Sin conexión -------------------------------------------------- */
    if (!workspace.connection) {
        return (
            <div>
                <Card>
                    <Header
                        title="WhatsApp Business"
                        badge={<Badge tone="neutral">Sin conectar</Badge>}
                    />
                    <p style={{ marginTop: '0.5rem', maxWidth: '40rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        Conecta el número de WhatsApp Business de tu empresa para enviar avisos de
                        cobro, recordatorios de vencimiento y atender a tus abonados desde el Chat Inbox.
                    </p>

                    <div style={{ marginTop: '1.5rem' }}>
                        <EmbeddedSignupButton />
                    </div>

                    <ul style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <li>· Necesitas ser administrador del Business Manager de tu empresa.</li>
                        <li>· El número no puede estar activo en la app de WhatsApp Business.</li>
                        <li>· El proceso se hace íntegro en la ventana de Meta; no salimos de aquí.</li>
                    </ul>
                </Card>

                <MetaChannelsPanel />

                <WabaManualConnectionCard
                    callbackUrl={webhookConfig.callbackUrl}
                    verifyToken={webhookConfig.verifyToken}
                    hasAppSecret={webhookConfig.hasAppSecret}
                />
            </div>
        );
    }

    /* --- 3. Conectado ----------------------------------------------------- */
    const { connection, phoneProfile, templates, stats } = workspace;
    const healthy = connection.isActive && connection.connectionStatus === 'active';
    const approvedTemplates = templates.filter((t) => t.status?.toUpperCase() === 'APPROVED');

    return (
        <div>
            <Card>
                <Header
                    title="WhatsApp Business"
                    badge={
                        healthy ? (
                            <Badge tone="success">Conectado</Badge>
                        ) : (
                            <Badge tone="danger">Requiere atención</Badge>
                        )
                    }
                />

                {!healthy && connection.lastError && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--status-danger-bg)',
                        backgroundColor: 'var(--status-danger-bg)',
                        fontSize: '0.88rem',
                        color: 'var(--status-danger-text)',
                    }}>
                        <strong style={{ display: 'block' }}>Meta rechazó las credenciales</strong>
                        <span style={{ marginTop: '0.25rem', display: 'block', fontSize: '0.75rem', opacity: 0.9 }}>{connection.lastError}</span>
                        <span style={{ marginTop: '0.5rem', display: 'block', fontSize: '0.75rem' }}>
                            Vuelve a ejecutar la conexión para restablecer el servicio.
                        </span>
                    </div>
                )}

                <dl style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <Field label="Número" value={connection.displayPhone ?? '—'} />
                    <Field label="Nombre verificado" value={connection.verifiedName ?? '—'} />
                    <Field
                        label="Calidad"
                        value={phoneProfile?.quality_rating ?? 'No disponible'}
                        tone={qualityTone(phoneProfile?.quality_rating)}
                    />
                    <Field
                        label="Verificación"
                        value={phoneProfile?.code_verification_status ?? 'No disponible'}
                    />
                </dl>

                <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    <Metric label="Plantillas aprobadas" value={approvedTemplates.length} />
                    <Metric label="Entregados (30 d)" value={stats.delivered ?? 0} />
                    <Metric label="Leídos (30 d)" value={stats.read ?? 0} />
                    <Metric
                        label="Fallidos (30 d)"
                        value={stats.failed ?? 0}
                        tone={(stats.failed ?? 0) > 0 ? 'danger' : 'neutral'}
                    />
                </div>

                {approvedTemplates.length === 0 && (
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fontSize: '0.88rem',
                        color: '#d97706',
                    }}>
                        No hay ninguna plantilla aprobada todavía. Sin plantillas no se pueden iniciar
                        conversaciones: crea al menos <code style={{ fontFamily: 'monospace' }}>recordatorio_pago</code> y
                        espera la aprobación de Meta.
                    </div>
                )}

                {/* Acciones interactivas */}
                <div style={{
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid var(--border-color)',
                }}>
                    <WabaConnectionActions
                        connectionId={connection.id}
                        connectedNumber={connection.displayPhone}
                    />
                </div>

                <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Última sincronización con Meta:{' '}
                    {connection.lastSyncedAt
                        ? new Date(connection.lastSyncedAt).toLocaleString('es-BO')
                        : 'nunca'}
                </p>
                </Card>

                <MetaChannelsPanel />

                <WabaManualConnectionCard
                    initialWabaId={connection.wabaId}
                    initialPhoneNumberId={connection.phoneNumberId}
                    callbackUrl={webhookConfig.callbackUrl}
                    verifyToken={webhookConfig.verifyToken}
                    hasAppSecret={webhookConfig.hasAppSecret}
                />
        </div>
    );
}

/* ==========================================================================
 * Primitivas de presentación
 * ========================================================================== */

function Card({ children }: { children: React.ReactNode }) {
    return (
        <section style={{
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow-card)',
            padding: '1.5rem',
        }}>
            {children}
        </section>
    );
}

function Header({ title, badge }: { title: string; badge: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{title}</h2>
            {badge}
        </div>
    );
}

function Badge({
    tone,
    children,
}: {
    tone: 'success' | 'danger' | 'neutral';
    children: React.ReactNode;
}) {
    const tones: Record<'success' | 'danger' | 'neutral', { bg: string; text: string; border: string }> = {
        success: {
            bg: 'var(--status-success-bg)',
            text: 'var(--status-success-text)',
            border: 'var(--status-success-bg)',
        },
        danger: {
            bg: 'var(--status-danger-bg)',
            text: 'var(--status-danger-text)',
            border: 'var(--status-danger-bg)',
        },
        neutral: {
            bg: 'var(--bg-card-accent)',
            text: 'var(--text-muted)',
            border: 'var(--border-color)',
        },
    };
    const t = tones[tone] ?? tones.neutral;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.25rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${t.border}`,
            backgroundColor: t.bg,
            color: t.text,
            fontSize: '0.75rem',
            fontWeight: 600,
        }}>
            {children}
        </span>
    );
}

function Field({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: 'success' | 'danger' | 'neutral';
}) {
    const color =
        tone === 'success'
            ? 'var(--status-success-text)'
            : tone === 'danger'
              ? 'var(--status-danger-text)'
              : 'var(--text-main)';

    return (
        <div>
            <dt style={{ fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{label}</dt>
            <dd style={{ marginTop: '0.25rem', fontSize: '0.88rem', fontWeight: 500, color }}>{value}</dd>
        </div>
    );
}

function Metric({
    label,
    value,
    tone = 'neutral',
}: {
    label: string;
    value: number;
    tone?: 'danger' | 'neutral';
}) {
    return (
        <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
        }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: 0 }}>{label}</p>
            <p style={{
                marginTop: '0.25rem',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: tone === 'danger' ? 'var(--status-danger-text)' : 'var(--text-main)',
                margin: 0,
            }}>
                {value}
            </p>
        </div>
    );
}

function qualityTone(rating?: string): 'success' | 'danger' | 'neutral' {
    const normalized = rating?.toUpperCase();
    if (normalized === 'GREEN') return 'success';
    if (normalized === 'RED') return 'danger';
    return 'neutral';
}
