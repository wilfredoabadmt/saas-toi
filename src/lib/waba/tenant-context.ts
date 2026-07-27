/**
 * src/lib/waba/tenant-context.ts
 * ---------------------------------------------------------------------------
 * 🔌 ADAPTADOR — Resuelve el contexto de tenant para el módulo WABA.
 *
 * Este módulo NO sabe cómo autentica SaaS TOI. Necesita una sola cosa:
 * dado el request actual, ¿cuál es la `organization_id`?
 *
 * Adaptación: usa `getSessionContext()` de `@/lib/auth` para API routes
 * (que reciben NextRequest), y `headers()` de `next/headers` para Server
 * Actions (que no reciben request).
 *
 * ⚠️ REGLA INNEGOCIABLE
 * Esta función debe **lanzar** si no puede resolver la organización.
 * NUNCA devuelvas un valor por defecto ni "la primera organización".
 */

import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import type { TenantContext } from '@/lib/tenant';

/* ==========================================================================
 * Tipos y errores
 * ========================================================================== */

export type OrganizationId = string;

export class UnauthorizedError extends Error {
    constructor(message = 'No hay una organización activa en esta sesión.') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends Error {
    constructor(message = 'La organización actual no tiene acceso a este recurso.') {
        super(message);
        this.name = 'ForbiddenError';
    }
}

export type { TenantContext };

/* ==========================================================================
 * Resolución del contexto de tenant
 * ========================================================================== */

/**
 * Resuelve el contexto de tenant a partir de headers HTTP.
 *
 * Para API routes: se puede pasar `request` directamente.
 * Para Server Actions: se usa `headers()` de `next/headers`.
 *
 * Los headers esperados son los mismos que usa `@/lib/auth`:
 *   - `x-organization-id`
 *   - `x-user-id`
 *   - `x-user-role`
 *
 * En desarrollo, si no hay headers, usa el fallback de `getSessionContext()`.
 */
export async function getTenantContext(request?: NextRequest): Promise<TenantContext> {
    // Si hay un NextRequest, usar el auth del proyecto directamente
    if (request) {
        const ctx = await getSessionContext(request);
        if (!ctx.organizationId) {
            throw new UnauthorizedError();
        }
        return ctx;
    }

    // Para Server Actions: construir un NextRequest desde headers()
    try {
        const h = await headers();
        const orgId = h.get('x-organization-id');
        const userId = h.get('x-user-id');
        const role = h.get('x-user-role');

        if (orgId && userId) {
            return {
                organizationId: orgId,
                userId,
                role: role || 'admin',
            };
        }

        // Fallback: usar el mismo mecanismo que getSessionContext
        // Esto maneja el caso de desarrollo donde no hay headers
        const fakeRequest = new NextRequest('http://localhost', {
            headers: Object.fromEntries(h.entries()),
        });
        const ctx = await getSessionContext(fakeRequest);
        if (!ctx.organizationId) {
            throw new UnauthorizedError();
        }
        return ctx;
    } catch (error) {
        if (error instanceof UnauthorizedError) throw error;
        throw new UnauthorizedError(
            `No se pudo resolver el contexto de tenant: ${(error as Error).message}`
        );
    }
}

/** Atajo cuando solo necesitas el id. */
export async function resolveOrganizationId(request?: NextRequest): Promise<OrganizationId> {
    return (await getTenantContext(request)).organizationId;
}

/* ==========================================================================
 * Verificaciones de permisos (RBAC)
 * ========================================================================== */

/**
 * Comprueba que la organización actual puede administrar la conexión WABA.
 * Solo admin / owner puede conectar/desconectar números.
 */
export async function assertCanManageWaba(request?: NextRequest): Promise<TenantContext> {
    const ctx = await getTenantContext(request);

    const ADMIN_ROLES = ['admin', 'owner', 'administrador'];
    if (ctx.role && !ADMIN_ROLES.includes(ctx.role.toLowerCase())) {
        throw new ForbiddenError(
            'Solo un administrador puede gestionar la conexión de WhatsApp Business.'
        );
    }

    return ctx;
}

/**
 * Permiso para ENVIAR mensajes: más laxo que administrar.
 * Un cajero debería poder disparar un recordatorio de pago.
 */
export async function assertCanSendMessages(request?: NextRequest): Promise<TenantContext> {
    const ctx = await getTenantContext(request);

    const DENIED_ROLES = ['viewer', 'readonly', 'invitado'];
    if (ctx.role && DENIED_ROLES.includes(ctx.role.toLowerCase())) {
        throw new ForbiddenError('Tu rol no permite enviar mensajes de WhatsApp.');
    }

    return ctx;
}

/**
 * Verificación defensiva: comprueba que un recurso ya cargado pertenece de
 * verdad a la organización actual.
 */
export function assertBelongsToOrg(
    resource: { organizationId: OrganizationId } | null | undefined,
    organizationId: OrganizationId,
    resourceName = 'recurso'
): void {
    if (!resource) {
        throw new ForbiddenError(`El ${resourceName} no existe o no es accesible.`);
    }
    if (String(resource.organizationId) !== String(organizationId)) {
        console.error(
            `[WABA][SEGURIDAD] Acceso cruzado bloqueado: ${resourceName} de la org ` +
                `${resource.organizationId} solicitado por la org ${organizationId}.`
        );
        throw new ForbiddenError(`El ${resourceName} no pertenece a tu organización.`);
    }
}
