'use client';

/**
 * src/components/waba/WabaConnectionActions.tsx
 * ---------------------------------------------------------------------------
 * Acciones interactivas del panel de conexión WhatsApp Business.
 * Se separa de WabaConnectionPanel (Server Component) porque necesita estado.
 *
 *   · Reintentar la suscripción del webhook
 *   · Enviar un mensaje de prueba con polling
 *   · Desconectar el número (con confirmación explícita)
 */

import { useEffect, useState, useTransition } from 'react';

import {
    disconnectWabaAction,
    getMessageStatus,
    retryWebhookSubscription,
    sendTemplateAction,
} from '@/app/actions/waba.actions';

const FINAL_STATUSES = new Set(['delivered', 'read', 'failed']);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;

interface Props {
    connectionId: string;
    connectedNumber: string | null;
}

export function WabaConnectionActions({ connectionId, connectedNumber }: Props) {
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

    // Prueba de envío
    const [showTest, setShowTest] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testTemplate, setTestTemplate] = useState('recordatorio_pago');
    const [testLanguage, setTestLanguage] = useState('es');
    const [testParams, setTestParams] = useState('Juan Pérez\nBs. 150\n15/08/2026');
    const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);

    // Desconexión
    const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

    /* ---------------------------------------------------------------------
     * Polling del estado final tras un envío de prueba.
     * ------------------------------------------------------------------- */

    useEffect(() => {
        if (!pendingMessageId) return;

        let cancelled = false;
        let attempts = 0;

        const poll = async () => {
            const response = await getMessageStatus(pendingMessageId);
            if (cancelled || !response.ok || !response.event) return;

            const status = response.event.deliveryStatus.toLowerCase();
            if (!FINAL_STATUSES.has(status)) return;

            if (status === 'failed') {
                setFeedback({
                    tone: 'error',
                    text: `Meta aceptó el mensaje, pero la entrega falló${
                        response.event.errorCode ? ` (${response.event.errorCode})` : ''
                    }${response.event.failureReason ? `: ${response.event.failureReason}` : '.'}`,
                });
            } else {
                setFeedback({
                    tone: 'ok',
                    text: `Estado final: ${status}. El circuito completo (envío → webhook → base de datos) funciona.`,
                });
            }
            setPendingMessageId(null);
        };

        const interval = setInterval(() => {
            attempts += 1;
            if (attempts > MAX_POLL_ATTEMPTS) {
                clearInterval(interval);
                if (!cancelled) {
                    setPendingMessageId(null);
                    setFeedback({
                        tone: 'error',
                        text:
                            'Meta aceptó el mensaje pero no llegó ningún estado de entrega. ' +
                            'Casi siempre significa que el webhook no está suscrito al WABA.',
                    });
                }
                return;
            }
            void poll();
        }, POLL_INTERVAL_MS);

        void poll();

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [pendingMessageId]);

    /* ------------------------------------------------------------------- */

    const handleRetryWebhook = () => {
        setFeedback(null);
        startTransition(async () => {
            const result = await retryWebhookSubscription();
            setFeedback(
                result.ok
                    ? { tone: 'ok', text: result.message }
                    : { tone: 'error', text: result.error }
            );
        });
    };

    const handleSendTest = () => {
        setFeedback(null);
        setPendingMessageId(null);

        startTransition(async () => {
            const result = await sendTemplateAction({
                recipientPhone: testPhone,
                templateName: testTemplate,
                languageCode: testLanguage,
                bodyParameters: testParams.split('\n').map((v) => v.trim()).filter(Boolean),
            });

            if (!result.ok) {
                setFeedback({ tone: 'error', text: result.error });
                return;
            }

            setFeedback({
                tone: 'ok',
                text: `Meta aceptó el mensaje para ${result.recipientWaId}. Esperando el estado de entrega…`,
            });
            if (result.messageId) setPendingMessageId(result.messageId);
        });
    };

    const handleDisconnect = () => {
        startTransition(async () => {
            const result = await disconnectWabaAction(connectionId, false);
            setFeedback(
                result.ok
                    ? { tone: 'ok', text: 'Número desconectado. El histórico de mensajes se conserva.' }
                    : { tone: 'error', text: result.error }
            );
            setConfirmingDisconnect(false);
        });
    };

    /* -------------------------------------------------------------------
     * Shared button style
     * ------------------------------------------------------------------- */
    const btnBase: React.CSSProperties = {
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius-lg)',
        fontSize: '0.88rem',
        fontWeight: 500,
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.5 : 1,
        transition: 'background 0.2s',
        border: 'none',
    };

    const btnNeutral: React.CSSProperties = {
        ...btnBase,
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-main)',
        border: '1px solid var(--border-color)',
    };

    const btnDanger: React.CSSProperties = {
        ...btnBase,
        backgroundColor: 'transparent',
        color: 'var(--status-danger-text)',
        border: '1px solid var(--status-danger-bg)',
    };

    const btnPrimary: React.CSSProperties = {
        ...btnBase,
        backgroundColor: '#10b981',
        color: '#fff',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                    type="button"
                    onClick={handleRetryWebhook}
                    disabled={isPending}
                    style={btnNeutral}
                >
                    Reintentar suscripción del webhook
                </button>

                <button
                    type="button"
                    onClick={() => setShowTest((v) => !v)}
                    disabled={isPending}
                    style={btnNeutral}
                >
                    {showTest ? 'Ocultar prueba de envío' : 'Enviar mensaje de prueba'}
                </button>

                {!confirmingDisconnect ? (
                    <button
                        type="button"
                        onClick={() => setConfirmingDisconnect(true)}
                        disabled={isPending}
                        style={btnDanger}
                    >
                        Desconectar número
                    </button>
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--status-danger-bg)',
                        backgroundColor: 'var(--status-danger-bg)',
                    }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--status-danger-text)' }}>
                            ¿Desconectar {connectedNumber ?? 'este número'}?
                        </span>
                        <button
                            type="button"
                            onClick={handleDisconnect}
                            disabled={isPending}
                            style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: '#dc2626',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: isPending ? 'not-allowed' : 'pointer',
                                opacity: isPending ? 0.5 : 1,
                            }}
                        >
                            Sí, desconectar
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmingDisconnect(false)}
                            style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-muted)',
                                fontSize: '0.75rem',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>

            {/* Feedback */}
            {feedback && (
                <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    border: `1px solid ${feedback.tone === 'ok' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)'}`,
                    backgroundColor: feedback.tone === 'ok' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                    color: feedback.tone === 'ok' ? 'var(--status-success-text)' : 'var(--status-danger-text)',
                    fontSize: '0.88rem',
                }}>
                    {feedback.text}
                </div>
            )}

            {/* Test message form */}
            {showTest && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Envía una plantilla aprobada a un número real para verificar el circuito
                        completo: envío → webhook de Meta → <code style={{ fontFamily: 'monospace' }}>message_logs</code>.
                    </p>

                    <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                        <InputField
                            label="Destinatario (E.164)"
                            value={testPhone}
                            onChange={setTestPhone}
                            placeholder="59171234567"
                        />
                        <InputField label="Plantilla" value={testTemplate} onChange={setTestTemplate} />
                        <InputField label="Idioma" value={testLanguage} onChange={setTestLanguage} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                            Variables (una por línea)
                        </label>
                        <textarea
                            value={testParams}
                            onChange={(e) => setTestParams(e.target.value)}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-main)',
                                fontSize: '0.88rem',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                            }}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSendTest}
                        disabled={isPending || !testPhone}
                        style={{
                            ...btnPrimary,
                            alignSelf: 'flex-start',
                        }}
                    >
                        {isPending ? 'Enviando…' : 'Enviar prueba'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------
 * Simple input field component
 * ------------------------------------------------------------------- */
function InputField({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label style={{
                display: 'block',
                marginBottom: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'var(--text-muted)',
            }}>
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                }}
            />
        </div>
    );
}
