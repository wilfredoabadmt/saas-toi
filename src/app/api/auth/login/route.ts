import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/services/auth.service';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { handleApiError } from '@/lib/api-errors';

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

export async function POST(req: Request | NextRequest) {
  try {
    if (!process.env.SESSION_SECRET) {
      console.warn('[AUTH ERROR] SESSION_SECRET is missing. Using default development secret key.');
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Datos de entrada inválidos.' },
        { status: 400 }
      );
    }

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Datos de entrada inválidos.', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const authResult = await AuthService.login({ email, password });

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined;

    const { cookieValue, expiresAt } = await createSession(
      authResult.user.id,
      authResult.user.organizationId || '00000000-0000-0000-0000-000000000001',
      {
        ip: clientIp,
        userAgent: req.headers.get('user-agent') || undefined,
      }
    );

    const response = NextResponse.json({
      success: true,
      user: authResult.user,
      redirectUrl: authResult.redirectUrl,
    });

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

