/**
 * src/app/api/waba/exchange-token/route.ts
 * ---------------------------------------------------------------------------
 * POST — Canjea el `code` del Embedded Signup por un token de larga duración
 * y persiste la conexión en `waba_configs` de la organización del usuario.
 *
 * Diferencias frente al origen (`api/whatsapp/exchange-token/route.ts`):
 *   ✅ Exige sesión: el tenant sale de la sesión, nunca del body (evita que el
 *      cliente elija a qué organización asignar la conexión)
 *   ✅ Cifra el token antes de guardarlo (GOTCHAS G-06)
 *   ✅ Suscribe la app al WABA automáticamente (GOTCHAS G-17) — sin esto
 *      NO llegan webhooks y los mensajes se quedan en "accepted" para siempre
 *   ✅ Los logs no contienen material del token (GOTCHAS G-08)
 *   ✅ Rate limit básico por organización
 */

import { NextRequest, NextResponse } from 'next/server';

import { assertWabaEnv } from '@/lib/waba/column-map';
import {
    exchangeCodeForToken,
    fetchMetaUserId,
    fetchPhoneProfile,
    MetaGraphError,
    subscribeAppToWaba,
} from '@/lib/waba/graph-client';
import { upsertConnection } from '@/lib/waba/waba.repository';
import { assertCanManageWaba, UnauthorizedError, ForbiddenError } from '@/lib/waba/tenant-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Rate limit en memoria. En multi-instancia (Coolify escalado) usa Redis. */
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60_000;

function rateLimited(key: string): boolean {
    const now = Date.now();
    const entry = attempts.get(key);

    if (!entry || entry.resetAt < now) {
        attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }
    entry.count += 1;
    return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
    try {
        assertWabaEnv();

        // 1. Tenant desde la SESIÓN, nunca desde el body ------------------------
        const { organizationId, userId } = await assertCanManageWaba();

        if (rateLimited(String(organizationId))) {
            return NextResponse.json(
                { error: 'Demasiados intentos de conexión. Espera un minuto.' },
                { status: 429 }
            );
        }

        // 2. Validar el payload -------------------------------------------------
        const body = (await request.json().catch(() => null)) as {
            code?: string;
            waba_id?: string;
            phone_number_id?: string;
        } | null;

        if (!body?.code) {
            return NextResponse.json(
                { error: 'Falta el parámetro "code" del Embedded Signup.' },
                { status: 400 }
            );
        }

        if (!body.waba_id || !body.phone_number_id) {
            // Estos NO vienen en el authResponse: llegan por postMessage.
            // Si faltan, el frontend perdió el evento y hay que repetir el flujo.
            return NextResponse.json(
                {
                    error:
                        'Faltan los identificadores de WhatsApp (WABA ID y Phone Number ID). ' +
                        'Vuelve a ejecutar el Embedded Signup sin cerrar la ventana emergente.',
                },
                { status: 400 }
            );
        }

        // 3. Canjear el código --------------------------------------------------
        // ⚠️ Sin redirect_uri: en el flujo popup incluirlo provoca
        //    "verification code mismatch". Ver graph-client.ts.
        const tokenResult = await exchangeCodeForToken(body.code);
        const accessToken = tokenResult.access_token;

        // 4. Enriquecer con datos reales de Meta (best-effort) -------------------
        let displayPhoneNumber: string | null = null;
        let verifiedName: string | null = null;

        try {
            const profile = await fetchPhoneProfile(body.phone_number_id, accessToken);
            displayPhoneNumber = profile.display_phone_number ?? null;
            verifiedName = profile.verified_name ?? null;
        } catch (error) {
            console.warn(
                '[WABA] No se pudo leer el perfil del número:',
                error instanceof Error ? error.message : error
            );
        }

        const metaUserId = await fetchMetaUserId(accessToken);

        // 5. Persistir (token cifrado dentro del repositorio) --------------------
        const connection = await upsertConnection({
            organizationId,
            wabaId: body.waba_id,
            phoneNumberId: body.phone_number_id,
            accessToken,
            displayPhoneNumber,
            verifiedName,
            metaUserId,
            tokenType: tokenResult.token_type ?? null,
            tokenExpiresAt: tokenResult.expires_in
                ? new Date(Date.now() + tokenResult.expires_in * 1000)
                : null,
        });

        // 6. Suscribir la app al WABA -------------------------------------------
        // ⚠️ PASO CRÍTICO que el origen nunca automatizó (GOTCHAS G-17).
        // Sin esto la conexión se guarda pero Meta no envía ningún webhook:
        // todos los mensajes quedan eternamente en estado "accepted".
        let webhookSubscribed = false;
        try {
            await subscribeAppToWaba(body.waba_id, accessToken);
            webhookSubscribed = true;
        } catch (error) {
            console.error(
                '[WABA] Falló la suscripción de la app al WABA:',
                error instanceof Error ? error.message : error
            );
        }

        // 7. Log SIN material del token ------------------------------------------
        console.log('[WABA] Conexión establecida', {
            organizationId,
            userId,
            wabaId: body.waba_id,
            phoneNumberId: body.phone_number_id,
            displayPhoneNumber,
            webhookSubscribed,
        });

        return NextResponse.json({
            success: true,
            connection: {
                id: connection.id,
                wabaId: connection.wabaId,
                phoneNumberId: connection.phoneNumberId,
                displayPhoneNumber: connection.displayPhoneNumber,
                verifiedName: connection.verifiedName,
            },
            webhookSubscribed,
            message: webhookSubscribed
                ? 'Cuenta de WhatsApp Business conectada correctamente.'
                : 'Cuenta conectada, pero no se pudo suscribir el webhook. ' +
                  'Usa "Reintentar suscripción" o revisa los permisos en Meta.',
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof MetaGraphError) {
            console.error('[WABA] Error de Meta en el canje:', {
                code: error.code,
                subcode: error.subcode,
                httpStatus: error.httpStatus,
                fbtraceId: error.fbtraceId,
                // NUNCA el code ni el token
            });
            return NextResponse.json(
                { error: `Meta rechazó el canje: ${error.message}`, metaCode: error.code },
                { status: 400 }
            );
        }

        console.error('[WABA] Error inesperado en el canje:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
