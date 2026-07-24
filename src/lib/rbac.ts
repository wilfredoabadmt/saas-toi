import { ApiError } from './api-errors';

export type UserRole = 'admin' | 'billing' | 'technician';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    '/subscribers',
    '/subscribers/import',
    '/settings/plans',
    '/tickets',
    '/settings/routers',
    '/settings/team',
    '/whatsapp',
    '/messaging',
    '/chat',
  ],
  billing: [
    '/subscribers',
    '/subscribers/import',
    '/messaging',
    '/chat',
  ],
  technician: [
    '/tickets',
  ],
};

/**
 * Checks if a role has permission to access a target path.
 */
export function hasPermission(role: UserRole, targetPath: string): boolean {
  if (role === 'admin') return true;

  const allowedRoutes = ROLE_PERMISSIONS[role] || [];
  return allowedRoutes.some((route) => targetPath.startsWith(route));
}

/**
 * Asserts role permission or throws 403 ApiError.
 */
export function assertRolePermission(role: UserRole, targetPath: string) {
  if (!hasPermission(role, targetPath)) {
    throw new ApiError('FORBIDDEN', `Acceso denegado para el rol '${role}' a '${targetPath}'`, 403);
  }
}
