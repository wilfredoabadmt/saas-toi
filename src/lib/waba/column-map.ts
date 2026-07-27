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
 * ⚠️ ADAPTACIÓN AL PROYECTO
 *
 * El export module esperaba tablas en `@/db/schema/waba` con columnas como
 * `access_token_encrypted`, `display_phone_number`, `message_id`, `status`.
 * Este proyecto tiene esas columnas con NOMBRES DIFERENTES:
 *   · `encrypted_token` (no access_token_encrypted)
 *   · `display_phone`   (no display_phone_number)
 *   · `wamid`           (no message_id)
 *   · `delivery_status` (no status)
 *   · `failure_reason`  (no error_message)
 *
 * La solución: los imports apuntan a los schema REALES del proyecto, y las
 * propiedades de Drizzle mapean a las columnas correctas. El resto del módulo
 * (repository, webhook, actions) usa las propiedades de Drizzle, no los
 * nombres de columna directamente.
 */

import { wabaConfigs } from '@/db/schema/waba-configs';
import { messageLogs } from '@/db/schema/message-logs';
import { wabaWebhookDeadletter } from '@/db/schema/waba-webhook-deadletter';

/* ==========================================================================
 * 1. Tablas
 * ========================================================================== */

export const T = {
    wabaConfigs,
    messageLogs,
    deadletter: wabaWebhookDeadletter,
} as const;

/* ==========================================================================
 * 2. Columnas — MAPEO AL PROYECTO REAL
 * ==========================================================================
 * Las propiedades apuntan a las propiedades de Drizzle del schema real.
 * Ejemplo: `token` apunta a `wabaConfigs.encryptedToken`, que en la DB
 * es la columna `encrypted_token`.
 */

export const C = {
    config: {
        id: wabaConfigs.id,
        orgId: wabaConfigs.organizationId,
        wabaId: wabaConfigs.wabaId,
        phoneNumberId: wabaConfigs.phoneNumberId,
        displayPhone: wabaConfigs.displayPhone,
        verifiedName: wabaConfigs.verifiedName,
        businessId: wabaConfigs.businessId,
        metaUserId: wabaConfigs.metaUserId,
        token: wabaConfigs.encryptedToken,
        keyVersion: wabaConfigs.keyVersion,
        isActive: wabaConfigs.isActive,
        status: wabaConfigs.connectionStatus,
        connectedAt: wabaConfigs.connectedAt,
        disconnectedAt: wabaConfigs.disconnectedAt,
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
        wamid: messageLogs.wamid,
        direction: messageLogs.direction,
        channel: messageLogs.channel,
        recipientPhone: messageLogs.recipientPhone,
        templateName: messageLogs.templateName,
        templateLanguage: messageLogs.templateLanguage,
        messageText: messageLogs.messageText,
        deliveryStatus: messageLogs.deliveryStatus,
        errorCode: messageLogs.errorCode,
        errorTitle: messageLogs.errorTitle,
        failureReason: messageLogs.failureReason,
        rawPayload: messageLogs.rawPayload,
        lastEventAt: messageLogs.lastEventAt,
        createdAt: messageLogs.createdAt,
    },
} as const;

/* ==========================================================================
 * 3. Configuración de entorno
 * ========================================================================== */

const REQUIRED_ENV = [
    'NEXT_PUBLIC_META_APP_ID',
    'META_APP_SECRET',
    'WEBHOOK_VERIFY_TOKEN',
    'ENCRYPTION_KEY',
] as const;

const SIGNUP_ENV = ['NEXT_PUBLIC_META_CONFIG_ID'] as const;

export interface WabaEnvStatus {
    ready: boolean;
    embeddedSignupReady: boolean;
    missing: string[];
    warnings: string[];
}

export function checkWabaEnv(): WabaEnvStatus {
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const key of REQUIRED_ENV) {
        if (!process.env[key]) missing.push(key);
    }
    for (const key of SIGNUP_ENV) {
        if (!process.env[key]) warnings.push(`${key} no definida — Embedded Signup no disponible`);
    }

    return {
        ready: missing.length === 0,
        embeddedSignupReady: warnings.length === 0 && missing.length === 0,
        missing,
        warnings,
    };
}

/**
 * Lanza si el entorno no está listo. Úsalo al inicio de cualquier server
 * action o route handler que dependa del módulo.
 */
export function assertWabaEnv(): void {
    const status = checkWabaEnv();
    if (!status.ready) {
        throw new Error(
            `[WABA] Módulo no configurado. Variables faltantes: ${status.missing.join(', ')}. ` +
                'Consulta src/lib/waba/column-map.ts para más detalles.'
        );
    }
}

/* ==========================================================================
 * 4. Constantes del módulo
 * ========================================================================== */

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v22.0';
const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || '';

export const WABA_CONFIG = {
    graphVersion: META_GRAPH_VERSION,
    graphBaseUrl: `https://graph.facebook.com/${META_GRAPH_VERSION}`,
    appId: META_APP_ID,
    appSecret: process.env.META_APP_SECRET || '',
    webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || '',
    enforceWebhookSignature: process.env.META_WEBHOOK_ENFORCE_SIGNATURE !== 'false',
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
    defaultCountryCode: process.env.WABA_DEFAULT_COUNTRY_CODE || '591',
    requestTimeoutMs: Number(process.env.WABA_REQUEST_TIMEOUT_MS) || 15_000,
} as const;

export const CONNECTION_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    REVOKED: 'revoked',
    ERROR: 'error',
    PENDING: 'pending_registration',
} as const;

export const MESSAGE_STATUS = {
    ACCEPTED: 'accepted',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
    RECEIVED: 'received',
} as const;
