import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { handleApiError } from '@/lib/api-errors';

/**
 * POST /api/register
 * Self-registration endpoint for new ISP Tenants.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, adminName, email, password } = body;

    if (!companyName || !adminName || !email || !password) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Nombre de Empresa, Nombre de Admin, Email y Contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const result = await AuthService.registerOrganization({
      companyName,
      adminName,
      email,
      password,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
