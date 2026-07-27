/**
 * src/app/api/waba/webhook/route.ts
 * ---------------------------------------------------------------------------
 * GET  — Verificación del webhook (handshake de Meta)
 * POST — Ingesta de eventos: estados de mensajes salientes y mensajes entrantes
 *
 * Diferencias frente al origen (`api/whatsapp/webhook/route.ts`):
 *   ✅ Valida la firma HMAC `X-Hub-Signature-256` (GOTCHAS G-05).
 *      Sin esto, cualquiera que conozca la URL inyecta eventos falsos.
 *   ✅ Resuelve la `organization_id` desde el `phone_number_id` (GOTCHAS G-04).
 *      En el origen los eventos entraban huérfanos y ni siquiera eran visibles
 *      para su propio dueño.
 *   ✅ Los eventos que no se pueden persistir van a dead-letter (GOTCHAS G-11)
 *      en vez de perderse silenciosamente.
 *   ✅ Enlaza el evento con el `subscriber` cuando el teléfono casa.
 *
 * REGLA DE ORO: responder rápido y siempre 200/202. Meta desactiva los
 * webhooks lentos o que devuelven error de forma repetida.
 */

import crypto from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { MESSAGE_STATUS, WABA_CONFIG } from '@/lib/waba/column-map';
import {
    findSubscriberByPhone,
    recordDeadletter,
    resolveConnectionByPhoneNumberId,
    upsertMessageEvent,
    type UpsertMessageEventInput,
} from '@/lib/waba/waba.repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ==========================================================================
 * Tipos del payload de Meta
 * ========================================================================== */

interface WebhookError {
    code?: number | string;
    title?: string;
    message?: string;
    error_data?: { details?: string };
}

interface WebhookStatus {
    id?: string;
    recipient_id?: string;
    status?: string;
    timestamp?: string;
    errors?: WebhookError[];
    conversation?: { id?: string; origin?: { type?: string } };
    pricing?: { billable?: boolean; category?: string };
}

interface WebhookMessage {
    id?: string;
    from?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
    button?: { text?: string; payload?: string };
    interactive?: {
        button_reply?: { id?: string; title?: string };
        list_reply?: { id?: string; title?: string };
    };
}

interface WebhookChangeValue {
    messaging_product?: string;
    metadata?: { display_phone_number?: string; phone_number_id?: string };
    contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
    messages?: WebhookMessage[];
    statuses?: WebhookStatus[];
}

interface WebhookPayload {
    object?: string;
    entry?: Array<{ id?: string; changes?: Array<{ field?: string; value?: WebhookChangeValue }> }>;
}

/* ==========================================================================
 * GET — handshake de verificación
 * ========================================================================== */

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const mode = params.get('hub.mode');
    const token = params.get('hub.verify_token');
    const challenge = params.get('hub.challenge');

    const expected = WABA_CONFIG.webhookVerifyToken;

    if (!expected) {
        console.error('[WABA] META_WEBHOOK_VERIFY_TOKEN no está configurada.');
        return NextResponse.json({ error: 'Webhook no configurado.' }, { status: 500 });
    }

    // Comparación en tiempo constante para no filtrar el token carácter a carácter.
    const matches =
        Boolean(token) &&
        token!.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(token!), Buffer.from(expected));

    if (mode === 'subscribe' && matches && challenge) {
        console.log('[WABA] Webhook verificado por Meta.');
        // Debe devolverse el challenge EN TEXTO PLANO, no como JSON.
        return new NextResponse(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    console.warn('[WABA] Verificación de webhook fallida.', { mode, tokenMatches: matches });
    return NextResponse.json({ error: 'Verificación fallida.' }, { status: 403 });
}

/* ==========================================================================
 * Validación de firma
 * ========================================================================== */

/**
 * Meta firma el body con HMAC-SHA256 usando el App Secret.
 * Header: `X-Hub-Signature-256: sha256=<hex>`
 *
 * Se calcula sobre el body CRUDO: hay que leerlo como texto antes de parsear.
 */
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!WABA_CONFIG.enforceWebhookSignature) {
        console.warn('[WABA] Validación de firma DESACTIVADA. Solo para desarrollo local.');
        return true;
    }

    if (!signatureHeader?.startsWith('sha256=')) {
        return false;
    }

    const provided = Buffer.from(signatureHeader.slice(7), 'hex');
    const expected = crypto
        .createHmac('sha256', WABA_CONFIG.appSecret)
        .update(rawBody, 'utf8')
        .digest();

    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(provided, expected);
}

/* ==========================================================================
 * POST — ingesta
 * ========================================================================== */

export async function POST(request: NextRequest) {
    let rawBody = '';

    try {
        rawBody = await request.text();

        // 1. FIRMA ------------------------------------------------------------
        if (!verifySignature(rawBody, request.headers.get('x-hub-signature-256'))) {
            console.error('[WABA][SEGURIDAD] Webhook con firma inválida rechazado.');
            await recordDeadletter('invalid_signature', { rawBody: rawBody.slice(0, 2000) });
            return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody) as WebhookPayload;

        if (payload.object !== 'whatsapp_business_account') {
            return NextResponse.json({ received: true, ignored: 'objeto no soportado' });
        }

        // 2. Agrupar cambios por phone_number_id ------------------------------
        //    Un mismo POST puede traer eventos de varios números → varios tenants.
        const changes = (payload.entry ?? [])
            .flatMap((entry) => entry.changes ?? [])
            .filter((change) => change.field === 'messages' && change.value);

        if (!changes.length) {
            return NextResponse.json({ received: true, processed: 0 });
        }

        const byPhoneNumberId = new Map<string, WebhookChangeValue[]>();
        for (const change of changes) {
            const phoneNumberId = change.value?.metadata?.phone_number_id;
            if (!phoneNumberId) {
                await recordDeadletter('missing_phone_number_id', change.value ?? {});
                continue;
            }
            const list = byPhoneNumberId.get(phoneNumberId) ?? [];
            list.push(change.value!);
            byPhoneNumberId.set(phoneNumberId, list);
        }

        let processed = 0;

        // 3. Resolver tenant y persistir --------------------------------------
        for (const [phoneNumberId, values] of byPhoneNumberId) {
            const connection = await resolveConnectionByPhoneNumberId(phoneNumberId);

            if (!connection) {
                // Evento de un número que no tenemos registrado: NO se inserta
                // huérfano. Se guarda para reproceso si el usuario conecta después.
                console.warn(`[WABA] Sin tenant para phone_number_id ${phoneNumberId}.`);
                await recordDeadletter('unknown_tenant', values, phoneNumberId);
                continue;
            }

            const events: UpsertMessageEventInput[] = [];

            for (const value of values) {
                // --- Estados de mensajes SALIENTES ---------------------------
                for (const status of value.statuses ?? []) {
                    if (!status.id) continue;
                    const firstError = status.errors?.[0];

                    events.push({
                        organizationId: connection.organizationId,
                        wabaConfigId: connection.id,
                        messageId: status.id,
                        direction: 'outbound',
                        status: normalizeStatus(status.status),
                        recipientPhone: status.recipient_id ?? null,
                        errorCode: firstError?.code != null ? String(firstError.code) : null,
                        errorTitle: firstError?.title ?? null,
                        errorMessage:
                            firstError?.error_data?.details ?? firstError?.message ?? null,
                        rawPayload: status,
                        lastEventAt: toDate(status.timestamp),
                    });
                }

                // --- Mensajes ENTRANTES --------------------------------------
                for (const message of value.messages ?? []) {
                    if (!message.id) continue;

                    const from = message.from ?? null;
                    // Enlaza con el abonado para que el Chat Inbox muestre su ficha.
                    const subscriber = from
                        ? await findSubscriberByPhone(connection.organizationId, from)
                        : null;

                    events.push({
                        organizationId: connection.organizationId,
                        wabaConfigId: connection.id,
                        subscriberId: subscriber?.id ?? null,
                        messageId: message.id,
                        direction: 'inbound',
                        status: MESSAGE_STATUS.RECEIVED,
                        recipientPhone: from,
                        messageText: extractMessageText(message),
                        rawPayload: message,
                        lastEventAt: toDate(message.timestamp),
                    });
                }
            }

            // 4. Persistir, con dead-letter si falla ---------------------------
            for (const event of events) {
                try {
                    await upsertMessageEvent(event);
                    processed += 1;
                } catch (error) {
                    console.error('[WABA] Fallo al persistir evento:', error);
                    await recordDeadletter(
                        `db_error: ${(error as Error).message}`,
                        event,
                        phoneNumberId
                    );
                }
            }
        }

        // 5. Siempre 200 ------------------------------------------------------
        return NextResponse.json({ received: true, processed });
    } catch (error) {
        console.error('[WABA] Error procesando el webhook:', error);
        await recordDeadletter(`unhandled: ${(error as Error).message}`, {
            rawBody: rawBody.slice(0, 5000),
        });

        // 200 a propósito: si devolvemos 500 de forma repetida, Meta
        // desactiva el webhook. El evento ya quedó en dead-letter.
        return NextResponse.json({ received: true, error: 'procesado con errores' });
    }
}

/* ==========================================================================
 * Helpers
 * ========================================================================== */

function toDate(timestamp?: string): Date {
    if (!timestamp) return new Date();
    const seconds = Number(timestamp);
    return Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date();
}

function normalizeStatus(status?: string): string {
    const normalized = (status ?? '').toLowerCase();
    const known = [
        MESSAGE_STATUS.SENT,
        MESSAGE_STATUS.DELIVERED,
        MESSAGE_STATUS.READ,
        MESSAGE_STATUS.FAILED,
    ] as string[];
    return known.includes(normalized) ? normalized : normalized || 'unknown';
}

/** Extrae texto legible de los distintos tipos de mensaje entrante. */
function extractMessageText(message: WebhookMessage): string | null {
    switch (message.type) {
        case 'text':
            return message.text?.body ?? null;
        case 'button':
            return message.button?.text ?? null;
        case 'interactive':
            return (
                message.interactive?.button_reply?.title ??
                message.interactive?.list_reply?.title ??
                null
            );
        case 'image':
        case 'video':
        case 'audio':
        case 'document':
        case 'sticker':
            return `[${message.type}]`;
        case 'location':
            return '[ubicación]';
        default:
            return message.type ? `[${message.type}]` : null;
    }
}
