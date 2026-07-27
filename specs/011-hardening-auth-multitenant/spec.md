# Feature Specification: 011-hardening-auth-multitenant

**Feature Branch**: `011-hardening-auth-multitenant`
**Created**: 2026-07-26
**Status**: Draft
**Input**: Auditoría exhaustiva del SaaS previa a la puesta en línea. El esquema multi-tenant es correcto, pero **no existe capa de sesión en runtime**: la cookie de login nunca se lee, el `organization_id` se toma de un header controlable por el cliente y ~23 archivos operan sobre una organización demo hardcodeada. Esta feature construye la autenticación real y cierra las vías de acceso cruzado y de escalada de privilegios.

---

## Contexto del hallazgo *(por qué existe esta spec)*

La auditoría del 2026-07-26 sobre la rama `010-meta-compliance-legal-pages` encontró que el gate técnico está verde (typecheck limpio, 135/135 tests) **porque los tests solo ejercitan la capa de servicios**, que sí exige `organization_id`. La capa HTTP que alimenta a esos servicios no está verificada por ninguna prueba, y es donde está el fallo.

Evidencia concreta:

| # | Hallazgo | Archivo |
|---|---|---|
| H-01 | La cookie `saas_toi_session` se emite en login y **no se lee en ningún otro punto del repo** | [login/route.ts:19](../../src/app/api/auth/login/route.ts#L19) |
| H-02 | No existe `middleware.ts`; el grupo `/(dashboard)` es accesible sin sesión | — |
| H-03 | El tenant se resuelve desde el header `x-organization-id`, controlable por el atacante | [auth.ts:9-19](../../src/lib/auth.ts#L9-L19) |
| H-04 | Si no hay header, todo cae en `DEFAULT_ORG_ID` (org demo): hoy **todos los ISPs comparten organización** | [auth.ts:22](../../src/lib/auth.ts#L22) |
| H-05 | 16 rutas API + 4 páginas tienen `DEFAULT_ORG_ID` hardcodeado en el propio archivo | ver FR-006 |
| H-06 | `POST /api/auth/seed-superadmin` es público y **promueve cualquier email existente a `super_admin` reescribiendo su password** | [seed-superadmin/route.ts](../../src/app/api/auth/seed-superadmin/route.ts) |
| H-07 | `/api/super-admin/tenants` no valida rol: lista todos los ISPs y suspende suscripciones de cualquiera | [super-admin/tenants/route.ts](../../src/app/api/super-admin/tenants/route.ts) |
| H-08 | Password hasheado con SHA-256 **sin salt**, comparado con `!==` (timing) | [auth.service.ts:13](../../src/services/auth.service.ts#L13) |
| H-09 | La cookie de sesión es `JSON.stringify(user)` **sin firma**: es forjable con curl | [login/route.ts:19](../../src/app/api/auth/login/route.ts#L19) |
| H-10 | Credenciales reales de Cloudflare R2 versionadas en `.env.example` (presentes en el historial de git) | [.env.example](../../.env.example) |
| H-11 | `login()` busca por email con `.limit(1)`, pero el índice único es `(email, organization_id)`: dos ISPs con el mismo email de admin producen login ambiguo | [auth.service.ts:96](../../src/services/auth.service.ts#L96) |
| H-12 | `UserRole` no incluye `super_admin`, por lo que `hasPermission()` lo trataría como rol sin permisos | [rbac.ts:3](../../src/lib/rbac.ts#L3) |
| H-13 | El dashboard muestra identidad hardcodeada ("Roberto Morales", "FiberSpeed ISP", "Plan Pro") | [(dashboard)/layout.tsx](../../src/app/(dashboard)/layout.tsx) |
| H-14 | No existe endpoint de logout | — |
| H-15 | Sin rate limiting en `/api/auth/login` ni `/api/auth/forgot-password` | — |

Esta feature viola hoy los Principios **I** (Multi-Tenancy Absoluto) y **II** (Seguridad de Credenciales) de la constitución. Es bloqueante para cualquier despliegue en línea.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Sesión real, revocable y ligada al tenant (Priority: P1)

**Como** administrador de un ISP cliente
**Quiero** iniciar sesión y que el sistema recuerde de forma confiable quién soy y a qué organización pertenezco
**Para** operar únicamente sobre mis abonados, y que mi sesión pueda cerrarse o revocarse de verdad.

**Why this priority**: Sin esto no existe ninguna otra garantía. Todo el resto de la feature depende de que exista una fuente de verdad del tenant que el cliente no pueda manipular.

**Independent Test**: Iniciar sesión con un usuario de la Org A, inspeccionar la cookie (debe ser un identificador opaco, no un JSON legible), navegar el dashboard y pulsar "Cerrar sesión". Reutilizar la cookie anterior con `curl` debe devolver 401.

**Acceptance Scenarios**:
1. **Given** credenciales válidas, **When** el usuario hace login, **Then** se crea un registro en `sessions` y se emite una cookie `httpOnly`, `secure`, `sameSite=lax` cuyo valor es un identificador opaco firmado — **nunca** datos del usuario en claro.
2. **Given** una sesión activa, **When** el usuario pulsa "Cerrar sesión", **Then** el registro de `sessions` se elimina y cualquier petición posterior con esa cookie devuelve 401.
3. **Given** una sesión activa de la Org A, **When** el Super Admin suspende la Org A desde su panel, **Then** la siguiente petición del usuario es rechazada sin esperar a la expiración de la cookie.
4. **Given** una cookie caducada o manipulada (firma inválida, id inexistente), **When** se envía a cualquier ruta protegida, **Then** el sistema responde 401 en API y redirige a `/login` en páginas, sin filtrar en el mensaje si el fallo fue de firma o de existencia.
5. **Given** dos organizaciones distintas que registraron el **mismo email** de administrador, **When** cualquiera de los dos inicia sesión, **Then** el sistema resuelve la cuenta correcta de forma determinista y ambos acceden solo a su propia organización.

---

### User Story 2 — Aislamiento de datos entre ISPs a prueba de manipulación (Priority: P1)

**Como** dueño del SaaS
**Quiero** que ningún ISP pueda ver ni modificar datos de otro, aunque manipule la petición HTTP
**Para** cumplir la promesa de privacidad sobre la que se vende el producto y el Principio I de la constitución.

**Why this priority**: Es el requisito comercial central declarado por el dueño: *"no debería mezclarse nada de mis clientes ISP y sus usuarios"*. Un solo caso de fuga cruzada invalida el producto.

**Independent Test**: Con una sesión válida de la Org A, enviar `curl -H "X-Organization-ID: <uuid-org-B>" /api/subscribers` y verificar que la respuesta contiene **exclusivamente** abonados de la Org A. Repetir para `/api/tickets`, `/api/routers`, `/api/plans`, `/api/team`, `/api/workflows`.

**Acceptance Scenarios**:
1. **Given** una sesión de la Org A, **When** la petición incluye headers `x-organization-id` / `x-user-id` / `x-user-role` apuntando a la Org B, **Then** los headers son **ignorados por completo** y la operación se ejecuta sobre la Org A.
2. **Given** una petición sin sesión a cualquier ruta de negocio, **When** llega al servidor, **Then** responde 401 y **jamás** cae en una organización por defecto.
3. **Given** un recurso identificado por UUID que pertenece a la Org B (p. ej. `GET /api/subscribers/<id-de-B>`), **When** lo solicita un usuario de la Org A, **Then** el sistema responde 404 — no 403 — para no confirmar la existencia del recurso ajeno.
4. **Given** cualquier ruta API de negocio del repositorio, **When** se audita su código, **Then** no contiene ningún `organization_id` literal ni fallback a una organización demo.
5. **Given** una sesión válida de rol `technician`, **When** intenta acceder a `/settings/team` o `/api/team`, **Then** recibe 403 por RBAC, aun perteneciendo a la organización correcta.

---

### User Story 3 — Cierre de las vías de escalada a Super Admin (Priority: P1)

**Como** dueño del SaaS
**Quiero** ser el único capaz de administrar tenants y de tener rol `super_admin`
**Para** que nadie desde internet pueda apoderarse de la plataforma completa.

**Why this priority**: `seed-superadmin` permite hoy tomar control de cualquier cuenta desde internet sin autenticación alguna. Es explotable en una sola petición.

**Independent Test**: `POST /api/auth/seed-superadmin` sin sesión debe devolver 404. `GET /api/super-admin/tenants` con sesión de admin de ISP debe devolver 403. Ambas con sesión de `super_admin` funcionan.

**Acceptance Scenarios**:
1. **Given** el endpoint de aprovisionamiento del Super Admin, **When** se invoca sin una sesión de `super_admin` válida, **Then** responde 404 y no ejecuta ninguna escritura.
2. **Given** el bootstrap inicial de la plataforma (base de datos vacía, sin ningún `super_admin`), **When** el dueño ejecuta el procedimiento de arranque, **Then** puede crear la primera cuenta `super_admin` mediante un mecanismo fuera de la superficie HTTP pública (script CLI con acceso a `DATABASE_URL`), y ese mecanismo se niega a ejecutarse si ya existe un `super_admin`.
3. **Given** cualquier respuesta de la API, **When** se inspecciona su cuerpo, **Then** nunca contiene contraseñas en claro ni `credentialsHint`.
4. **Given** un usuario `super_admin`, **When** navega el sistema, **Then** el RBAC lo reconoce como rol válido con acceso a `/super-admin/*`, y ningún otro rol puede acceder a esas rutas.
5. **Given** las rutas `/api/super-admin/*`, **When** las invoca un `admin` de ISP, **Then** responden 403 sin revelar información de otros tenants.

---

### User Story 4 — Alta de ISPs con aprobación del dueño (Priority: P2)

**Como** dueño del SaaS
**Quiero** que quien se registre no pueda operar hasta que yo apruebe su organización
**Para** controlar quién entra a la plataforma sin renunciar al registro autoservicio.

**Why this priority**: Depende de que exista sesión y guard de Super Admin (US1 y US3). Es control de negocio, no una brecha de seguridad activa.

**Independent Test**: Registrar una organización nueva desde `/register`, iniciar sesión con ella y verificar que se muestra una pantalla de "cuenta pendiente de aprobación" en lugar del dashboard. Aprobarla desde `/super-admin/tenants` y verificar que el acceso se habilita sin volver a iniciar sesión.

**Acceptance Scenarios**:
1. **Given** un registro nuevo en `/register`, **When** se crea la organización, **Then** nace con `status = 'pending'` y su usuario admin puede autenticarse pero no operar.
2. **Given** una organización `pending`, **When** su admin intenta cualquier ruta de negocio (API o dashboard), **Then** es redirigido/rechazado con un mensaje claro de "pendiente de aprobación", sin error 500.
3. **Given** el Super Admin en `/super-admin/tenants`, **When** aprueba una organización, **Then** pasa a `status = 'active'` y su admin opera con normalidad en la siguiente petición.
4. **Given** una organización con `status` `suspended`, **When** su admin intenta operar, **Then** se le bloquea igual que a una `pending`, con mensaje diferenciado.

---

### User Story 5 — Credenciales almacenadas y rotadas correctamente (Priority: P2)

**Como** dueño del SaaS
**Quiero** que las contraseñas sean irrecuperables ante un volcado de base de datos y que los secretos filtrados dejen de ser válidos
**Para** cumplir el Principio II y limitar el daño de una filtración.

**Why this priority**: El daño es diferido (requiere una filtración previa para explotarse), pero la rotación de las llaves R2 filtradas es inmediata y no depende de código.

**Independent Test**: Registrar un usuario, inspeccionar `password_hash` en la base y verificar que dos usuarios con la misma contraseña producen hashes distintos. Iniciar sesión con una cuenta creada antes de esta feature y comprobar que sigue funcionando y que su hash queda migrado al nuevo formato.

**Acceptance Scenarios**:
1. **Given** dos usuarios con idéntica contraseña, **When** se comparan sus `password_hash`, **Then** son diferentes (salt por usuario) y el formato identifica el algoritmo y sus parámetros.
2. **Given** un usuario creado con el esquema SHA-256 anterior, **When** inicia sesión con su contraseña correcta, **Then** entra con normalidad y su hash se re-escribe de forma transparente al nuevo formato, sin pedirle acción alguna.
3. **Given** un intento de login con contraseña incorrecta, **When** se mide el tiempo de respuesta, **Then** no permite distinguir "usuario inexistente" de "contraseña incorrecta", y el mensaje al cliente es idéntico en ambos casos.
4. **Given** 10 intentos fallidos de login desde la misma IP en un minuto, **When** llega el siguiente intento, **Then** responde 429 sin consultar la base de datos.
5. **Given** el repositorio, **When** se inspecciona `.env.example`, **Then** no contiene ningún secreto real, solo marcadores `REEMPLAZA_*`, y las llaves R2 previamente expuestas han sido rotadas en Cloudflare.

---

### Edge Cases

- **Sesión válida cuyo usuario fue eliminado del equipo**: la resolución de sesión debe detectar el usuario inexistente y responder 401 en lugar de fallar con excepción no controlada.
- **Sesión válida cuyo rol cambió** (p. ej. de `admin` a `technician` mientras navegaba): el rol se lee del registro vivo del usuario en cada petición, no del contenido congelado de la cookie.
- **Base de datos caída durante la resolución de sesión**: el middleware debe degradar a 503 con mensaje claro, no a un acceso permitido ni a una pantalla en blanco.
- **Rutas públicas legales y de Meta**: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/accept-invite`, `/privacy`, `/terms`, `/data-deletion`, `/api/health`, `/api/waba/webhook`, `/api/webhooks/whatsapp`, `/api/waba/deauthorize`, `/api/legal/*`, `/api/data-deletion` **no deben** exigir sesión: los webhooks de Meta se autentican por firma HMAC y romperlos desactiva la integración.
- **Peticiones del cron**: `/api/cron/*` se autentica con `CRON_SECRET` obligatorio, no con sesión; hoy el secreto es opcional y si falta el endpoint queda abierto.
- **Organización demo `00000000-…-0001`**: tras el barrido, el seed no debe seguir creando una organización que actúe como destino por defecto de tráfico real.
- **Sesiones expiradas acumuladas**: la tabla `sessions` crece indefinidamente si nadie la purga.
- **Doble webhook**: coexisten `/api/waba/webhook` y `/api/webhooks/whatsapp`; ambos resuelven tenant por `phone_number_id` correctamente, pero debe quedar documentado cuál se registra en Meta.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** — **Sesión persistida y revocable**: El sistema DEBE mantener las sesiones en una tabla `sessions` de PostgreSQL. La cookie DEBE contener únicamente un identificador opaco de alta entropía (≥ 256 bits) acompañado de firma HMAC; el registro en base DEBE guardar solo un **hash** de ese identificador, de modo que un volcado de la tabla no permita suplantar sesiones. Atributos obligatorios: `httpOnly`, `secure` en producción, `sameSite=lax`, `path=/`, expiración de 7 días.
- **FR-002** — **Fuente única de verdad del tenant**: `getSessionContext()` (usado hoy por 16 rutas API) DEBE resolver `organizationId`, `userId` y `role` **exclusivamente** desde la sesión persistida. Los headers `x-organization-id`, `x-user-id` y `x-user-role` DEBEN dejar de leerse en todo el código. El fallback a `DEFAULT_ORG_ID` / `DEFAULT_USER_ID` DEBE eliminarse, junto con esas variables de entorno.
- **FR-003** — **Fallo cerrado**: Ante ausencia de sesión, sesión inválida, expirada o usuario inexistente, el sistema DEBE lanzar `UNAUTHORIZED` (401 en API, redirección a `/login` en páginas). Está prohibido devolver una organización por defecto bajo cualquier circunstancia, incluido `NODE_ENV=development`.
- **FR-004** — **Middleware de protección**: DEBE existir `src/middleware.ts` que exija sesión para todo el grupo `/(dashboard)` y para `/api/*`, con una allowlist explícita de rutas públicas (ver Edge Cases). El middleware DEBE ser la primera línea de defensa, **sin sustituir** la verificación en cada handler (defensa en profundidad).
- **FR-005** — **Contexto de tenant en Server Components**: Las páginas del dashboard DEBEN obtener el contexto mediante un helper de servidor que lea la cookie de sesión, en lugar de declarar constantes locales de organización.
- **FR-006** — **Barrido de organización hardcodeada**: DEBE eliminarse todo literal `00000000-0000-0000-0000-000000000001` de código de aplicación. Alcance verificado (23 archivos):
  - **16 rutas API**: `organization/currency`, `plans`, `plans/[id]`, `routers`, `routers/[id]`, `routers/[id]/test`, `routers/audit-logs`, `subscriptions/current`, `team`, `team/[id]`, `tickets`, `tickets/[id]`, `workflows`, `workflows/[id]`, `workflows/[id]/logs`, `workflows/[id]/trigger`.
  - **4 páginas**: `subscribers`, `subscribers/[id]`, `plans`, `messaging`.
  - **3 módulos**: `lib/auth.ts`, `services/auth.service.ts`, `db/seed.ts`.
- **FR-007** — **Cierre del bootstrap de Super Admin**: `POST /api/auth/seed-superadmin` DEBE eliminarse de la superficie HTTP. La creación del primer `super_admin` DEBE realizarse mediante un script CLI ejecutado con acceso a `DATABASE_URL`, que DEBE negarse a ejecutarse si ya existe un `super_admin`. Ninguna respuesta de la API puede devolver contraseñas en claro.
- **FR-008** — **Guard de Super Admin**: Todas las rutas bajo `/api/super-admin/*` y `/super-admin/*` DEBEN exigir sesión con rol `super_admin`, respondiendo 403 en caso contrario. `super_admin` DEBE incorporarse al tipo `UserRole` y a `ROLE_PERMISSIONS` en `lib/rbac.ts`.
- **FR-009** — **RBAC aplicado en el servidor**: Cada ruta API de negocio DEBE validar el rol de la sesión contra `ROLE_PERMISSIONS` antes de ejecutar. La navegación del dashboard DEBE ocultar los enlaces no permitidos para el rol activo, sin que esa ocultación sea el único control.
- **FR-010** — **Hashing de contraseñas**: DEBE sustituirse SHA-256 por `scrypt` de `node:crypto` (sin dependencias nuevas), con salt aleatorio de 16 bytes por usuario y formato `scrypt$N$r$p$<salt_b64>$<hash_b64>`. La comparación DEBE usar `crypto.timingSafeEqual`. Los hashes SHA-256 existentes DEBEN seguir validando y migrarse de forma transparente en el siguiente login exitoso.
- **FR-011** — **Login determinista y no enumerable**: `AuthService.login` DEBE resolver correctamente el caso de un mismo email en varias organizaciones. El mensaje y el tiempo de respuesta DEBEN ser indistinguibles entre "usuario inexistente" y "contraseña incorrecta".
- **FR-012** — **Rate limiting de autenticación**: `/api/auth/login`, `/api/auth/forgot-password` y `/api/auth/reset-password` DEBEN limitarse por IP (10 intentos/minuto), respondiendo 429 antes de tocar la base de datos.
- **FR-013** — **Logout**: DEBE existir `POST /api/auth/logout` que elimine la sesión en base y expire la cookie, más un control visible en el dashboard.
- **FR-014** — **Identidad real en la UI**: El layout del dashboard DEBE mostrar el nombre del usuario, el nombre de la organización, el rol y el plan reales de la sesión, eliminando los valores hardcodeados.
- **FR-015** — **Estado de organización aplicado**: El sistema DEBE bloquear la operación de organizaciones con `status` distinto de `active`, diferenciando el mensaje entre `pending` (esperando aprobación) y `suspended` (acceso suspendido). Las organizaciones creadas vía `/register` DEBEN nacer `pending`.
- **FR-016** — **Aprobación de tenants**: El panel `/super-admin/tenants` DEBE permitir aprobar (`pending` → `active`), suspender y reactivar organizaciones, y el efecto DEBE ser inmediato sobre las sesiones vivas de ese tenant.
- **FR-017** — **Rotación y saneamiento de secretos**: `.env.example` DEBE contener únicamente marcadores `REEMPLAZA_*`. Las llaves de Cloudflare R2 expuestas DEBEN rotarse. DEBEN documentarse todas las variables que el código consume y que hoy faltan: `SESSION_SECRET` (nueva), `OPENROUTER_API_TOKEN`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`, `SMTP_HOST`, `CRON_SECRET`, `BILLING_CURRENCY`.
- **FR-018** — **Cron autenticado**: `CRON_SECRET` DEBE ser obligatorio en `/api/cron/*`; si no está configurado, el endpoint DEBE responder 503 en lugar de quedar abierto.
- **FR-019** — **Purga de sesiones**: Las sesiones expiradas DEBEN eliminarse periódicamente, reutilizando el job de `/api/cron/cleanup`.
- **FR-020** — **Cobertura de pruebas del perímetro**: DEBEN añadirse pruebas que ejerciten la **capa HTTP**, no solo servicios: rechazo de headers de tenant falsificados, 401 sin sesión, 404 en acceso cruzado por UUID, 403 por rol, 403 en `/api/super-admin/*` con rol no autorizado, y 404 en el endpoint de seed eliminado.

### Non-Functional Requirements

- **NFR-001**: La resolución de sesión DEBE añadir menos de 15 ms de latencia p95 por petición (una consulta indexada por `token_hash`).
- **NFR-002**: Ningún log, mensaje de error ni respuesta puede contener el valor de la cookie de sesión, `SESSION_SECRET`, contraseñas ni tokens de Meta (Principio II).
- **NFR-003**: La migración DEBE ser retrocompatible: ningún usuario existente pierde el acceso ni necesita restablecer su contraseña.
- **NFR-004**: Las rutas de webhook de Meta DEBEN conservar su latencia actual (≤ 5 s) y no verse afectadas por el middleware.

---

### Key Entities

- **Session** (tabla nueva `sessions`):
  - `id` (UUID, PK)
  - `token_hash` (text, único, indexado) — SHA-256 del identificador opaco; **nunca** el identificador en claro
  - `user_id` (UUID, FK → `users.id`, `onDelete: cascade`, indexado)
  - `organization_id` (UUID, FK → `organizations.id`, `onDelete: cascade`, indexado) — Principio I
  - `expires_at` (timestamp, indexado)
  - `created_at`, `last_used_at` (timestamp)
  - `ip`, `user_agent` (text, opcionales, para auditoría)

- **Organization** (cambio de comportamiento, sin cambio de esquema):
  - `status` pasa a usarse activamente con los valores `pending` | `active` | `suspended`. Las altas vía `/register` nacen `pending`.

- **User** (cambio de formato, sin cambio de esquema):
  - `password_hash` adopta el formato `scrypt$N$r$p$<salt_b64>$<hash_b64>`, conviviendo con los hashes SHA-256 heredados durante la migración transparente.
  - `role` admite `super_admin` además de `admin` | `billing` | `technician`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **0 accesos cruzados.** Con una sesión válida de la Org A y headers falsificados apuntando a la Org B, las 6 familias de endpoints de negocio (`subscribers`, `tickets`, `routers`, `plans`, `team`, `workflows`) devuelven exclusivamente datos de la Org A. Verificado con peticiones reales, no con mocks.
- **SC-002**: **0 ocurrencias** del literal `00000000-0000-0000-0000-000000000001` y **0 lecturas** de `x-organization-id` en `src/` (excluyendo comentarios de documentación), comprobables con un grep en el gate.
- **SC-003**: **100% de las rutas de negocio** responden 401 sin sesión. Medido enumerando las rutas de `src/app/api/` menos la allowlist pública.
- **SC-004**: `POST /api/auth/seed-superadmin` devuelve **404** y `GET /api/super-admin/tenants` devuelve **403** con sesión de admin de ISP.
- **SC-005**: Un usuario creado antes de esta feature inicia sesión correctamente y su `password_hash` queda migrado a `scrypt` — **0 restablecimientos forzados**.
- **SC-006**: Una organización `pending` no puede leer ni escribir ningún dato de negocio; tras la aprobación del Super Admin opera con normalidad **sin reiniciar sesión**.
- **SC-007**: Tras el logout, la cookie previa devuelve **401** en el 100% de los intentos de reutilización.
- **SC-008**: El gate completo (`typecheck` + `lint` + `build` + `test`) en verde, con las pruebas de perímetro de FR-020 incluidas y **fallando si se reintroduce cualquiera de los hallazgos H-01 a H-09**.
- **SC-009**: Latencia p95 del dashboard autenticado sin degradación superior a 15 ms respecto de la medición previa (NFR-001).

---

## Out of Scope *(se trata en la spec 012)*

Estos hallazgos de la auditoría son reales pero **no** entran aquí, para mantener 011 acotada a seguridad y aislamiento:

- Envío real de correo: `EmailService` es hoy un mock que retorna `success: true` sin enviar nada, dejando muertos el restablecimiento de contraseña y las invitaciones de equipo.
- Planificador de recordatorios de cobranza, cortes/reconexiones y workflows de nurturing (hoy solo existe `/api/cron/cleanup`).
- Configuración de despliegue en el VPS: no hay `Dockerfile` ni compose; `prestart` invoca `drizzle-kit` (devDependency) y `/api/health` se traga los errores de migración devolviendo `status: ok`.
- Backups de PostgreSQL, observabilidad y alertas.
- Cabeceras de seguridad / CSP en `next.config.ts`.
- Unificación de los dos webhooks de WhatsApp coexistentes.
- Migración del rate limiter y del dedup de webhooks de memoria a almacenamiento compartido (necesario solo si se escala a múltiples instancias).

---

## Assumptions

- El despliegue es **una sola instancia** en VPS propio, por lo que el rate limiting en memoria sigue siendo aceptable en 011.
- No se introducen dependencias nuevas: `scrypt` y `timingSafeEqual` vienen en `node:crypto`, y las sesiones se persisten con el Drizzle ya presente.
- El módulo WABA (feature 011 exportada) conserva su lógica; solo se corrige la fuente de la que `assertCanManageWaba()` obtiene el tenant, ya que hoy delega en el `getSessionContext()` vulnerable.
- La organización demo del seed se mantiene únicamente para desarrollo local y pruebas, nunca como destino de tráfico autenticado.
- El dueño ejecuta la rotación de las llaves R2 en el panel de Cloudflare; el repositorio solo refleja los marcadores.
