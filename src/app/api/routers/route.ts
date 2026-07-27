import { NextRequest, NextResponse } from 'next/server';
import { RouterService } from '@/services/router.service';
import { handleApiError } from '@/lib/api-errors';
import { getSessionContext } from '@/lib/auth';

/**
 * GET /api/routers
 * Lists configured routers for tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getSessionContext(request);
    const routers = await RouterService.list(organizationId);
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
    const { organizationId } = await getSessionContext(request);
    const body = await request.json();
    const { name, host, apiPort, username, password } = body;

    if (!name || !host || !username || !password) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Nombre, Host, Usuario y Contraseña son requeridos' }, { status: 400 });
    }

    const created = await RouterService.create(organizationId, {
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
