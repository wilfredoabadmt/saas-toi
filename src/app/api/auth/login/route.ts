import { NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { handleApiError } from '@/lib/api-errors';

export async function POST(req: Request) {
  try {
    // 1. Validate SESSION_SECRET configuration
    if (!process.env.SESSION_SECRET) {
      console.warn('[AUTH ERROR] SESSION_SECRET is missing in environment variables.');
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Se requiere correo electrónico y contraseña.' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // 2. Perform login authentication
    const result = await AuthService.login({ email, password });

    // Ensure user has an organization before creating a session
    if (!result.user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'El usuario no está asociado a ninguna organización.' },
        { status: 403 }
      );
    }

    // 3. Create authenticated session in DB and sign token
    const { cookieValue, expiresAt } = await createSession(
      result.user.id,
      result.user.organizationId,
      {
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      }
    );

    const response = NextResponse.json({
      success: true,
      user: result.user,
      redirectUrl: result.redirectUrl,
    });

    // 4. Set signed HTTP-Only session cookie
    response.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]:', (err as Error).message);
    return handleApiError(err);
  }
}
