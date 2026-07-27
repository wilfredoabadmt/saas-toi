# Feature Specification: 011-hardening-auth-multitenant

**Feature Branch**: `011-hardening-auth-multitenant`  
**Created**: 2026-07-27  
**Status**: Draft / Specified  
**Domain**: SaaS Multi-Tenant para ISPs (Seguridad, Sesión y Aislamiento Multi-Tenant en Runtime)  

---

## 1. Problema a Resolver & Contexto

El sistema supera los tests unitarios de la capa de servicios pero **carece de barrera de seguridad HTTP en runtime**. 

### Hallazgos de Seguridad Críticos:
1. **Sesión No Firmada y No Validada**: La cookie de sesión (`saas_toi_session`) es un JSON en claro sin firma HMAC/JWT que no se valida ni se recupera en runtime.
2. **Ausencia de Middleware Edge**: No existe `middleware.ts` en Next.js. Las rutas de `/(dashboard)` y `/api/*` son completamente accesibles sin autenticación previa.
3. **Suplantación de Tenant (Tenant Impersonation)**: `getSessionContext()` en `auth.ts` lee el header `X-Organization-ID` enviado por el cliente sin verificar autenticación, permitiendo a cualquier cliente suplantar organizaciones ajenas.
4. **Organización Hardcodeada (Org Demo Fallback)**: Ante la ausencia de header o sesión, el sistema cae en `DEFAULT_ORG_ID` (`00000000-0000-0000-0000-000000000001`), compartido hardcodeado en ~24 archivos entre rutas API y páginas.
5. **Endpoint Público de Toma de Control**: `POST /api/auth/seed-superadmin` es público y permite promover cualquier email a `super_admin` reescribiendo la contraseña sin autenticación.
6. **Hashing Inseguro & Timing Attacks**: Contraseñas en la base de datos hasheadas con SHA-256 sin salt, comparadas con igualdad simple (`!==`), vulnerables a ataques de tiempo y tablas arcoíris.
7. **Exposición de Secretos**: Credenciales reales de Cloudflare R2 presentes en `.env.example`.
8. **Envío de Correos Mockeado**: `email.service.ts` retorna éxito sin realizar envíos transaccionales reales, impidiendo la recuperación de contraseña e invitaciones.
9. **Rutas Super Admin Abiertas**: Endpoints bajo `/api/super-admin/*` no validan de manera estricta el rol `super_admin`.
10. **Endpoints Cron Expuestos**: Rutas bajo `/api/cron/*` no exigen obligatoriamente la presencia de `CRON_SECRET`.
11. **Duplicidad de Webhooks WhatsApp**: Coexistencia de `/api/waba/webhook` y `/api/webhooks/whatsapp` sin unificación ni deprecación formal.

---

## 2. User Scenarios & Prioritized User Stories *(mandatory)*

### User Story 1 — Autenticación Segura con Cookie Firmada (Priority: P0-Security)
**Como** Usuario del SaaS (Administrador de ISP o Técnico)  
**Quiero** autenticarme de forma segura mediante una cookie de sesión firmada (`saas_toi_session` usando HMAC-SHA256 / JWT con `SESSION_SECRET`)  
**Para** que mi identidad y tenant no puedan ser manipulados, alterados ni falsificados por un tercero.

**Why this priority**: Es la piedra angular de la seguridad en el runtime. Sin una firma criptográfica y tokens opacos/verificados, cualquier control posterior es superable.

**Independent Test**:
- Realizar login exitoso, inspeccionar la cookie `saas_toi_session` en el navegador (debe ser un token firmado HMAC/JWT, no JSON en claro).
- Modificar manualmente un solo carácter de la cookie con herramientas de desarrollador y recargar `/dashboard` o hacer `curl /api/subscribers`. Debe retornar `401 Unauthorized`.

**Acceptance Scenarios**:
1. **Given** credenciales válidas en `/api/auth/login`, **When** el usuario se autentica, **Then** el servidor emite una cookie HTTP-only, Secure (en prod), SameSite=Lax, firmada mediante HMAC-SHA256 o JWT utilizando la clave secreta `SESSION_SECRET`.
2. **Given** una cookie de sesión activa y alterada o forjada manualmente, **When** el usuario realiza una petición, **Then** el sistema detecta la falla de firma y responde inmediatamente `401 Unauthorized` (o redirige a `/login` en navegación de páginas).
3. **Given** un usuario autenticado que solicita `POST /api/auth/logout`, **When** se procesa la solicitud, **Then** la sesión en la base de datos se invalida/elimina y la cookie se invalida en el cliente.

---

### User Story 2 — Intercepción y Protección Centralizada en el Edge (Priority: P0-Security)
**Como** Sistema  
**Quiero** ejecutar un `middleware.ts` en el Edge que intercepte y proteja todas las rutas `/(dashboard)` y `/api/*` (excepto webhooks y auth públicos)  
**Para** redirigir o rechazar peticiones no autenticadas con `401 Unauthorized` o `403 Forbidden` antes de llegar a los handlers.

**Why this priority**: Evita que peticiones no autorizadas o sin sesión alcancen la lógica de negocio ni consuman recursos de base de datos.

**Independent Test**:
- Enviar una petición HTTP `GET /dashboard` o `GET /api/subscribers` sin cookie de sesión ni headers.
- Verificar que `GET /dashboard` redirige a `/login` y `GET /api/subscribers` retorna HTTP status `401`.

**Acceptance Scenarios**:
1. **Given** un cliente no autenticado (sin cookie `saas_toi_session` válida), **When** intenta acceder a cualquier subruta de `/(dashboard)`, **Then** el `middleware.ts` intercepta la petición y redirige a `/login`.
2. **Given** un cliente no autenticado, **When** realiza una petición `GET` / `POST` / `PUT` / `DELETE` a `/api/*` (fuera de la lista blanca pública), **Then** el `middleware.ts` devuelve `401 Unauthorized` con formato JSON estándar.
3. **Given** peticiones a la lista blanca pública (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`, `/api/auth/login`, `/api/health`, `/api/waba/webhook`, `/api/waba/deauthorize`), **When** se reciben en el Edge, **Then** el `middleware.ts` permite el paso sin exigir cookie de sesión.

---

### User Story 3 — Aislamiento Multi-Tenant Estricto sin Headers Suplantables (Priority: P0-Security)
**Como** Sistema  
**Quiero** extraer la organización activa (`organization_id`) y el `userId` EXCLUSIVAMENTE de la sesión autenticada y verificada  
**Para** prohibir que un cliente suplante el tenant enviando el header `X-Organization-ID` (salvo Super Admins en modo impersonación explícita auditada).

**Why this priority**: Evita la filtración de datos entre distintas empresas (ISPs) que comparten la plataforma SaaS (Cumplimiento estricto del Principio I).

**Independent Test**:
- Iniciar sesión con un usuario perteneciente a la Organización "A".
- Ejecutar una consulta `curl -H "X-Organization-ID: <UUID_DE_ORGANIZACION_B>" https://app.toi.com/api/subscribers` incluyendo la cookie válida de "A".
- Verificar que los datos retornados pertenecen **únicamente** a la Organización "A" y que el header suplantado es ignorado.

**Acceptance Scenarios**:
1. **Given** una sesión verificada correspondiente al `organization_id_A`, **When** el cliente incluye en la petición HTTP el header `X-Organization-ID: organization_id_B`, **Then** `getSessionContext()` ignora por completo el header y establece `organization_id = organization_id_A`.
2. **Given** cualquier endpoint o página del sistema, **When** se audita el código fuente, **Then** no existe ningún fallback ni referencia al UUID de la org demo `DEFAULT_ORG_ID` (`00000000-0000-0000-0000-000000000001`).
3. **Given** un recurso perteneciente a la Org "B", **When** un usuario de la Org "A" intenta consultarlo por ID explícito (ej. `/api/subscribers/<subscriber_id_de_B>`), **Then** la consulta retorna `404 Not Found` (o `403 Forbidden` cerrado) garantizando que no existan filtraciones de datos inter-tenant.

---

### User Story 4 — Hashing Robusto de Contraseñas y Comparación en Tiempo Constante (Priority: P0-Security)
**Como** Administrador de ISP  
**Quiero** que mi contraseña se guarde con un algoritmo fuerte de hashing (`scrypt` o `bcrypt` con salt aleatorio por usuario) y que la verificación sea en tiempo constante  
**Para** evitar ataques de fuerza bruta, rainbow tables y ataques de tiempo (timing attacks).

**Why this priority**: Protege el secreto de acceso en reposo y previene la enumeración de usuarios o extracción de hashes en caso de filtración de la base de datos.

**Independent Test**:
- Crear dos usuarios con la misma contraseña en la base de datos.
- Comprobar que los valores en la columna `password_hash` son completamente diferentes debido al salt aleatorio.
- Verificar que intentos de autenticación con contraseña incorrecta se procesan con `crypto.timingSafeEqual`.

**Acceptance Scenarios**:
1. **Given** un nuevo registro de usuario o actualización de contraseña, **When** el sistema procesa la clave, **Then** la almacena en formato `scrypt` (o `bcrypt`) con un salt aleatorio de al menos 16 bytes y parámetros de costo seguros.
2. **Given** un usuario legacy con un hash SHA-256 en la base de datos, **When** inicia sesión exitosamente con su contraseña correcta, **Then** el sistema autentica la cuenta y re-hashea de forma transparente la contraseña al nuevo formato `scrypt`/`bcrypt` en la BD.
3. **Given** una validación de contraseña durante el proceso de login, **When** se compara la contraseña enviada con la guardada, **Then** la verificación utiliza `crypto.timingSafeEqual` para asegurar un tiempo de respuesta constante frente a intentos válidos e inválidos.

---

### User Story 5 — Eliminación de Backdoors y Protección de Rutas Super Admin (Priority: P0-Security)
**Como** Super Admin del SaaS  
**Quiero** que la ruta `/api/auth/seed-superadmin` sea eliminada por completo y que todas las rutas `/api/super-admin/*` estén estrictamente protegidas con validación de rol `super_admin`  
**Para** eliminar vectores de compromiso total del sistema y limitar la gestión de la plataforma al administrador del SaaS.

**Why this priority**: `/api/auth/seed-superadmin` permite la toma de control remota no autenticada de la base de datos. Su eliminación es crítica para la supervivencia del sistema.

**Independent Test**:
- Hacer un `POST /api/auth/seed-superadmin`. Debe responder `404 Not Found`.
- Iniciar sesión como usuario normal (rol `admin` de un ISP) e intentar hacer `GET /api/super-admin/tenants`. Debe retornar `403 Forbidden`.

**Acceptance Scenarios**:
1. **Given** cualquier petición HTTP dirigida a `/api/auth/seed-superadmin`, **When** llega al servidor, **Then** responde `404 Not Found` al haber sido removido el handler por completo.
2. **Given** un usuario autenticado con rol `admin`, `billing` o `technician`, **When** intenta acceder a cualquier endpoint bajo `/api/super-admin/*`, **Then** el sistema retorna `403 Forbidden`.
3. **Given** un usuario autenticado con el rol `super_admin` verificado en la base de datos, **When** accede a `/api/super-admin/*`, **Then** la solicitud es procesada correctamente.
4. **Given** la necesidad de aprovisionar el primer Super Admin en una base de datos limpia, **When** el administrador lo requiere, **Then** se ejecuta un script CLI seguro fuera del servidor web HTTP (vía CLI `pnpm seed:superadmin` o script administrativo).

---

### User Story 6 — Integración de Email Transaccional Real (Priority: P1-Operational)
**Como** Usuario del SaaS  
**Quiero** recibir correos electrónicos transaccionales reales (vía Resend o Nodemailer/SMTP) al solicitar restablecimiento de contraseña o enviar invitaciones de equipo  
**Para** poder recuperar el acceso a mi cuenta y colaborar de forma efectiva con mi equipo de trabajo.

**Why this priority**: Garantiza la operatividad básica de las funciones de gestión de cuentas e invitaciones de usuarios en producción.

**Independent Test**:
- Solicitar recuperación de contraseña en `/forgot-password` con un correo válido.
- Verificar en los logs o proveedor (Resend/SMTP) que se ha enviado un correo real conteniendo el token de recuperación y el enlace seguro.

**Acceptance Scenarios**:
1. **Given** una solicitud de restablecimiento de contraseña en `/api/auth/forgot-password`, **When** `email.service.ts` se invoca, **Then** efectúa una llamada HTTP/SMTP real a la API del proveedor de correo (Resend o Nodemailer) y devuelve la confirmación del proveedor.
2. **Given** una invitación a un nuevo miembro del equipo en `/api/team`, **When** se crea la invitación, **Then** se envía un email transaccional con el enlace de aceptación conteniendo el token firmado.
3. **Given** la ausencia o fallo del proveedor de email en las variables de entorno, **When** se intenta enviar un correo, **Then** el sistema registra el error detallado en los logs del servidor y responde con un mensaje amigable al cliente sin filtrar credenciales ni tumbar la aplicación.

---

## 3. Scope / Alcance

### DENTRO DEL ALCANCE (IN SCOPE):
- **Eliminación inmediata de Backdoors**: Borrado del endpoint `src/app/api/auth/seed-superadmin/route.ts`.
- **Sanitización de Archivos de Configuración**: Limpieza de `.env.example` reemplazando credenciales reales de Cloudflare R2 u otros servicios por marcadores de posición `REEMPLAZA_*`.
- **Refactorización de Hashing de Contraseñas**: Actualización de `auth.service.ts` y `password.ts` para usar `scrypt` (o `bcrypt`) con salt y comparaciones con `crypto.timingSafeEqual`.
- **Capa de Sesión Firmada**: Emisión y validación de cookies `saas_toi_session` con firma HMAC-SHA256 / JWT requiriendo obligatoriamente la variable `SESSION_SECRET`.
- **Middleware Centralizado Next.js**: Implementación de `src/middleware.ts` para la intercepción de rutas `/(dashboard)` y `/api/*`.
- **Resolución Única de Contexto Multi-Tenant**: Refactorización de `getSessionContext()` en `src/lib/auth.ts` para derivar `organization_id` y `userId` únicamente de la sesión validada.
- **Barrido Total de Default Org**: Eliminación completa del literal `DEFAULT_ORG_ID` (`00000000-0000-0000-0000-000000000001`) y fallbacks hardcodeados en ~24 archivos (endpoints API y Server Components).
- **Protección RBAC en Super Admin**: Guard de rol `super_admin` en todas las rutas bajo `/api/super-admin/*` y actualización de `lib/rbac.ts`.
- **Integración de Email Real**: Reemplazo del mock en `email.service.ts` con integración real usando Resend o Nodemailer/SMTP.
- **Protección Estricta de Cron**: Verificación obligatoria de la cabecera/secreto `CRON_SECRET` en endpoints `/api/cron/*`.
- **Depuración y Unificación de Webhooks**: Mantener `/api/waba/webhook` como único punto de entrada unificado y marcar `/api/webhooks/whatsapp` como deprecated/removido.

### FUERA DEL ALCANCE (OUT OF SCOPE):
- Rediseño visual de componentes, elementos gráficos o nuevas pantallas del dashboard.
- Rediseño del motor de eventos o de los módulos de facturación electrónica.

---

## 4. Restricciones de la Constitución

- **Scope Explícito por Tenant**: Toda consulta o escritura en la base de datos DEBE incluir el filtro `eq(table.organizationId, tenantId)` derivado exclusivamente de la sesión autenticada.
- **Manejo Seguro de Secretos y Cifrado**: Prohibida la exposición de claves secretas (`SESSION_SECRET`, tokens R2, API Keys) en logs o respuestas al cliente. Las variables DEBEN ser sanitizadas.
- **Verificación HMAC e Idempotencia en Webhooks**: Todas las solicitudes entrantes de webhooks de terceros (Meta/WABA) DEBEN ser verificadas con su respectiva firma HMAC y procesarse de forma idempotente.

---

## 5. Criterios de Aceptación Observables

1. **Protección No Autenticada**: Peticiones sin cookie `saas_toi_session` válida a `/(dashboard)` o `/api/subscribers` retornan `401 Unauthorized` (en API) o redirigen a `/login` (en páginas).
2. **Rechazo de Alteración de Cookie**: Alterar manualmente el contenido de la cookie de sesión causa la invalidación inmediata de la petición por fallo de firma HMAC.
3. **Imposibilidad de Suplantar Tenant**: Un `curl` enviado con header `X-Organization-ID: <uuid-ajeno>` por un usuario normal es ignorado por el servidor; la consulta retorna únicamente los datos correspondientes al tenant decodificado de su sesión firmada.
4. **Remoción de Seed Público**: Un `POST` a `/api/auth/seed-superadmin` devuelve `404 Not Found`.
5. **Aislamiento de Super Admin**: Los endpoints `/api/super-admin/*` retornan `403 Forbidden` para cualquier usuario que no tenga `role: 'super_admin'` verificado en BD.
6. **Envío Real de Emails**: Al solicitar recuperación de contraseña en `/forgot-password`, `email.service.ts` efectúa la llamada real a la API de correo (Resend/SMTP) y retorna confirmación del proveedor.

---

## 6. Requirements *(mandatory)*

### Functional Requirements

- **FR-001** — **Persistencia de Sesiones**: El sistema DEBE persistir las sesiones activas en la base de datos PostgreSQL (`sessions`). El valor transmitido en la cookie `saas_toi_session` DEBE ser un token de alta entropía firmado criptográficamente con `SESSION_SECRET`.
- **FR-002** — **Resolución Única de Tenant**: `getSessionContext()` DEBE resolver el `organizationId` y `userId` del usuario únicamente desde la sesión descifrada/verificada.
- **FR-003** — **Prohibición de Fallbacks**: Queda estrictamente PROHIBIDA la existencia de fallbacks a organizaciones por defecto (`DEFAULT_ORG_ID`) o lectura de headers del cliente como `X-Organization-ID`.
- **FR-004** — **Edge Guard Middleware**: `middleware.ts` DEBE proteger por defecto todas las rutas bajo `/(dashboard)` y `/api/*`, exceptuando la lista blanca explícita de endpoints públicos (`/login`, `/register`, `/api/auth/login`, `/api/waba/webhook`, etc.).
- **FR-005** — **Hashing de Passwords con Salt**: Las contraseñas DEBEN ser procesadas con `scrypt` (o `bcrypt`) incluyendo salt por usuario. Se DEBE soportar la migración transparente de hashes antiguos SHA-256 en el momento del login.
- **FR-006** — **Eliminación de Endpoint Inseguro**: El archivo `src/app/api/auth/seed-superadmin/route.ts` DEBE ser eliminado.
- **FR-007** — **RBAC en Rutas Super Admin**: Los handlers de `/api/super-admin/*` DEBEN verificar que el usuario autenticado posee `role === 'super_admin'`.
- **FR-008** — **Integración Email Real**: `email.service.ts` DEBE enviar correos transaccionales reales usando Resend o Nodemailer (SMTP).
- **FR-009** — **Autenticación en Cron**: Las peticiones a `/api/cron/*` DEBEN ser validadas contra la cabecera `Authorization: Bearer <CRON_SECRET>` o header `x-cron-secret`.
- **FR-010** — **Sanitización de Secretos**: El archivo `.env.example` DEBE ser despojado de cualquier credencial real y contener solo placeholders tipo `REEMPLAZA_*`.

---

## 7. Key Entities

- **Session** (`sessions` table):
  - `id`: UUID (Primary Key)
  - `tokenHash`: String (SHA-256 hash del token entregado al cliente)
  - `userId`: UUID (Foreign Key → `users.id`)
  - `organizationId`: UUID (Foreign Key → `organizations.id`)
  - `expiresAt`: Timestamp
  - `createdAt`, `lastUsedAt`: Timestamp

- **User** (`users` table):
  - `passwordHash`: String (Formato `scrypt$N$r$p$<salt_b64>$<hash_b64>`)
  - `role`: Enum (`admin`, `billing`, `technician`, `super_admin`)

---

## 8. Measurable Success Criteria

- **SC-001**: 0 endpoints en `src/app/api/` (fuera de la lista blanca) permiten acceso sin sesión válida.
- **SC-002**: 0 ocurrencias de `DEFAULT_ORG_ID` o `00000000-0000-0000-0000-000000000001` en el código fuente.
- **SC-003**: 100% de los intentos de suplantación mediante el header `X-Organization-ID` resultan infructuosos.
- **SC-004**: `POST /api/auth/seed-superadmin` responde `404 Not Found` en el 100% de los casos.
- **SC-005**: El gate de testing completo (`pnpm build` y `pnpm test`) pasa exitosamente.
