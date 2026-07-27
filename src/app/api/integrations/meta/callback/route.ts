/**
 * src/app/api/integrations/meta/callback/route.ts
 * ---------------------------------------------------------------------------
 * POST — Handler de intercambio de token y auto-descubrimiento para Meta 1-Click.
 * Recibe el `code`, `waba_id` y `phone_number_id` provenientes de Embedded Signup,
 * intercambia el código por un token de larga duración usando META_APP_SECRET,
 * suscribe la aplicación al WABA (`POST /{waba_id}/subscribed_apps`) y persiste
 * la conexión cifrada en `waba_configs` para el tenant actual.
 */

import { NextRequest } from 'next/server';
import { POST as exchangeTokenHandler } from '@/app/api/waba/exchange-token/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return exchangeTokenHandler(request);
}
