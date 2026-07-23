import { NextRequest, NextResponse } from 'next/server';
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-verify';
import { WebhookService } from '@/services/webhook.service';

/**
 * GET: Verification challenge from Meta.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN || 'saas_toi_verify_token_secret';

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return new Response('Forbidden', { status: 403 });
}

/**
 * POST: Incoming webhook events from Meta (messages, status updates).
 * Signature HMAC-SHA256 verified on raw body. Responds <=5s.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // 1. Verify HMAC-SHA256 signature
    const isValid = verifyMetaWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse payload
    const payload = JSON.parse(rawBody);

    // 3. Process webhook events (inline with deduplication)
    await WebhookService.processWebhookPayload(payload);

    // 4. Always respond 200 OK to Meta
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err) {
    console.error('[Webhook POST Error]:', err);
    // Respond 200 to prevent Meta from retrying broken payloads indefinitely
    return NextResponse.json({ status: 'ok', error: 'internal_handled' }, { status: 200 });
  }
}
