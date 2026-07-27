/**
 * src/lib/waba/graph-client.ts
 * ---------------------------------------------------------------------------
 * Cliente de la Meta Graph API para WhatsApp Business Cloud.
 *
 * Portado de `src/utils/whatsapp.ts` del origen, con estas mejoras:
 *   · Versión de API centralizada (en el origen estaba duplicada, GOTCHAS G-16)
 *   · Errores tipados con código/subcódigo de Meta, no strings sueltos
 *   · Timeout y AbortController (el origen podía colgarse indefinidamente)
 *   · Clasificación de errores para decidir si desactivar la conexión
 *   · Los logs NUNCA incluyen el token
 */

import { WABA_CONFIG } from './column-map';

/* ==========================================================================
 * Tipos de la API de Meta
 * ========================================================================== */

export interface WhatsAppPhoneProfile {
    id: string;
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
    code_verification_status?: string;
    name_status?: string;
    platform_type?: string;
    throughput?: { level?: string };
}

export interface WhatsAppTemplateComponent {
    type?: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS' | string;
    text?: string;
    format?: string;
    example?: unknown;
    buttons?: Array<{ type?: string; text?: string; url?: string }>;
}

export interface WhatsAppTemplateSummary {
    id: string;
    name: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED' | string;
    language: string;
    category?: string;
    sub_category?: string;
    components?: WhatsAppTemplateComponent[];
}

export interface SendMessageResponse {
    messaging_product?: string;
    messages?: Array<{ id: string }>;
    contacts?: Array<{ wa_id?: string; input?: string }>;
}

interface MetaErrorEnvelope {
    error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        error_user_title?: string;
        error_user_msg?: string;
        fbtrace_id?: string;
    };
}

/* ==========================================================================
 * Error tipado
 * ========================================================================== */

export class MetaGraphError extends Error {
    readonly code?: number;
    readonly subcode?: number;
    readonly type?: string;
    readonly httpStatus: number;
    readonly userTitle?: string;
    readonly userMessage?: string;
    readonly fbtraceId?: string;

    constructor(
        message: string,
        opts: {
            code?: number;
            subcode?: number;
            type?: string;
            httpStatus: number;
            userTitle?: string;
            userMessage?: string;
            fbtraceId?: string;
        }
    ) {
        super(message);
        this.name = 'MetaGraphError';
        this.code = opts.code;
        this.subcode = opts.subcode;
        this.type = opts.type;
        this.httpStatus = opts.httpStatus;
        this.userTitle = opts.userTitle;
        this.userMessage = opts.userMessage;
        this.fbtraceId = opts.fbtraceId;
    }

    /**
     * ¿Este error significa que la conexión ya no sirve?
     * Si es true, marca `waba_configs.is_active = false` en vez de reventar la
     * página. Patrón heredado del origen (`shouldMarkConnectionInactive`), que
     * ahí se basaba en substrings; aquí usamos los códigos oficiales de Meta.
     */
    get invalidatesConnection(): boolean {
        // 190 = token inválido/expirado · 102 = sesión caducada
        // 10 / 200-299 = falta de permisos · 803 = objeto inexistente
        if (this.code === 190 || this.code === 102 || this.code === 10 || this.code === 803) {
            return true;
        }
        if (this.code !== undefined && this.code >= 200 && this.code <= 299) {
            return true;
        }

        const m = this.message.toLowerCase();
        return (
            m.includes('unsupported get request') ||
            m.includes('does not exist') ||
            m.includes('no longer exists') ||
            m.includes('invalid oauth access token') ||
            m.includes('session has expired') ||
            m.includes('permission error')
        );
    }

    /** ¿Merece la pena reintentar? (rate limit o error transitorio de Meta) */
    get isRetryable(): boolean {
        // 4 / 80007 = rate limit de la aplicación · 131048 = límite de spam
        // 1 / 2 = errores internos temporales de Meta
        return (
            this.code === 4 ||
            this.code === 80007 ||
            this.code === 1 ||
            this.code === 2 ||
            this.httpStatus === 429 ||
            this.httpStatus >= 500
        );
    }

    /** ¿El destinatario no existe en WhatsApp? Dispara el reintento de formatos. */
    get isUnregisteredRecipient(): boolean {
        return this.code === 131026 || this.message.includes('Account not registered');
    }
}

/* ==========================================================================
 * Cliente
 * ========================================================================== */

export interface GraphRequestOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
    timeoutMs?: number;
}

/**
 * Llamada genérica a la Graph API.
 *
 * @param pathWithQuery ruta relativa, p.ej. `/{phoneNumberId}/messages`
 * @param accessToken   token YA DESCIFRADO (nunca se loguea)
 */
export async function metaGraphRequest<T>(
    pathWithQuery: string,
    accessToken: string,
    options: GraphRequestOptions = {}
): Promise<T> {
    if (!accessToken) {
        throw new MetaGraphError('[WABA] Falta el access token.', { httpStatus: 401 });
    }

    const path = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
    const url = `${WABA_CONFIG.graphBaseUrl}${path}`;

    const { body, timeoutMs, headers, ...rest } = options;
    const controller = new AbortController();
    const timer = setTimeout(
        () => controller.abort(),
        timeoutMs ?? WABA_CONFIG.requestTimeoutMs
    );

    let response: Response;
    try {
        response = await fetch(url, {
            ...rest,
            signal: controller.signal,
            cache: 'no-store',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...(headers ?? {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (error) {
        clearTimeout(timer);
        if ((error as Error).name === 'AbortError') {
            throw new MetaGraphError(
                `[WABA] Meta no respondió en ${timeoutMs ?? WABA_CONFIG.requestTimeoutMs} ms.`,
                { httpStatus: 504 }
            );
        }
        throw new MetaGraphError(
            `[WABA] Error de red hacia Meta: ${(error as Error).message}`,
            { httpStatus: 0 }
        );
    } finally {
        clearTimeout(timer);
    }

    const raw = await response.text();
    let data: (T & MetaErrorEnvelope) | null = null;

    try {
        data = raw ? (JSON.parse(raw) as T & MetaErrorEnvelope) : null;
    } catch {
        throw new MetaGraphError(
            `[WABA] Respuesta no-JSON de Meta (HTTP ${response.status}).`,
            { httpStatus: response.status }
        );
    }

    if (!response.ok || data?.error) {
        const e = data?.error;
        throw new MetaGraphError(
            e?.error_user_msg ??
                e?.message ??
                `Meta Graph API devolvió HTTP ${response.status}.`,
            {
                code: e?.code,
                subcode: e?.error_subcode,
                type: e?.type,
                httpStatus: response.status,
                userTitle: e?.error_user_title,
                userMessage: e?.error_user_msg,
                fbtraceId: e?.fbtrace_id,
            }
        );
    }

    return data as T;
}

/** Reintento con backoff exponencial, solo para errores marcados como retryable. */
export async function metaGraphRequestWithRetry<T>(
    pathWithQuery: string,
    accessToken: string,
    options: GraphRequestOptions = {},
    maxAttempts = 3
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await metaGraphRequest<T>(pathWithQuery, accessToken, options);
        } catch (error) {
            lastError = error;
            const retryable = error instanceof MetaGraphError && error.isRetryable;
            if (!retryable || attempt === maxAttempts) break;
            await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
        }
    }

    throw lastError;
}

/* ==========================================================================
 * Operaciones de alto nivel
 * ========================================================================== */

/** Perfil del número emisor. Requiere `whatsapp_business_management`. */
export function fetchPhoneProfile(phoneNumberId: string, token: string) {
    return metaGraphRequest<WhatsAppPhoneProfile>(
        `/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,` +
            `code_verification_status,name_status,platform_type,throughput`,
        token
    );
}

/** Plantillas de la WABA. Requiere `whatsapp_business_management`. */
export async function fetchTemplates(
    wabaId: string,
    token: string,
    limit = 100
): Promise<WhatsAppTemplateSummary[]> {
    const res = await metaGraphRequest<{ data?: WhatsAppTemplateSummary[] }>(
        `/${wabaId}/message_templates?fields=id,name,status,language,category,` +
            `sub_category,components&limit=${limit}`,
        token
    );
    return (res.data ?? []).sort((a, b) => a.name.localeCompare(b.name));
}

/** Apps suscritas al WABA (para verificar que el webhook llegará). */
export async function fetchSubscribedApps(wabaId: string, token: string) {
    const res = await metaGraphRequest<{
        data?: Array<{ whatsapp_business_api_data?: { id?: string; name?: string; link?: string } }>;
    }>(`/${wabaId}/subscribed_apps`, token);

    return (res.data ?? [])
        .map((entry) => entry.whatsapp_business_api_data ?? {})
        .filter((entry) => entry.id || entry.name || entry.link);
}

/**
 * Suscribe la app al WABA para recibir webhooks.
 *
 * ⚠️ Llama a esto INMEDIATAMENTE DESPUÉS del canje del token.
 * El origen tenía la función pero nunca la invocaba automáticamente
 * (GOTCHAS G-17): sin esto, la conexión se guarda pero **no llegan webhooks**
 * y los mensajes se quedan eternamente en `accepted`.
 */
export function subscribeAppToWaba(wabaId: string, token: string) {
    return metaGraphRequest<{ success?: boolean }>(`/${wabaId}/subscribed_apps`, token, {
        method: 'POST',
    });
}

/** Envía una plantilla aprobada. Requiere `whatsapp_business_messaging`. */
export function sendTemplateMessage(
    phoneNumberId: string,
    token: string,
    payload: {
        to: string;
        templateName: string;
        languageCode: string;
        components?: unknown[];
    }
) {
    return metaGraphRequest<SendMessageResponse>(`/${phoneNumberId}/messages`, token, {
        method: 'POST',
        body: {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: payload.to,
            type: 'template',
            template: {
                name: payload.templateName,
                language: { code: payload.languageCode },
                ...(payload.components?.length ? { components: payload.components } : {}),
            },
        },
    });
}

/** Mensaje de texto libre. Solo válido dentro de la ventana de servicio de 24 h. */
export function sendTextMessage(
    phoneNumberId: string,
    token: string,
    payload: { to: string; body: string; previewUrl?: boolean }
) {
    return metaGraphRequest<SendMessageResponse>(`/${phoneNumberId}/messages`, token, {
        method: 'POST',
        body: {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: payload.to,
            type: 'text',
            text: { body: payload.body, preview_url: payload.previewUrl ?? false },
        },
    });
}

/** Crea una plantilla en la WABA (queda en PENDING hasta que Meta la apruebe). */
export function createTemplate(
    wabaId: string,
    token: string,
    payload: {
        name: string;
        language: string;
        category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
        components: unknown[];
        allowCategoryChange?: boolean;
    }
) {
    return metaGraphRequest<{ id?: string; status?: string; category?: string }>(
        `/${wabaId}/message_templates`,
        token,
        {
            method: 'POST',
            body: {
                name: payload.name,
                language: payload.language,
                category: payload.category,
                allow_category_change: payload.allowCategoryChange ?? true,
                components: payload.components,
            },
        }
    );
}

/** Elimina una plantilla por nombre. */
export function deleteTemplate(wabaId: string, token: string, templateName: string) {
    return metaGraphRequest<{ success?: boolean }>(
        `/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`,
        token,
        { method: 'DELETE' }
    );
}

/* ==========================================================================
 * Canje del código de Embedded Signup
 * ==========================================================================
 * NO usa metaGraphRequest porque va sin Bearer: las credenciales van en la
 * query string.
 */

export interface TokenExchangeResult {
    access_token: string;
    token_type?: string;
    expires_in?: number;
}

/**
 * Cambia el `code` del Embedded Signup por un token de larga duración.
 *
 * ⚠️ NO se envía `redirect_uri`. En el flujo popup Meta emite el código sin
 * destino de redirección; incluirlo produce "verification code mismatch".
 * Está documentado en el origen (`exchange-token/route.ts:12-17`) y es la
 * causa nº1 de fallos al implementar Embedded Signup.
 */
export async function exchangeCodeForToken(code: string): Promise<TokenExchangeResult> {
    const url = new URL(`${WABA_CONFIG.graphBaseUrl}/oauth/access_token`);
    url.searchParams.set('client_id', WABA_CONFIG.appId);
    url.searchParams.set('client_secret', WABA_CONFIG.appSecret);
    url.searchParams.set('code', code);

    const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    const data = (await response.json()) as TokenExchangeResult & MetaErrorEnvelope;

    if (!response.ok || data.error) {
        throw new MetaGraphError(
            data.error?.message ?? `El canje del token falló (HTTP ${response.status}).`,
            {
                code: data.error?.code,
                subcode: data.error?.error_subcode,
                httpStatus: response.status,
                fbtraceId: data.error?.fbtrace_id,
            }
        );
    }

    if (!data.access_token) {
        throw new MetaGraphError('[WABA] Meta no devolvió access_token.', {
            httpStatus: response.status,
        });
    }

    return data;
}

/** ID del usuario de Meta que autorizó. Necesario para el callback de deauthorize. */
export async function fetchMetaUserId(token: string): Promise<string | null> {
    try {
        const res = await metaGraphRequest<{ id?: string }>('/me?fields=id', token);
        return res.id ?? null;
    } catch {
        // No es crítico: solo degrada el flujo de desautorización automática.
        return null;
    }
}
