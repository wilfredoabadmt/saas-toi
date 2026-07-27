/**
 * src/components/waba/WabaConnectionPanel.tsx
 * ---------------------------------------------------------------------------
 * Server Component: panel de estado de la conexión de WhatsApp Business.
 *
 * Colócalo en la pantalla de Configuración → Integraciones de SaaS TOI.
 * Renderiza los cuatro estados posibles sin lanzar nunca:
 *
 *   1. Módulo sin configurar (faltan env vars)
 *   2. Sin número conectado           → CTA de Embedded Signup
 *   3. Conectado y sano               → métricas y calidad
 *   4. Conectado pero degradado       → motivo y acción de reparación
 *
 * Las clases Tailwind son neutras: adáptalas a tu design system.
 */

import { getWabaWorkspace } from '@/app/actions/waba.actions';

import { EmbeddedSignupButton } from './EmbeddedSignupButton';
import { WabaConnectionActions } from './WabaConnectionActions';

export async function WabaConnectionPanel() {
    const workspace = await getWabaWorkspace(10);

    /* --- 1. Módulo sin configurar ---------------------------------------- */
    if (workspace.unavailableReason?.startsWith('Módulo no configurado')) {
        return (
            <Card>
                <Header
                    title="WhatsApp Business"
                    badge={<Badge tone="neutral">No configurado</Badge>}
                />
                <p className="mt-2 text-sm text-zinc-500">{workspace.unavailableReason}</p>
                <p className="mt-4 text-xs text-zinc-400">
                    Define las variables de entorno en Coolify y reinicia el contenedor.
                    Consulta <code className="font-mono">07-ENV-Y-META/env.waba.example</code>.
                </p>
            </Card>
        );
    }

    /* --- 2. Sin conexión -------------------------------------------------- */
    if (!workspace.connection) {
        return (
            <Card>
                <Header
                    title="WhatsApp Business"
                    badge={<Badge tone="neutral">Sin conectar</Badge>}
                />
                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                    Conecta el número de WhatsApp Business de tu empresa para enviar avisos de
                    cobro, recordatorios de vencimiento y atender a tus abonados desde el Chat Inbox.
                </p>

                <div className="mt-6">
                    <EmbeddedSignupButton />
                </div>

                <ul className="mt-6 space-y-2 text-xs text-zinc-500">
                    <li>· Necesitas ser administrador del Business Manager de tu empresa.</li>
                    <li>· El número no puede estar activo en la app de WhatsApp Business.</li>
                    <li>· El proceso se hace íntegro en la ventana de Meta; no salimos de aquí.</li>
                </ul>
            </Card>
        );
    }

    /* --- 3 y 4. Conectado -------------------------------------------------- */
    const { connection, phoneProfile, templates, stats } = workspace;
    const healthy = connection.isActive && connection.connectionStatus === 'active';
    const approvedTemplates = templates.filter((t) => t.status?.toUpperCase() === 'APPROVED');

    return (
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
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    <strong className="block">Meta rechazó las credenciales</strong>
                    <span className="mt-1 block text-xs opacity-90">{connection.lastError}</span>
                    <span className="mt-2 block text-xs">
                        Vuelve a ejecutar la conexión para restablecer el servicio.
                    </span>
                </div>
            )}

            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Número" value={connection.displayPhoneNumber ?? '—'} />
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

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                    No hay ninguna plantilla aprobada todavía. Sin plantillas no se pueden iniciar
                    conversaciones: crea al menos <code className="font-mono">recordatorio_pago</code> y
                    espera la aprobación de Meta.
                </div>
            )}

            {/* Acciones interactivas → Client Component */}
            <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <WabaConnectionActions
                    connectionId={connection.id}
                    connectedNumber={connection.displayPhoneNumber}
                />
            </div>

            <p className="mt-4 text-xs text-zinc-400">
                Última sincronización con Meta:{' '}
                {connection.lastSyncedAt
                    ? new Date(connection.lastSyncedAt).toLocaleString('es-BO')
                    : 'nunca'}
            </p>
        </Card>
    );
}

/* ==========================================================================
 * Primitivas de presentación — sustitúyelas por las de tu design system
 * ========================================================================== */

function Card({ children }: { children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            {children}
        </section>
    );
}

function Header({ title, badge }: { title: string; badge: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
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
    const tones = {
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        danger: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
        neutral: 'border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
    } as const;

    return (
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}>
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
            ? 'text-emerald-600 dark:text-emerald-400'
            : tone === 'danger'
              ? 'text-red-600 dark:text-red-400'
              : 'text-zinc-900 dark:text-zinc-100';

    return (
        <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className={`mt-1 text-sm font-medium ${color}`}>{value}</dd>
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
        <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
            <p
                className={`mt-1 text-2xl font-semibold ${
                    tone === 'danger'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-zinc-900 dark:text-zinc-100'
                }`}
            >
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
