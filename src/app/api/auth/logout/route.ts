import { NextResponse } from 'next/server';
import { destroySession, SESSION_COOKIE_NAME } from '@/lib/session';

export async function POST(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  const cookieValue = match ? match[1] : undefined;

  if (cookieValue) {
    await destroySession(cookieValue);
  }

  const response = NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
