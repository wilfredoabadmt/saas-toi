import { NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { handleApiError } from '@/lib/api-errors';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const result = await AuthService.login({ email, password });

    const response = NextResponse.json({
      success: true,
      user: result.user,
      redirectUrl: result.redirectUrl,
    });

    // Set secure HTTP-Only session cookie
    response.cookies.set('saas_toi_session', JSON.stringify(result.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
