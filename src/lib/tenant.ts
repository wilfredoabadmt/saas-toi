export interface TenantContext {
  organizationId: string;
  userId: string;
  role: string;
}

export class MissingTenantContextError extends Error {
  constructor(message = 'Scope de tenant requerido (organization_id) ausente') {
    super(message);
    this.name = 'MissingTenantContextError';
  }
}

/**
 * Enforces explicit organization_id parameter presence on all database query helpers.
 */
export function assertTenantScope(organizationId: string | null | undefined): string {
  if (!organizationId || typeof organizationId !== 'string' || organizationId.trim() === '') {
    throw new MissingTenantContextError();
  }
  return organizationId;
}
