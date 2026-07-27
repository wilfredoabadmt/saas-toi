# Tareas de Implementación: 011-hardening-auth-multitenant

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Estado**: 0/32 completadas — ninguna tarea iniciada (spec redactada antes de tocar código)

Leyenda: `[P]` = paralelizable con las de su misma fase · `⛔` = requiere acción del dueño

---

## Fase 0 — Contención inmediata *(sin dependencias)*

- [ ] **T01-RotarR2** ⛔: Rotar en el panel de Cloudflare R2 las llaves expuestas en `.env.example` (presentes en el historial de git) y actualizar los valores en el entorno de la plataforma de hosting. *(FR-017)*
- [ ] **T02-SanearEnv** `[P]`: Limpiar `.env.example` dejando solo marcadores `REEMPLAZA_*`, y documentar con guía inline las variables faltantes: `SESSION_SECRET` (nueva, `openssl rand -hex 32`), `OPENROUTER_API_TOKEN`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`, `SMTP_HOST`, `CRON_SECRET`, `BILLING_CURRENCY`. Eliminar `DEFAULT_ORG_ID` y `DEFAULT_USER_ID`. *(FR-002, FR-017)*
- [ ] **T03-EliminarSeedEndpoint** `[P]`: Borrar `src/app/api/auth/seed-superadmin/route.ts`. Verificar que ningún componente lo invoca. *(FR-007, SC-004)*

---

## Fase 1 — Núcleo de sesión

- [ ] **T04-EsquemaSessions**: Crear `src/db/schema/sessions.ts` con `id`, `token_hash` (único, indexado), `user_id` (FK cascade, indexado), `organization_id` (FK cascade, indexado — Principio I), `expires_at` (indexado), `created_at`, `last_used_at`, `ip`, `user_agent`. Exportar desde `src/db/schema/index.ts`. *(FR-001, Key Entities)*
- [ ] **T05-MigracionSessions**: Generar la migración con `pnpm db:generate` y verificar que es idempotente para no repetir el error 42P07 de la migración 0007 en Coolify. *(FR-001)*
- [ ] **T06-LibSession**: Implementar `src/lib/session.ts` con `createSession`, `resolveSession`, `destroySession`, `destroyAllSessionsForOrg` y el sellado/verificación HMAC de la cookie. La base guarda `sha256(token)`, nunca el token. `resolveSession` hace join con `users` y `organizations` para devolver rol, nombre y `organizationStatus` **vivos**. *(FR-001, FR-002, NFR-001)*
- [ ] **T07-LibPassword** `[P]`: Implementar `src/lib/password.ts` con `hashPassword` (scrypt, salt de 16 bytes, formato `scrypt$N$r$p$<salt_b64>$<hash_b64>`), `verifyPassword` (acepta el formato heredado SHA-256) y `needsRehash`. Comparación con `crypto.timingSafeEqual`. *(FR-010, NFR-003)*

---

## Fase 2 — Perímetro HTTP

- [ ] **T08-Middleware**: Crear `src/middleware.ts` que exija sesión en `/(dashboard)` y `/api/*`, con allowlist explícita: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/accept-invite`, `/privacy`, `/terms`, `/data-deletion`, `/api/health`, `/api/auth/*`, `/api/register`, `/api/waba/webhook`, `/api/webhooks/whatsapp`, `/api/waba/deauthorize`, `/api/legal/*`, `/api/data-deletion`, `/api/cron/*`. API → 401; páginas → redirect a `/login`. *(FR-004, Edge Cases)*
- [ ] **T09-ReescribirAuth**: Reescribir `src/lib/auth.ts`: `getSessionContext()` resuelve **solo** desde la sesión. Eliminar la lectura de `x-organization-id` / `x-user-id` / `x-user-role` y el fallback a `DEFAULT_ORG_ID`. Añadir `requireSession()`, `requireRole()` y `getServerSession()`. Mantener el nombre y la forma de retorno de `getSessionContext()` para no romper los 16 importadores actuales. *(FR-002, FR-003, FR-005)*
- [ ] **T10-WabaTenantContext**: Actualizar `src/lib/waba/tenant-context.ts` para consumir la nueva resolución, conservando su contrato de **lanzar** en lugar de devolver un valor por defecto. Verificar que `assertCanManageWaba` y `assertCanSendMessages` siguen operando. *(FR-002, Riesgo de regresión WABA)*
- [ ] **T11-RutasConSesion**: Actualizar las 16 rutas que ya llaman a `getSessionContext(request)` para la nueva firma sin parámetro: `agent/profile`, `chat/conversations`, `chat/messages`, `chat/send`, `kb`, `kb/[id]`, `kb/size`, `messaging/logs`, `messaging/send`, `subscribers`, `subscribers/[id]`, `subscribers/[id]/proofs/[proofId]`, `subscribers/import`, `waba/connect`, `waba/disconnect`, `waba/status`. *(FR-002)*

---

## Fase 3 — Barrido de la organización hardcodeada *(23 archivos)*

- [ ] **T12-BarridoPlanes** `[P]`: `api/plans/route.ts`, `api/plans/[id]/route.ts` — sustituir `DEFAULT_ORG_ID` por `requireSession()` + RBAC. *(FR-006)*
- [ ] **T13-BarridoRouters** `[P]`: `api/routers/route.ts`, `api/routers/[id]/route.ts`, `api/routers/[id]/test/route.ts`, `api/routers/audit-logs/route.ts`. Atención: exponen credenciales cifradas de MikroTik — validar rol `admin`. *(FR-006, FR-009)*
- [ ] **T14-BarridoTickets** `[P]`: `api/tickets/route.ts`, `api/tickets/[id]/route.ts`. *(FR-006)*
- [ ] **T15-BarridoTeam** `[P]`: `api/team/route.ts`, `api/team/[id]/route.ts` — solo rol `admin` puede invitar y modificar miembros. *(FR-006, FR-009)*
- [ ] **T16-BarridoWorkflows** `[P]`: `api/workflows/route.ts`, `api/workflows/[id]/route.ts`, `api/workflows/[id]/logs/route.ts`, `api/workflows/[id]/trigger/route.ts`. *(FR-006)*
- [ ] **T17-BarridoOrgSubs** `[P]`: `api/organization/currency/route.ts`, `api/subscriptions/current/route.ts`. *(FR-006)*
- [ ] **T18-BarridoPaginas**: Sustituir la constante local de organización por `getServerSession()` en las 4 páginas: `(dashboard)/subscribers/page.tsx`, `(dashboard)/subscribers/[id]/page.tsx`, `(dashboard)/plans/page.tsx`, `(dashboard)/messaging/page.tsx`. *(FR-005, FR-006)*
- [ ] **T19-BarridoModulos**: Eliminar los literales restantes en `services/auth.service.ts` (el `defaultOrgId` de `createSuperAdmin`) y acotar `db/seed.ts` a uso exclusivo de desarrollo local. *(FR-006, Edge Cases)*
- [ ] **T20-NotFoundCruzado**: En los accesos por UUID a recursos de otro tenant, devolver **404** en lugar de 403 para no confirmar su existencia. Aplica a `subscribers/[id]`, `tickets/[id]`, `routers/[id]`, `plans/[id]`, `workflows/[id]`. *(US2 escenario 3, SC-001)*

---

## Fase 4 — Autenticación, roles y estado del tenant

- [ ] **T21-LoginEndurecido**: `AuthService.login` — resolver de forma determinista el email duplicado entre organizaciones (H-11), usar `verifyPassword`, rehash transparente cuando `needsRehash`, y respuesta/tiempo indistinguibles entre usuario inexistente y contraseña incorrecta. Emitir la cookie con `createSession`. *(FR-010, FR-011, SC-005)*
- [ ] **T22-Logout**: Crear `POST /api/auth/logout` que borre la sesión en base y expire la cookie. Añadir el control visible en el layout del dashboard. *(FR-013, SC-007)*
- [ ] **T23-RateLimitAuth** `[P]`: Rate limiting por IP (10/min) en `/api/auth/login`, `/api/auth/forgot-password` y `/api/auth/reset-password`, respondiendo 429 antes de consultar la base. *(FR-012)*
- [ ] **T24-RbacSuperAdmin**: Añadir `super_admin` a `UserRole` y `ROLE_PERMISSIONS` en `src/lib/rbac.ts` (hoy quedaría sin permisos, H-12). Añadir `/super-admin` a sus rutas permitidas. *(FR-008)*
- [ ] **T25-GuardSuperAdmin**: Proteger `api/super-admin/tenants/route.ts` (GET y PATCH) y la página `/super-admin/tenants` con `requireRole('super_admin')` → 403. *(FR-008, SC-004)*
- [ ] **T26-CliSuperAdmin**: Crear `scripts/create-super-admin.ts` que cree el primer `super_admin` vía `DATABASE_URL` y se niegue a ejecutarse si ya existe uno. Documentar su uso en el README. *(FR-007)*
- [ ] **T27-EstadoOrganizacion**: Aplicar `organization.status` en `requireSession()`: bloquear si no es `active`, con mensajes diferenciados para `pending` y `suspended`. `/api/register` crea la organización con `status: 'pending'`. Pantalla de "cuenta pendiente de aprobación" en el dashboard. *(FR-015, US4)*
- [ ] **T28-AprobacionTenants**: En `/super-admin/tenants`, permitir aprobar (`pending` → `active`), suspender y reactivar. Al suspender, invocar `destroyAllSessionsForOrg` para cortar las sesiones vivas de ese tenant. *(FR-016, US1 escenario 3, SC-006)*

---

## Fase 5 — UI real

- [ ] **T29-LayoutSesion**: Reemplazar en `(dashboard)/layout.tsx` los valores hardcodeados ("Roberto Morales", "FiberSpeed ISP", "Plan Pro", iniciales "RM") por los datos reales de la sesión y del plan vigente. *(FR-014, H-13)*
- [ ] **T30-NavPorRol**: Filtrar los enlaces de navegación según `ROLE_PERMISSIONS` del rol activo — control cosmético que **no** sustituye la validación del servidor. *(FR-009)*

---

## Fase 6 — Verificación *(Definición de Hecho REFORZADA)*

- [ ] **T31-TestsPerimetro**: Añadir `tests/integration/api/session-perimeter.test.ts` cubriendo: 401 sin sesión en las rutas de negocio; headers de tenant falsificados ignorados; 404 en acceso cruzado por UUID; 403 por rol; 403 en `/api/super-admin/*`; 404 en el seed eliminado; logout invalida; cookie manipulada rechazada; sesión de org suspendida rechazada; rehash transparente de SHA-256. Deben **fallar** si se reintroduce cualquiera de H-01 a H-09. *(FR-020, SC-008)*
- [ ] **T32-GateYE2E**: Añadir al gate el grep de regresión (0 ocurrencias de `00000000-0000-0000-0000-000000000001` y de `x-organization-id` en `src/`); hacer `CRON_SECRET` obligatorio en `/api/cron/*` (503 si falta) y añadir la purga de sesiones expiradas a `/api/cron/cleanup`. Ejecutar `pnpm typecheck && pnpm lint && pnpm build && pnpm test` y el self-test E2E en vivo del §4.2 y §4.3 del plan con dos organizaciones reales. *(FR-018, FR-019, FR-020, SC-002, SC-003, SC-008)*

---

## Trazabilidad Hallazgo → Tarea

| Hallazgo | Tareas que lo cierran |
|---|---|
| H-01 cookie nunca leída | T06, T09, T21 |
| H-02 sin middleware | T08 |
| H-03 tenant desde header | T09, T10, T11 |
| H-04 fallback a org demo | T09, T19 |
| H-05 org hardcodeada (23 archivos) | T12–T19, T32 (grep) |
| H-06 seed-superadmin público | T03, T26 |
| H-07 super-admin sin auth | T24, T25 |
| H-08 SHA-256 sin salt | T07, T21 |
| H-09 cookie sin firma | T06, T21 |
| H-10 secretos R2 en git | T01, T02 |
| H-11 login ambiguo por email | T21 |
| H-12 `super_admin` fuera de RBAC | T24 |
| H-13 identidad hardcodeada en UI | T29 |
| H-14 sin logout | T22 |
| H-15 sin rate limit en auth | T23 |
