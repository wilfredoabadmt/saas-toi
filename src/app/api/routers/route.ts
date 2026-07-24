import { NextRequest, NextResponse } from 'next/server';
import { RouterService } from '@/services/router.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/routers
 * Lists configured routers for tenant.
 */
export async function GET() {
  try {
    const routers = await RouterService.list(DEFAULT_ORG_ID);
    return NextResponse.json({ success: true, data: routers });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/routers
 * Registers a new router encrypting password in DB.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, host, apiPort, username, password } = body;

    if (!name || !host || !username || !password) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Nombre, Host, Usuario y Contraseña son requeridos' }, { status: 400 });
    }

    const created = await RouterService.create(DEFAULT_ORG_ID, {
      name,
      host,
      apiPort: apiPort ? Number(apiPort) : 443,
      username,
      password,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
