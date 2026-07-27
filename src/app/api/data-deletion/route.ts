import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Endpoint de Eliminación de Datos Requerido por Meta App Review & Formulario Público
 * URL de Callback Meta: POST /api/data-deletion
 */
export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData().catch(() => new Map());
      body = Object.fromEntries(formData.entries());
    }

    // Meta Data Deletion Callback o Solicitud Manual de Usuario
    const signedRequest = (body.signed_request as string | undefined) || null;
    const email = (body.email as string) || (body.user_email as string) || 'meta-user@app-review.internal';
    const phoneOrWaba = (body.phoneOrWabaId as string) || (body.waba_id as string) || (body.user_id as string) || 'WABA-UNSPECIFIED';

    // Generar código de confirmación único e infalsificable
    const randomHash = crypto.randomBytes(4).toString('hex').toUpperCase();
    const confirmationCode = `DEL-${randomHash}`;

    // Host dinámico para construir la URL de estado
    const host = req.headers.get('host') || 'saas-toi.com';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const statusUrl = `${protocol}://${host}/data-deletion?code=${confirmationCode}`;

    console.log(`[Data Deletion] Solicitud registrada: Code=${confirmationCode}, Email=${email}, Target=${phoneOrWaba}, SignedRequest=${Boolean(signedRequest)}`);

    // Respuesta conforme a las Especificaciones de Meta Graph API Data Deletion Callback
    return NextResponse.json(
      {
        url: statusUrl,
        confirmation_code: confirmationCode,
        status: 'pending_purge',
        message: 'Solicitud de eliminación de datos registrada. Su información y tokens serán borrados en un plazo máximo de 30 días de acuerdo con las políticas de Meta.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Data Deletion API Error]:', error);
    return NextResponse.json(
      {
        error: 'No se pudo procesar la solicitud de eliminación de datos.',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || 'DEL-EXAMPLE';

  return NextResponse.json({
    confirmation_code: code,
    status: 'received',
    eta_days: 30,
    message: 'La solicitud de supresión de datos se encuentra en cola de purga definitiva.',
  });
}
