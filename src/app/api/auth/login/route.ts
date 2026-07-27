import { NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { handleApiError } from '@/lib/api-errors';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const result = await AuthService.login({ email, password });

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

    // Set signed HTTP-Only session cookie
    response.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
