# Spec: 012-repair-db-migrations-seeding

**Objetivo**: Resolver los errores 500 en `/api/plans` y `/api/super-admin/tenants`, garantizar la ejecución automática de migraciones en producción, sembrar los planes y usuarios demo con contraseñas bcrypt válidas y evitar pantallas blancas por excepciones no capturadas.

---

## Contexto

La aplicación presenta errores 500 en los endpoints `/api/plans` y `/api/super-admin/tenants` debido a:
1. Migraciones de Drizzle ORM no ejecutadas o incompletas (faltan tablas/columnas como `plans`, `trial_ends_at`, `subscription_status`, `currency`).
2. Ausencia de datos iniciales (planes, organización demo, usuarios) en la base de datos de producción.
3. Falta de manejo defensivo de errores en endpoints y Server Components, lo que provoca pantallas blancas.

---

## Requisitos Funcionales

### FR-001: Migraciones automáticas de Drizzle
- Verificar y empaquetar las migraciones de Drizzle ORM para que corran automáticamente al iniciar el servidor o en la fase de build (`drizzle-kit migrate` o auto-migration en arranque).
- Asegurar que las columnas `trial_ends_at`, `subscription_status`, `currency` y la tabla de planes existan en la BD.

### FR-002: Seeder automático de producción e inicialización
- Crear `scripts/init-db-seed.ts` como seeder auto-ejecutable al arrancar la app si la base de datos está vacía:
  a. Crear los Planes Predeterminados (Starter, Pro, Enterprise) con precios y funciones.
  b. Crear la Organización Demo ("FiberSpeed ISP") y asignarle el plan Pro activo.
  c. Crear/Actualizar el usuario Super Admin: `superadmin@saas-toi.com` con rol 'super_admin' y hash Bcrypt válido.
  d. Crear/Actualizar el usuario Admin Demo: `admin@ispdemo.com` asociado a "FiberSpeed ISP" con hash Bcrypt válido.

### FR-003: Manejo defensivo de errores en endpoints
- Refactorizar `/api/super-admin/tenants` y `/api/plans`:
  - Envolver todas las consultas a PostgreSQL en bloques `try/catch`.
  - Si la base de datos devuelve un array vacío o error de conexión, retornar `[]` o un objeto JSON estructurado con status 200/400 en lugar de lanzar un 500 descontrolado.

### FR-004: Robustecimiento de autenticación
- `/api/auth/login` y `/api/auth/me`:
  - Si las credenciales son válidas, escribir la cookie de sesión firmada `saas_toi_session` correctamente.
  - Si no se encuentra el usuario o la contraseña no coincide, devolver respuesta 401 estructurada `{ error: "Credenciales inválidas" }` para que el formulario lo muestre sin romper la app.

### FR-005: Manejo defensivo de errores en páginas (Server Components)
- Refactorizar las páginas del Dashboard (`/super-admin/tenants`, `/subscribers`, `/plans`):
  - Agregar contención de errores en Server Components (`try/catch` con UI fallback en lugar de colapsar la pantalla completa).

### FR-006: Compilación limpia
- El proyecto debe compilar sin errores con `npm run typecheck` y `npm run build`.

### FR-007: Verificación funcional
- Verificar que los endpoints devuelven datos correctos o errores controlados.
- Verificar que el login funciona con credenciales válidas e inválidas.
- Verificar que las páginas del dashboard no muestran pantallas blancas.

---

## Criterios de Aceptación

1. Las migraciones de Drizzle se ejecutan automáticamente al iniciar la aplicación.
2. La base de datos contiene los planes predeterminados, la organización demo y los usuarios demo después del primer arranque.
3. Los endpoints `/api/plans` y `/api/super-admin/tenants` no devuelven errores 500; en su lugar, devuelven datos vacíos o errores controlados con status 200/400.
4. El login con credenciales válidas establece la cookie de sesión y redirige al dashboard.
5. El login con credenciales inválidas muestra un mensaje de error en el formulario sin romper la aplicación.
6. Las páginas del dashboard muestran un UI fallback amigable en caso de error de base de datos.
7. El proyecto compila sin errores con `npm run typecheck` y `npm run build`.

---

## Fuera de Alcance

- Cambios en la lógica de negocio existente (solo se agrega manejo defensivo y seed inicial).
- Modificación de la estructura de tablas existentes (solo se agregan las faltantes).
- Implementación de tests automatizados (se sugiere para futuro).
