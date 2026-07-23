import { NextRequest } from 'next/server';
import { TenantContext, MissingTenantContextError } from './tenant';

/**
 * Extracts and verifies tenant session context from request headers or cookies.
 * For MVP/dev, falls back to a default test organization context if headers are not set.
 */
export async function getSessionContext(request: NextRequest): Promise<TenantContext> {
  const orgHeader = request.headers.get('x-organization-id');
  const userHeader = request.headers.get('x-user-id');
  const roleHeader = request.headers.get('x-user-role');

  if (orgHeader && userHeader) {
    return {
      organizationId: orgHeader,
      userId: userHeader,
      role: roleHeader || 'admin',
    };
  }

  // Development/Test fallback context if X-Organization-ID header is not supplied
  const defaultOrgId = process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000001';
  const defaultUserId = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000002';

  if (!defaultOrgId) {
    throw new MissingTenantContextError('No session or tenant context available in request');
  }

  return {
    organizationId: defaultOrgId,
    userId: defaultUserId,
    role: 'admin',
  };
}
