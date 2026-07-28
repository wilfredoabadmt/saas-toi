# Tareas de Implementación: 012-repair-db-migrations-seeding

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Estado**: 0/20 completadas — ninguna tarea iniciada

Leyenda: `[P]` = paralelizable con las de su misma fase · `⛔` = requiere acción del dueño

---

## Fase 0 — Preparación *(sin dependencias)*

- [ ] **T01-VerificarEstado** `[P]`: Verificar el estado actual de la base de datos y las migraciones existentes. Ejecutar `pnpm db:studio` o inspeccionar las tablas para confirmar qué falta. *(Contexto)*
- [ ] **T02-VerificarConfig** `[P]`: Revisar `drizzle.config.ts` y `package.json` para asegurar que los comandos de migración y seed están configurados correctamente. *(Contexto)*

---

## Fase 1 — Migraciones de base de datos

- [ ] **T03-GenerarMigraciones**: Ejecutar `pnpm db:generate` para crear las migraciones faltantes (tablas `plans`, columnas `trial_ends_at`, `subscription_status`, `currency` en `organizations` o donde correspondan). Verificar que las migraciones son idempotentes. *(FR-001)*
- [ ] **T04-EjecutarMigraciones**: Configurar la ejecución automática de migraciones al iniciar el servidor o en la fase de build. Crear o modificar un script (por ejemplo, en `scripts/run-migrations.ts` o en el arranque de la app) que ejecute `drizzle-kit migrate` de forma segura. *(FR-001)*
- [ ] **T05-VerificarEsquema**: Verificar que después de las migraciones, las columnas `trial_ends_at`, `subscription_status`, `currency` y la tabla `plans` existen en la base de datos. *(FR-001)*

---

## Fase 2 — Seeder de producción

- [ ] **T06-CrearScriptSeed**: Crear `scripts/init-db-seed.ts` con la lógica para sembrar la base de datos si está vacía. El script debe:
   a. Crear los Planes Predeterminados (Starter, Pro, Enterprise) con precios y funciones.
   b. Crear la Organización Demo ("FiberSpeed ISP") y asignarle el plan Pro activo.
   c. Crear/Actualizar el usuario Super Admin: `superadmin@saas-toi.com` con rol 'super_admin' y hash Bcrypt válido.
   d. Crear/Actualizar el usuario Admin Demo: `admin@ispdemo.com` asociado a "FiberSpeed ISP" con hash Bcrypt válido. *(FR-002)*
- [ ] **T07-IntegrarSeedArranque**: Integrar la ejecución del seeder en el arranque de la aplicación (por ejemplo, en un middleware, en el script de inicio, o en un endpoint de inicialización que se llame una vez). Asegurar que solo se ejecute si la base de datos está vacía (o si falta el plan/usuario). *(FR-002)*
- [ ] **T08-VerificarSeed**: Verificar que después de ejecutar el seeder, los planes, la organización y los usuarios existen en la base de datos con los datos correctos y hashes bcrypt válidos. *(FR-002)*

---

## Fase 3 — Manejo defensivo de errores en endpoints

- [ ] **T09-ProtegerPlans**: Refactorizar `src/app/api/plans/route.ts` y `src/app/api/plans/[id]/route.ts`:
   - Envolver todas las consultas a PostgreSQL en bloques `try/catch`.
   - Si la base de datos devuelve un array vacío o error de conexión, retornar `[]` o un objeto JSON estructurado con status 200/400 en lugar de lanzar un 500 descontrolado. *(FR-003)*
- [ ] **T10-ProtegerTenants**: Refactorizar `src/app/api/super-admin/tenants/route.ts` (GET y PATCH) con el mismo patrón defensivo. *(FR-003)*
- [ ] **T11-ProtegerAuth**: Refactorizar `src/app/api/auth/login/route.ts` y `src/app/api/auth/me/route.ts`:
   - Si las credenciales son válidas, escribir la cookie de sesión firmada `saas_toi_session` correctamente.
   - Si no se encuentra el usuario o la contraseña no coincide, devolver respuesta 401 estructurada `{ error: "Credenciales inválidas" }` para que el formulario lo muestre sin romper la app. *(FR-004)*

---

## Fase 4 — Manejo defensivo de errores en páginas (Server Components)

- [ ] **T12-ProtegerPaginaTenants**: Refactorizar `src/app/(dashboard)/super-admin/tenants/page.tsx`:
   - Agregar contención de errores en Server Components (`try/catch` con UI fallback en lugar de colapsar la pantalla completa). *(FR-005)*
- [ ] **T13-ProtegerPaginaSubscribers**: Refactorizar `src/app/(dashboard)/subscribers/page.tsx` con el mismo patrón. *(FR-005)*
- [ ] **T14-ProtegerPaginaPlans**: Refactorizar `src/app/(dashboard)/plans/page.tsx` con el mismo patrón. *(FR-005)*

---

## Fase 5 — Robustecimiento de autenticación

- [ ] **T15-LoginRobusto**: Mejorar `src/app/api/auth/login/route.ts` para manejar correctamente la cookie de sesión (firmada, con httpOnly, secure, sameSite). Asegurar que la respuesta sea consistente (200 con usuario o 401 con error). *(FR-004)*
- [ ] **T16-MeRobusto**: Mejorar `src/app/api/auth/me/route.ts` para que devuelva el usuario actual a partir de la cookie, o 401 si no hay sesión válida. *(FR-004)*

---

## Fase 6 — Verificación

- [ ] **T17-TypecheckLintBuild**: Ejecutar `npm run typecheck && npm run lint && npm run build` para asegurar que el proyecto compila sin errores. *(FR-006)*
- [ ] **T18-TestManuales**: Realizar pruebas manuales o automatizadas (si existen) para verificar:
   - Que `/api/plans` devuelve los planes sembrados o un array vacío sin 500.
   - Que `/api/super-admin/tenants` funciona con autenticación de super_admin.
   - Que el login con credenciales válidas establece la cookie y redirige.
   - Que el login con credenciales inválidas muestra el error en el formulario.
   - Que las páginas del dashboard no muestran pantalla blanca ante errores de base de datos. *(FR-007)*

---

## Trazabilidad Requisito → Tarea

| Requisito | Tareas que lo cubren |
|---|---|
| FR-001: Migraciones automáticas | T03, T04, T05 |
| FR-002: Seeder de producción | T06, T07, T08 |
| FR-003: Endpoints defensivos | T09, T10 |
| FR-004: Auth robusto | T11, T15, T16 |
| FR-005: Páginas defensivas | T12, T13, T14 |
| FR-006: Compilación limpia | T17 |
| FR-007: Verificación funcional | T18 |
