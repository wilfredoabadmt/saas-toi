'use client';

/**
 * src/components/waba/EmbeddedSignupButton.tsx
 * ---------------------------------------------------------------------------
 * Botón de Meta Embedded Signup: el cliente conecta SU PROPIO número de
 * WhatsApp Business sin salir de SaaS TOI.
 *
 * Portado de `src/components/EmbeddedSignupButton.tsx` del origen, conservando
 * el patrón de reconciliación —que es lo verdaderamente difícil de este flujo—
 * y quitando el estado de debug, que ahí ocupaba media pantalla.
 *
 * ⚠️ EL PROBLEMA QUE RESUELVE ESTE COMPONENTE
 *
 * Meta entrega los datos por DOS canales asíncronos, en orden NO garantizado:
 *
 *   1. `FB.login(callback)` → `authResponse.code`
 *   2. `window.postMessage` desde https://www.facebook.com
 *      → `{ type: 'WA_EMBEDDED_SIGNUP', data: { waba_id, phone_number_id } }`
 *
 * El `code` NO incluye el waba_id ni el phone_number_id. Si canjeas en cuanto
 * llega el code, te faltan los identificadores; si esperas al postMessage y ya
 * había llegado, lo pierdes.
 *
 * Solución: acumular ambos en un ref y disparar el canje solo cuando estén los
 * tres valores (`flushPending`), con `sessionStorage` como red de seguridad
 * ante recargas.
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
            // 🔒 Comprobación de origen obligatoria: sin ella, cualquier iframe
            // podría inyectar identificadores falsos.
            if (event.origin !== 'https://www.facebook.com') return;

            try {
                const data = JSON.parse(event.data) as {
                    type?: string;
                    event?: string;
                    data?: { waba_id?: string; phone_number_id?: string };
                };

                if (data.type !== 'WA_EMBEDDED_SIGNUP') return;

                // Meta emite también eventos de cancelación/error del flujo.
                if (data.event === 'CANCEL' || data.event === 'ERROR') {
                    fail('El usuario canceló la vinculación en Meta.');
                    return;
                }

                const wabaId = data.data?.waba_id;
                const phoneNumberId = data.data?.phone_number_id;
                if (!wabaId || !phoneNumberId) return;

                pendingRef.current = { ...pendingRef.current, wabaId, phoneNumberId };

                // Red de seguridad ante recarga de página a mitad del flujo.
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

        // Si otro componente ya inyectó el script, solo hay que esperar.
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
                override_default_response_type: true, // ⚠️ imprescindible
                extras: {
                    setup: {},
                    featureType: 'whatsapp_business_app_onboarding',
                    sessionInfoVersion: '3', // v3 es la que emite el postMessage
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
        <div className="flex flex-col items-start gap-3">
            <button
                type="button"
                onClick={launch}
                disabled={disabled}
                className={
                    className ??
                    'inline-flex items-center gap-3 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
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
                <p className="max-w-md rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    Configura <code className="font-mono">NEXT_PUBLIC_META_APP_ID</code> y{' '}
                    <code className="font-mono">NEXT_PUBLIC_META_CONFIG_ID</code> en Coolify
                    para habilitar la conexión automática.
                </p>
            )}

            {localError && (
                <p className="max-w-md rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                    {localError}
                </p>
            )}
        </div>
    );
}

function Spinner() {
    return (
        <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

function WhatsAppIcon() {
    return (
        <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
    );
}
