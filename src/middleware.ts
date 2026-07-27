import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

// Public pages that do not require authentication
const PUBLIC_PAGES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/data-deletion',
];

// Public API endpoints that do not require user session cookie
const PUBLIC_API_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/register',
  '/api/health',
  '/api/waba/webhook',
  '/api/webhooks/whatsapp',
  '/api/waba/deauthorize',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Next.js internals, static files, images, favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Allow public pages and legal pages
  if (PUBLIC_PAGES.includes(pathname) || pathname.startsWith('/legal/')) {
    return NextResponse.next();
  }

  // 3. Allow public API endpoints and cron jobs (cron has its own header validation)
  if (PUBLIC_API_ENDPOINTS.includes(pathname) || pathname.startsWith('/api/cron/')) {
    return NextResponse.next();
  }

  // 4. Validate session cookie cryptographic signature
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const validToken = await verifySessionToken(cookieValue);

  if (!validToken) {
    // API request -> return 401 JSON response
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Sesión requerida o firma de cookie no válida.' },
        { status: 401 }
      );
    }

    // Page request -> redirect to /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files & _next internals
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
