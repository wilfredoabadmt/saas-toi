'use client';

/**
 * src/components/waba/WabaConnectionActions.tsx
 * ---------------------------------------------------------------------------
 * Acciones interactivas del panel de conexión. Se separa de
 * `WabaConnectionPanel` (Server Component) porque necesita estado y handlers.
 *
 *   · Reintentar la suscripción del webhook   (la causa nº1 de "no llegan estados")
 *   · Enviar un mensaje de prueba con polling  (verifica el circuito completo)
 *   · Desconectar el número                    (con confirmación explícita)
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
     *
     * Solo para envíos puntuales. Para campañas masivas NO uses polling por
     * mensaje: el webhook ya actualiza `message_logs` y basta con revalidar.
     * ------------------------------------------------------------------- */

    useEffect(() => {
        if (!pendingMessageId) return;

        let cancelled = false;
        let attempts = 0;

        const poll = async () => {
            const response = await getMessageStatus(pendingMessageId);
            if (cancelled || !response.ok || !response.event) return;

            const status = response.event.status.toLowerCase();
            if (!FINAL_STATUSES.has(status)) return;

            if (status === 'failed') {
                setFeedback({
                    tone: 'error',
                    text: `Meta aceptó el mensaje, pero la entrega falló${
                        response.event.errorCode ? ` (${response.event.errorCode})` : ''
                    }${response.event.errorMessage ? `: ${response.event.errorMessage}` : '.'}`,
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

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={handleRetryWebhook}
                    disabled={isPending}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    Reintentar suscripción del webhook
                </button>

                <button
                    type="button"
                    onClick={() => setShowTest((v) => !v)}
                    disabled={isPending}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    {showTest ? 'Ocultar prueba de envío' : 'Enviar mensaje de prueba'}
                </button>

                {!confirmingDisconnect ? (
                    <button
                        type="button"
                        onClick={() => setConfirmingDisconnect(true)}
                        disabled={isPending}
                        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
                    >
                        Desconectar número
                    </button>
                ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950">
                        <span className="text-xs text-red-700 dark:text-red-400">
                            ¿Desconectar {connectedNumber ?? 'este número'}?
                        </span>
                        <button
                            type="button"
                            onClick={handleDisconnect}
                            disabled={isPending}
                            className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                            Sí, desconectar
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmingDisconnect(false)}
                            className="rounded px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>

            {showTest && (
                <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500">
                        Envía una plantilla aprobada a un número real para verificar el circuito
                        completo: envío → webhook de Meta → <code className="font-mono">message_logs</code>.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <Input
                            label="Destinatario (E.164)"
                            value={testPhone}
                            onChange={setTestPhone}
                            placeholder="59171234567"
                        />
                        <Input label="Plantilla" value={testTemplate} onChange={setTestTemplate} />
                        <Input label="Idioma" value={testLanguage} onChange={setTestLanguage} />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Variables (una por línea)
                        </label>
                        <textarea
                            value={testParams}
                            onChange={(e) => setTestParams(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSendTest}
                        disabled={isPending || !testPhone}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {isPending ? 'Enviando…' : 'Enviar prueba'}
                    </button>
                </div>
            )}

            {feedback && (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        feedback.tone === 'ok'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}
                >
                    {feedback.text}
                    {pendingMessageId && (
                        <span className="mt-1 block text-xs opacity-75">
                            Consultando estado de entrega…
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {label}
            </label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
        </div>
    );
}
