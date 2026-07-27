'use client';

/**
 * src/components/waba/EmbeddedSignupButton.tsx
 * ---------------------------------------------------------------------------
 * Botón de Meta Embedded Signup: el cliente conecta SU PROPIO número de
 * WhatsApp Business sin salir de SaaS TOI.
 *
 * Patrón de reconciliación: Meta entrega los datos por DOS canales asíncronos
 * (FB.login → code, postMessage → waba_id + phone_number_id). Este componente
 * acumula ambos en un ref y dispara el canje solo cuando están los tres valores.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        FB?: {
            init: (options: Record<string, unknown>) => void;
            login: (callback: (response: FBLoginResponse) => void, options: Record<string, unknown>) => void;
        };
        fbAsyncInit?: () => void;
    }
}

interface FBLoginResponse {
    authResponse?: { code?: string };
    status?: string;
}

interface PendingSignup {
    code?: string;
    wabaId?: string;
    phoneNumberId?: string;
}

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;
const GRAPH_VERSION = process.env.NEXT_PUBLIC_META_GRAPH_VERSION ?? 'v22.0';
const SESSION_KEY = 'saastoi_waba_signup';
const EXCHANGE_ENDPOINT = '/api/waba/exchange-token';

interface Props {
    onSuccess?: (data: { wabaId: string; phoneNumberId: string }) => void;
    onError?: (message: string) => void;
    className?: string;
    label?: string;
}

export function EmbeddedSignupButton({
    onSuccess,
    onError,
    className,
    label = 'Conectar WhatsApp Business',
}: Props) {
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const pendingRef = useRef<PendingSignup>({});
    const inFlightRef = useRef(false);
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onSuccessRef.current = onSuccess;
        onErrorRef.current = onError;
    }, [onSuccess, onError]);

    const fail = useCallback((message: string) => {
        setLocalError(message);
        setIsLoading(false);
        onErrorRef.current?.(message);
    }, []);

    /* ---------------------------------------------------------------------
     * Canje en el backend
     * ------------------------------------------------------------------- */

    const exchange = useCallback(
        async (payload: Required<PendingSignup>) => {
            if (inFlightRef.current) return;
            inFlightRef.current = true;
            setLocalError(null);

            try {
                const response = await fetch(EXCHANGE_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: payload.code,
                        waba_id: payload.wabaId,
                        phone_number_id: payload.phoneNumberId,
                    }),
                });

                const result = await response.json();

                if (!response.ok || result.error) {
                    throw new Error(result.error ?? 'Error desconocido al canjear el código.');
                }

                sessionStorage.removeItem(SESSION_KEY);
                pendingRef.current = {};

                if (result.webhookSubscribed === false) {
                    setLocalError(
                        'Número conectado, pero el webhook no quedó suscrito. ' +
                            'Usa "Reintentar suscripción" para recibir los estados de entrega.'
                    );
                }

                onSuccessRef.current?.({
                    wabaId: payload.wabaId,
                    phoneNumberId: payload.phoneNumberId,
                });
            } catch (error) {
                fail(
                    error instanceof Error
                        ? error.message
                        : 'El número se vinculó en Meta, pero no se pudo guardar la conexión.'
                );
            } finally {
                inFlightRef.current = false;
                setIsLoading(false);
            }
        },
        [fail]
    );

    /** Dispara el canje solo cuando están los TRES valores. */
    const flushPending = useCallback(() => {
        const { code, wabaId, phoneNumberId } = pendingRef.current;
        if (!code || !wabaId || !phoneNumberId) return;
        void exchange({ code, wabaId, phoneNumberId });
    }, [exchange]);

    /* ---------------------------------------------------------------------
     * Canal 2: postMessage con waba_id / phone_number_id
     * ------------------------------------------------------------------- */

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://www.facebook.com') return;

            try {
                const data = JSON.parse(event.data) as {
                    type?: string;
                    event?: string;
                    data?: { waba_id?: string; phone_number_id?: string };
                };

                if (data.type !== 'WA_EMBEDDED_SIGNUP') return;

                if (data.event === 'CANCEL' || data.event === 'ERROR') {
                    fail('El usuario canceló la vinculación en Meta.');
                    return;
                }

                const wabaId = data.data?.waba_id;
                const phoneNumberId = data.data?.phone_number_id;
                if (!wabaId || !phoneNumberId) return;

                pendingRef.current = { ...pendingRef.current, wabaId, phoneNumberId };
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(pendingRef.current));

                flushPending();
            } catch {
                // Meta emite también mensajes no-JSON: se ignoran.
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [flushPending, fail]);

    /* ---------------------------------------------------------------------
     * Carga del SDK de Facebook
     * ------------------------------------------------------------------- */

    useEffect(() => {
        if (!APP_ID || !CONFIG_ID) return;

        if (window.FB) {
            setSdkLoaded(true);
            return;
        }

        if (document.getElementById('facebook-jssdk')) {
            const interval = setInterval(() => {
                if (window.FB) {
                    setSdkLoaded(true);
                    clearInterval(interval);
                }
            }, 100);
            return () => clearInterval(interval);
        }

        window.fbAsyncInit = () => {
            window.FB?.init({
                appId: APP_ID,
                autoLogAppEvents: true,
                xfbml: true,
                version: GRAPH_VERSION,
            });
            setSdkLoaded(true);
        };

        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/es_LA/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.onerror = () =>
            fail('No se pudo cargar el SDK de Facebook. Revisa tu conexión o el bloqueador de anuncios.');
        document.body.appendChild(script);
    }, [fail]);

    /* ---------------------------------------------------------------------
     * Canal 1: FB.login
     * ------------------------------------------------------------------- */

    const launch = useCallback(() => {
        if (!APP_ID) return fail('Falta NEXT_PUBLIC_META_APP_ID.');
        if (!CONFIG_ID) return fail('Falta NEXT_PUBLIC_META_CONFIG_ID.');
        if (!sdkLoaded || !window.FB) return fail('El SDK de Facebook aún se está cargando.');

        pendingRef.current = {};
        setLocalError(null);
        setIsLoading(true);

        window.FB.login(
            (response: FBLoginResponse) => {
                const code = response.authResponse?.code;

                if (!code) {
                    setIsLoading(false);
                    fail(
                        response.status === 'unknown' || !response.authResponse
                            ? 'Se canceló la autorización de Meta.'
                            : 'No se pudo vincular el número. Verifica tu acceso en Meta Business Manager.'
                    );
                    return;
                }

                pendingRef.current = { ...pendingRef.current, code };
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(pendingRef.current));
                flushPending();
            },
            {
                config_id: CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    setup: {},
                    featureType: 'whatsapp_business_app_onboarding',
                    sessionInfoVersion: '3',
                },
            }
        );
    }, [sdkLoaded, flushPending, fail]);

    /* ---------------------------------------------------------------------
     * Render
     * ------------------------------------------------------------------- */

    const notConfigured = !APP_ID || !CONFIG_ID;
    const disabled = notConfigured || isLoading || !sdkLoaded;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
            <button
                type="button"
                onClick={launch}
                disabled={disabled}
                className={className || 'btn-whatsapp-glossy'}
                style={
                    className
                        ? undefined
                        : {
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              opacity: disabled ? 0.5 : 1,
                          }
                }
            >
                {isLoading ? (
                    <>
                        <Spinner />
                        Guardando conexión…
                    </>
                ) : !sdkLoaded && !notConfigured ? (
                    <>
                        <Spinner />
                        Cargando…
                    </>
                ) : (
                    <>
                        <WhatsAppIcon />
                        {label}
                    </>
                )}
            </button>

            {notConfigured && (
                <p style={{
                    maxWidth: '28rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fontSize: '0.75rem',
                    color: '#d97706',
                }}>
                    Configura <code style={{ fontFamily: 'monospace' }}>NEXT_PUBLIC_META_APP_ID</code> y{' '}
                    <code style={{ fontFamily: 'monospace' }}>NEXT_PUBLIC_META_CONFIG_ID</code> en Coolify
                    para habilitar la conexión automática.
                </p>
            )}

            {localError && (
                <p style={{
                    maxWidth: '28rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--status-danger-bg)',
                    backgroundColor: 'var(--status-danger-bg)',
                    fontSize: '0.75rem',
                    color: 'var(--status-danger-text)',
                }}>
                    {localError}
                </p>
            )}
        </div>
    );
}

function Spinner() {
    return (
        <svg style={{ width: '1rem', height: '1rem', flexShrink: 0, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

function WhatsAppIcon() {
    return (
        <svg style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
    );
}
