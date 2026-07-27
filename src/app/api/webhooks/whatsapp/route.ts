import { NextRequest } from 'next/server';
import { GET as wabaGET, POST as wabaPOST } from '@/app/api/waba/webhook/route';

/**
 * Legacy WhatsApp Webhook route handler (Deprecated).
 * Forwards all GET (handshake) and POST (event ingestion) requests directly to the unified WABA webhook handler at /api/waba/webhook.
 */
export async function GET(request: NextRequest) {
  return wabaGET(request);
}

export async function POST(request: NextRequest) {
  return wabaPOST(request);
}
