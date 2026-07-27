/**
 * src/app/api/waba/deauthorize/route.ts
 * ---------------------------------------------------------------------------
 * Callback de Meta cuando un usuario elimina la app desde su cuenta de Facebook.
 * Es un **requisito obligatorio** para pasar App Review.
 *
 * Meta llama con un `signed_request` firmado con el App Secret. Nuestro deber es
 * validarlo, identificar de quién se trata y purgar sus datos.
 *
 * Diferencia CRÍTICA frente al origen (`api/meta/deauthorize/route.ts`):
 *   ❌ El origen daba prioridad a la sesión del navegador sobre el signed_request:
 *      cualquier usuario autenticado podía hacer `GET /api/meta/deauthorize`
 *      sin firma y borrarse sus propios datos. Era un CSRF destructivo
 *      (GOTCHAS G-07).
 *   ✅ Aquí el `signed_request` válido es OBLIGATORIO. La sesión solo se usa
 *      para logging, jamás como fuente de identidad.
 *
 * Registra esta URL en Meta Developers → Configuración → Básica:
 *   Deauthorize Callback URL:  https://<tu-dominio>/api/waba/deauthorize
 *   Data Deletion Request URL: https://<tu-dominio>/api/waba/deauthorize
 */

import crypto from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { WABA_CONFIG } from '@/lib/waba/column-map';
import {
    findConnectionsByMetaUserId,
    purgeOrganizationWabaData,
} from '@/lib/waba/waba.repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ==========================================================================
 * Validación del signed_request
 * ========================================================================== */

function decodeBase64Url(value: string): Buffer {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        '='
    );
    return Buffer.from(padded, 'base64');
}

interface SignedRequestPayload {
    user_id?: string;
    algorithm?: string;
    issued_at?: number;
}

/**
 * Valida y decodifica el signed_request de Meta.
 * Formato: `<firma_base64url>.<payload_base64url>`
 *
 * Esta parte del origen estaba BIEN implementada (timingSafeEqual incluido)
 * y se conserva casi tal cual.
 */
function parseSignedRequest(signedRequest: string, appSecret: string): SignedRequestPayload {
    const [encodedSignature, payload] = signedRequest.split('.', 2);

    if (!encodedSignature || !payload) {
        throw new Error('Formato de signed_request inválido.');
    }

    const expected = crypto.createHmac('sha256', appSecret).update(payload).digest();
    const provided = decodeBase64Url(encodedSignature);

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        throw new Error('Firma de signed_request inválida.');
    }

    const parsed = JSON.parse(
        decodeBase64Url(payload).toString('utf-8')
    ) as SignedRequestPayload;

    if (parsed.algorithm && parsed.algorithm.toUpperCase() !== 'HMAC-SHA256') {
        throw new Error(`Algoritmo no soportado: ${parsed.algorithm}`);
    }

    // Rechaza peticiones antiguas (protección contra replay). Ventana: 1 hora.
    if (parsed.issued_at && Date.now() / 1000 - parsed.issued_at > 3600) {
        throw new Error('signed_request caducado.');
    }

    return parsed;
}

/** Extrae el signed_request de GET query, form-urlencoded o JSON. */
async function extractSignedRequest(request: NextRequest): Promise<string | null> {
    if (request.method === 'GET') {
        return request.nextUrl.searchParams.get('signed_request');
    }

    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        const value = formData.get('signed_request');
        return typeof value === 'string' ? value : null;
    }

    if (contentType.includes('application/json')) {
        const body = (await request.json().catch(() => null)) as {
            signed_request?: string;
        } | null;
        return typeof body?.signed_request === 'string' ? body.signed_request : null;
    }

    // Meta a veces manda el form sin content-type correcto.
    const text = await request.text().catch(() => '');
    return text ? new URLSearchParams(text).get('signed_request') : null;
}

/* ==========================================================================
 * Handler
 * ========================================================================== */

async function handleDeauthorize(request: NextRequest) {
    const appSecret = WABA_CONFIG.appSecret;

    if (!appSecret) {
        console.error('[WABA] META_APP_SECRET no configurada: no se puede validar el callback.');
        return NextResponse.json({ error: 'Servidor no configurado.' }, { status: 500 });
    }

    const signedRequest = await extractSignedRequest(request);

    // 🔒 OBLIGATORIO. Sin firma no se toca ningún dato.
    if (!signedRequest) {
        return NextResponse.json(
            {
                success: false,
                message: 'Falta signed_request. Este endpoint solo acepta callbacks firmados por Meta.',
            },
            { status: 400 }
        );
    }

    let metaUserId: string | null = null;
    try {
        metaUserId = parseSignedRequest(signedRequest, appSecret).user_id ?? null;
    } catch (error) {
        console.error('[WABA][SEGURIDAD] signed_request inválido:', (error as Error).message);
        return NextResponse.json(
            { success: false, message: 'signed_request inválido.' },
            { status: 401 }
        );
    }

    if (!metaUserId) {
        return NextResponse.json(
            { success: false, message: 'El signed_request no contiene user_id.' },
            { status: 400 }
        );
    }

    // Resolver qué organizaciones dependen de este usuario de Meta.
    const connections = await findConnectionsByMetaUserId(metaUserId);

    if (!connections.length) {
        // 202: Meta acepta esta respuesta. No es un error — puede que el usuario
        // nunca completara la conexión o que ya la hubiera eliminado.
        console.log('[WABA] Deauthorize sin conexiones asociadas.', { metaUserId });
        return NextResponse.json(
            {
                success: true,
                confirmation_code: crypto.randomUUID(),
                message: 'No había datos asociados a esta autorización.',
            },
            { status: 200 }
        );
    }

    const organizationIds = [...new Set(connections.map((c) => String(c.organizationId)))];

    let deletedConnections = 0;
    let deletedMessageLogs = 0;

    for (const organizationId of organizationIds) {
        try {
            const result = await purgeOrganizationWabaData(organizationId);
            deletedConnections += result.deletedConnections;
            deletedMessageLogs += result.deletedMessageLogs;
        } catch (error) {
            console.error(`[WABA] Fallo al purgar la organización ${organizationId}:`, error);
        }
    }

    const confirmationCode = crypto.randomUUID();

    console.log('[WABA] Desautorización procesada.', {
        metaUserId,
        organizationIds,
        deletedConnections,
        deletedMessageLogs,
        confirmationCode,
    });

    // Meta espera `url` + `confirmation_code` para el flujo de Data Deletion.
    return NextResponse.json({
        success: true,
        confirmation_code: confirmationCode,
        url: WABA_CONFIG.appUrl
            ? `${WABA_CONFIG.appUrl}/data-deletion?code=${confirmationCode}`
            : undefined,
        deleted: { connections: deletedConnections, messageLogs: deletedMessageLogs },
    });
}

export async function GET(request: NextRequest) {
    try {
        return await handleDeauthorize(request);
    } catch (error) {
        console.error('[WABA] Deauthorize GET falló:', error);
        return NextResponse.json({ error: 'No se pudo procesar el callback.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        return await handleDeauthorize(request);
    } catch (error) {
        console.error('[WABA] Deauthorize POST falló:', error);
        return NextResponse.json({ error: 'No se pudo procesar el callback.' }, { status: 500 });
    }
}
