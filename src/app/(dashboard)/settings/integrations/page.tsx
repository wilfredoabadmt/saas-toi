import { WabaConnectionPanel } from '@/components/waba/WabaConnectionPanel';

export const metadata = {
    title: 'Integraciones — SaaS TOI',
    description: 'Conecta y administra tus canales de comunicación: WhatsApp Business, webhooks y más.',
};

export default function IntegrationsPage() {
    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
                    Integraciones
                </h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
                    Conecta y administra tus canales de comunicación: WhatsApp Business, webhooks y más.
                </p>
            </div>

            {/* WhatsApp Business Connection Panel */}
            <WabaConnectionPanel />
        </div>
    );
}
