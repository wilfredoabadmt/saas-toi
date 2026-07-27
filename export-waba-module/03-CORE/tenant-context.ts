/**
 * src/lib/waba/tenant-context.ts
 * ---------------------------------------------------------------------------
 * 🔌 ADAPTADOR — ESTE ES EL ÚNICO ARCHIVO QUE DEBES ESCRIBIR TÚ.
 *
 * El módulo WABA no sabe cómo autentica SaaS TOI. Necesita una sola cosa:
 * dado el request actual, ¿cuál es la `organization_id`?
 *
 * Implementa `resolveOrganizationId()` con tu sistema de sesión y todo lo demás
 * funciona. El resto del módulo NUNCA accede a la sesión directamente.
 *
 * ⚠️ REGLA INNEGOCIABLE
 * Esta función debe **lanzar** si no puede resolver la organización.
 * NUNCA devuelvas un valor por defecto ni "la primera organización".
 * El módulo origen tenía exactamente ese fallback y era una fuga entre
 * tenants (GOTCHAS G-01): sin sesión, operaba con el número de WhatsApp
 * de otra empresa.
 */

/** Cambia a `string` o `number` si tu organization_id no es uuid. */
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

export interface TenantContext {
    organizationId: OrganizationId;
    userId?: string;
    /** Rol dentro de la organización, si tu RBAC lo expone. */
    role?: string;
}

/* ==========================================================================
 * ⬇️⬇️⬇️  IMPLEMENTA ESTO  ⬇️⬇️⬇️
 * ========================================================================== */

/**
 * Devuelve el contexto de tenant de la petición actual.
 * Solo válido en Server Components, Server Actions y Route Handlers.
 *
 * EJEMPLOS según lo que uses en SaaS TOI:
 *
 * --- Con NextAuth / Auth.js -------------------------------------------------
 *   import { auth } from '@/auth';
 *
 *   export async function getTenantContext(): Promise<TenantContext> {
 *       const session = await auth();
 *       const organizationId = session?.user?.organizationId;
 *       if (!organizationId) throw new UnauthorizedError();
 *       return { organizationId, userId: session.user.id, role: session.user.role };
 *   }
 *
 * --- Con Lucia / sesión en cookie ------------------------------------------
 *   import { validateRequest } from '@/lib/auth';
 *
 *   export async function getTenantContext(): Promise<TenantContext> {
 *       const { user } = await validateRequest();
 *       if (!user?.organizationId) throw new UnauthorizedError();
 *       return { organizationId: user.organizationId, userId: user.id, role: user.role };
 *   }
 *
 * --- Con Clerk --------------------------------------------------------------
 *   import { auth } from '@clerk/nextjs/server';
 *
 *   export async function getTenantContext(): Promise<TenantContext> {
 *       const { userId, orgId } = await auth();
 *       if (!orgId) throw new UnauthorizedError();
 *       return { organizationId: orgId, userId: userId ?? undefined };
 *   }
 *
 * --- Con Supabase Auth + tabla de membresías --------------------------------
 *   export async function getTenantContext(): Promise<TenantContext> {
 *       const supabase = await createClient();
 *       const { data: { user } } = await supabase.auth.getUser();
 *       if (!user) throw new UnauthorizedError();
 *       const [membership] = await db.select().from(memberships)
 *           .where(eq(memberships.userId, user.id)).limit(1);
 *       if (!membership) throw new UnauthorizedError();
 *       return { organizationId: membership.organizationId, userId: user.id };
 *   }
 */
export async function getTenantContext(): Promise<TenantContext> {
    throw new Error(
        '[WABA] getTenantContext() no está implementada. ' +
            'Edita src/lib/waba/tenant-context.ts y conéctala a tu sistema de sesión.'
    );
}

/** Atajo cuando solo necesitas el id. */
export async function resolveOrganizationId(): Promise<OrganizationId> {
    return (await getTenantContext()).organizationId;
}

/* ==========================================================================
 * ⬆️⬆️⬆️  FIN DE LO QUE DEBES IMPLEMENTAR  ⬆️⬆️⬆️
 * ========================================================================== */

/**
 * Comprueba que la organización actual puede administrar la conexión WABA.
 * SaaS TOI tiene RBAC (admin / cajero / técnico): conectar un número y crear
 * plantillas debería ser exclusivo de admin.
 *
 * Ajusta la lista de roles a tu nomenclatura real.
 */
export async function assertCanManageWaba(): Promise<TenantContext> {
    const ctx = await getTenantContext();

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
export async function assertCanSendMessages(): Promise<TenantContext> {
    const ctx = await getTenantContext();

    const DENIED_ROLES = ['viewer', 'readonly', 'invitado'];
    if (ctx.role && DENIED_ROLES.includes(ctx.role.toLowerCase())) {
        throw new ForbiddenError('Tu rol no permite enviar mensajes de WhatsApp.');
    }

    return ctx;
}

/**
 * Verificación defensiva: comprueba que un recurso ya cargado pertenece de
 * verdad a la organización actual.
 *
 * El repositorio ya filtra por `organization_id` en el WHERE, así que esto es
 * una segunda barrera. Úsala cuando el id del recurso venga del cliente.
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
        // Se registra porque, si ocurre, es un intento real de acceso cruzado.
        console.error(
            `[WABA][SEGURIDAD] Acceso cruzado bloqueado: ${resourceName} de la org ` +
                `${resource.organizationId} solicitado por la org ${organizationId}.`
        );
        throw new ForbiddenError(`El ${resourceName} no pertenece a tu organización.`);
    }
}
