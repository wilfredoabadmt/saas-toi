import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetService } from '@/services/password-reset.service';
import { handleApiError } from '@/lib/api-errors';

/**
 * POST /api/auth/reset-password
 * Verifies token and updates password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Token y Nueva Contraseña son requeridos' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const result = await PasswordResetService.confirmReset(token, newPassword);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}
