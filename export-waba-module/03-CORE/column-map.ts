/**
 * src/lib/waba/column-map.ts
 * ---------------------------------------------------------------------------
 * ⭐ PUNTO DE ADAPTACIÓN Y CONFIGURACIÓN DEL MÓDULO.
 *
 * Contiene tres cosas:
 *
 *   1. Los alias de tabla/columna (`T` y `C`), que documentan en un solo sitio
 *      qué necesita el módulo de la base de datos.
 *   2. La validación de entorno con verificación de existencia: si falta una
 *      variable, el módulo se desactiva de forma explícita en vez de fallar a
 *      medias en producción.
 *   3. Las constantes compartidas (versión de la Graph API, estados canónicos).
 *
 * ⚠️ DÓNDE SE ADAPTAN REALMENTE LOS NOMBRES DE COLUMNA
 *
 * `waba.repository.ts` importa las tablas del schema de Drizzle directamente,
 * para conservar la inferencia de tipos (`$inferSelect` / `$inferInsert`), que
 * se perdería al pasar por un mapa intermedio.
 *
 * Por tanto: **si una columna se llama distinto en SaaS TOI, el cambio se hace
 * en `db/schema/waba.ts`** —la propiedad de Drizzle apunta al nombre real de la
 * columna— y el resto del módulo sigue funcionando sin tocar nada.
 *
 *     accessTokenEncrypted: text('mi_columna_real'),   // ← aquí
 *
 * `T` y `C` sirven como referencia legible y como punto de enganche si más
 * adelante quieres construir consultas dinámicas.
 */

import { wabaConfigs, messageLogs, wabaWebhookDeadletter } from '@/db/schema/waba';

/* ==========================================================================
 * 1. Tablas
 * ==========================================================================
 * Si tus tablas se llaman distinto, cambia SOLO estos imports/alias.
 */

export const T = {
    wabaConfigs,
    messageLogs,
    deadletter: wabaWebhookDeadletter,
} as const;

/* ==========================================================================
 * 2. Columnas
 * ==========================================================================
 * Alias estables usados por el repositorio. Si tu columna se llama, p.ej.,
 * `encrypted_token` en vez de `access_token_encrypted`, basta con que la
 * propiedad del schema de Drizzle apunte ahí; aquí no cambia nada.
 *
 * Si tu propiedad de Drizzle tiene otro nombre (p.ej. `orgId` en vez de
 * `organizationId`), cámbialo en la línea correspondiente.
 */

export const C = {
    config: {
        id: wabaConfigs.id,
        orgId: wabaConfigs.organizationId,
        wabaId: wabaConfigs.wabaId,
        phoneNumberId: wabaConfigs.phoneNumberId,
        displayPhoneNumber: wabaConfigs.displayPhoneNumber,
        verifiedName: wabaConfigs.verifiedName,
        businessId: wabaConfigs.businessId,
        metaUserId: wabaConfigs.metaUserId,
        token: wabaConfigs.accessTokenEncrypted,
        isActive: wabaConfigs.isActive,
        status: wabaConfigs.connectionStatus,
        lastError: wabaConfigs.lastError,
        lastSyncedAt: wabaConfigs.lastSyncedAt,
        createdAt: wabaConfigs.createdAt,
        updatedAt: wabaConfigs.updatedAt,
    },
    log: {
        id: messageLogs.id,
        orgId: messageLogs.organizationId,
        configId: messageLogs.wabaConfigId,
        subscriberId: messageLogs.subscriberId,
        messageId: messageLogs.messageId,
        direction: messageLogs.direction,
        channel: messageLogs.channel,
        recipientPhone: messageLogs.recipientPhone,
        templateName: messageLogs.templateName,
        messageText: messageLogs.messageText,
        status: messageLogs.status,
        lastEventAt: messageLogs.lastEventAt,
        createdAt: messageLogs.createdAt,
    },
} as const;

/* ==========================================================================
 * 3. Configuración de entorno, con verificación de existencia
 * ========================================================================== */

/** Variables sin las cuales el módulo NO puede operar. */
const REQUIRED_ENV = [
    'NEXT_PUBLIC_META_APP_ID',
    'META_APP_SECRET',
    'META_WEBHOOK_VERIFY_TOKEN',
    'WABA_ENCRYPTION_KEY',
] as const;

/** Variables necesarias solo para el Embedded Signup (conexión automática). */
const SIGNUP_ENV = ['NEXT_PUBLIC_META_CONFIG_ID'] as const;

export interface WabaEnvStatus {
    /** true si el módulo puede enviar mensajes y recibir webhooks. */
    ready: boolean;
    /** true si además puede ofrecer el botón de Embedded Signup. */
    embeddedSignupReady: boolean;
    missing: string[];
    warnings: string[];
}

/**
 * Comprueba el entorno sin lanzar. Úsalo en la UI para mostrar un panel de
 * "módulo no configurado" en vez de un error 500.
 */
export function checkWabaEnv(): WabaEnvStatus {
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const key of REQUIRED_ENV) {
        if (!process.env[key]) missing.push(key);
    }

    const signupMissing = SIGNUP_ENV.filter((key) => !process.env[key]);

    const key = process.env.WABA_ENCRYPTION_KEY;
    if (key) {
        const bytes = /^[0-9a-fA-F]{64}$/.test(key) ? 32 : Buffer.from(key, 'base64').length;
        if (bytes !== 32) {
            missing.push(`WABA_ENCRYPTION_KEY (tiene ${bytes} bytes, AES-256-GCM requiere 32)`);
        }
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
        warnings.push('NEXT_PUBLIC_APP_URL no definida: las URLs absolutas pueden fallar.');
    }

    if (process.env.META_WEBHOOK_ENFORCE_SIGNATURE === 'false') {
        warnings.push(
            'META_WEBHOOK_ENFORCE_SIGNATURE=false → el webhook acepta payloads sin firma. Solo para depuración local.'
        );
    }

    return {
        ready: missing.length === 0,
        embeddedSignupReady: missing.length === 0 && signupMissing.length === 0,
        missing: [...missing, ...signupMissing],
        warnings,
    };
}

/** Lanza si el entorno no está listo. Úsalo al inicio de cada Server Action. */
export function assertWabaEnv(): void {
    const status = checkWabaEnv();
    if (!status.ready) {
        throw new Error(
            `[WABA] Módulo no configurado. Faltan variables de entorno: ${status.missing.join(', ')}`
        );
    }
}

/* ==========================================================================
 * 4. Constantes del módulo
 * ========================================================================== */

export const WABA_CONFIG = {
    /** Versión de la Graph API. Centralizada: en el origen estaba duplicada en 2 sitios. */
    graphVersion: process.env.META_GRAPH_VERSION ?? 'v22.0',
    get graphBaseUrl() {
        return `https://graph.facebook.com/${this.graphVersion}`;
    },
    appId: process.env.NEXT_PUBLIC_META_APP_ID ?? '',
    appSecret: process.env.META_APP_SECRET ?? '',
    configId: process.env.NEXT_PUBLIC_META_CONFIG_ID ?? '',
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN ?? '',
    /** Por defecto SÍ se exige firma. Solo se desactiva explícitamente. */
    enforceWebhookSignature: process.env.META_WEBHOOK_ENFORCE_SIGNATURE !== 'false',
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
    /** Prefijo telefónico por defecto del país de operación (Bolivia). */
    defaultCountryCode: process.env.WABA_DEFAULT_COUNTRY_CODE ?? '591',
    /** Timeout de las llamadas a Meta, en ms. */
    requestTimeoutMs: Number(process.env.WABA_REQUEST_TIMEOUT_MS ?? 15_000),
} as const;

/* ==========================================================================
 * 5. Estados canónicos
 * ========================================================================== */

export const MESSAGE_STATUS = {
    ACCEPTED: 'accepted',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
    RECEIVED: 'received',
} as const;

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

/** Estados terminales: la UI deja de hacer polling al alcanzarlos. */
export const FINAL_STATUSES: ReadonlySet<string> = new Set([
    MESSAGE_STATUS.DELIVERED,
    MESSAGE_STATUS.READ,
    MESSAGE_STATUS.FAILED,
]);

export const CONNECTION_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    REVOKED: 'revoked',
    ERROR: 'error',
    PENDING_REGISTRATION: 'pending_registration',
} as const;
