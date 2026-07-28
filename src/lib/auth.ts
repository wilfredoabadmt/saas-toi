import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { TenantContext, MissingTenantContextError } from './tenant';
import { resolveSession, SESSION_COOKIE_NAME, SessionData } from './session';
import { ApiError } from './api-errors';

/**
 * Extracts and verifies tenant session context from authenticated cookie.
 * Does NOT accept unauthenticated X-Organization-ID headers or fall back to default demo org.
 */
export async function getSessionContext(request?: Request | NextRequest): Promise<TenantContext> {
  let cookieValue: string | undefined;

  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    cookieValue = match && match[1] ? decodeURIComponent(match[1]) : undefined;
  }

  if (!cookieValue) {
    try {
      const cookieStore = await cookies();
      cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // cookies() call may throw if invoked outside Next server execution context
    }
  }

  const session = await resolveSession(cookieValue);

  if (!session) {
    throw new MissingTenantContextError('No valid authenticated session found in request.');
  }

  if (session.organizationStatus && session.organizationStatus !== 'active' && session.role !== 'super_admin') {
    throw new MissingTenantContextError(`Organización no activa (estado: ${session.organizationStatus}).`);
  }

  let organizationId = session.organizationId;

  // Super Admin explicit impersonation override
  if (session.role === 'super_admin' && request) {
    const impersonateHeader = request.headers.get('x-impersonate-organization-id') || request.headers.get('x-organization-id');
    if (impersonateHeader) {
      organizationId = impersonateHeader;
    }
  }

  return {
    organizationId,
    userId: session.userId,
    role: session.role || 'admin',
  };
}

/**
 * Requires an active, authenticated session and returns full session data.
 */
export async function requireSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await resolveSession(cookieValue);

  if (!session) {
    throw new MissingTenantContextError('No valid authenticated session found.');
  }

  return session;
}

/**
 * Helper for Super Admin endpoints to enforce role === 'super_admin' or throw 403.
 */
export async function requireSuperAdmin(request?: Request | NextRequest): Promise<SessionData> {
  let cookieValue: string | undefined;

  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    cookieValue = match && match[1] ? decodeURIComponent(match[1]) : undefined;
  }

  if (!cookieValue) {
    try {
      const cookieStore = await cookies();
      cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // cookies()
    }
  }

  const session = await resolveSession(cookieValue);

  if (!session) {
    throw new ApiError('UNAUTHORIZED', 'Sesión no encontrada o no válida.', 401);
  }

  if (session.role !== 'super_admin') {
    throw new ApiError('FORBIDDEN', 'Acceso denegado. Se requiere rol de super_admin.', 403);
  }

  return session;
}

/**
 * Helper for Server Components to retrieve current session without throwing exceptions.
 */
export async function getServerSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!cookieValue) {
      console.warn('[AUTH] No session cookie found');
      return null;
    }
    return await resolveSession(cookieValue);
  } catch (err) {
    console.error('[AUTH] getServerSession error:', err);
    return null;
  }
}
