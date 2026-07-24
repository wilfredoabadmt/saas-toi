import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetService } from '@/services/password-reset.service';
import { handleApiError } from '@/lib/api-errors';

/**
 * POST /api/auth/forgot-password
 * Requests password recovery token and dispatches email.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Email es requerido' }, { status: 400 });
    }

    const result = await PasswordResetService.requestReset(email);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}
