# Feature Specification: 005-rbac-and-meta-compliance

**Feature**: Gestión de Roles y Permisos (RBAC), Registro de Auditoría y Páginas Públicas para Meta App Review

**Scope**:
- **IN SCOPE**:
  - Control de Acceso Basado en Roles (RBAC) para el panel SaaS multi-tenant con tres roles principales:
    - `admin`: Acceso completo a la plataforma, configuración de WABA, routers y equipo.
    - `billing` (Cobranzas/Cajero): Acceso a Abonados (`/subscribers`), Importación CSV, Cobranza, Recordatorios (`/messaging`) e Inbox Multi-Agente (`/chat`). Bloqueado de `/settings/*` y `/whatsapp`.
    - `technician` (Técnico de Campo): Acceso exclusivo a Tickets & Averías (`/tickets`). Bloqueado de finanzas, abonados y configuración del sistema.
  - Panel de gestión de equipo del ISP en `/settings/team` para invitar usuarios, asignar roles y revocar accesos.
  - Middleware de protección de rutas y comprobación de permisos a nivel de API.
  - Renderizado de Páginas Públicas Institucionales requeridas para Meta App Review (Meta WhatsApp Cloud API):
    - **`/privacy`**: Política de Privacidad multi-tenant con aclaración sobre manejo de datos de WhatsApp.
    - **`/terms`**: Términos de Servicio y Condiciones del SaaS ISP.
    - **`/data-deletion`**: Instrucciones claras paso a paso para la eliminación de datos del usuario según normas de Facebook/Meta Graph API.
- **OUT OF SCOPE**:
  - Personalización de colores o dominio propio por tenant en las páginas públicas.

---

## User Stories

### US1 — Gestión de Equipo e Invitación con Asignación de Rol (`/settings/team`) (Priority: P1)
**Como** Administrador de ISP  
**Quiero** invitar a miembros de mi equipo y asignarles un rol específico (`admin`, `billing`, `technician`)  
**Para** delegar tareas operativas manteniendo el control de acceso y la seguridad de la información.

#### Criterios de Aceptación:
- El Administrador puede ingresar el Nombre, Email y Rol del nuevo integrante en `/settings/team`.
- Los miembros del equipo se almacenan con `organization_id` obligatorio y aislado por tenant en la tabla `users`.
- El Administrador puede cambiar el rol de un usuario existente o desactivar su acceso en cualquier momento.

---

### US2 — Enforzamiento de Permisos por Rol (RBAC Middleware & API Guards) (Priority: P1)
**Como** Operador del Equipo (Cobranzas o Técnico)  
**Quiero** tener una interfaz adaptada con accesos restringidos según mi rol  
**Para** concentrarme en mis tareas sin modificar parámetros sensibles de la infraestructura.

#### Criterios de Aceptación:
- **Técnico (`technician`)**:
  - Al ingresar o intentar navegar a `/settings/routers`, `/settings/waba` o `/whatsapp`, es bloqueado y redirigido a `/tickets` con una alerta 403 de acceso no autorizado.
  - Los ítems del menú lateral no disponibles para su rol son ocultados automáticamente.
- **Cobranzas (`billing`)**:
  - Puede gestionar abonados, pagos, comprobantes e Inbox de chat, pero no tiene acceso a `/settings/*` ni `/whatsapp`.
- **Admin (`admin`)**:
  - Acceso irrestricto a todas las funcionalidades.

---

### US3 — Páginas Públicas para Meta App Review (`/privacy`, `/terms`, `/data-deletion`) (Priority: P1)
**Como** Dueño del SaaS / Desarrollador  
**Quiero** contar con páginas públicas accesibles sin autenticación  
**Para** superar con éxito el proceso de revisión de aplicaciones (App Review) de Meta WhatsApp Cloud API.

#### Criterios de Aceptación:
- `/privacy` expone la política de tratamiento de datos personales, uso de números de WhatsApp y cifrado AES-256.
- `/terms` expone las condiciones de uso de la plataforma multi-tenant SaaS TOI ISP.
- `/data-deletion` expone la guía paso a paso y el correo/mecanismo de solicitud para solicitar el borrado permanente de datos de la WABA de acuerdo con los lineamientos de Meta Developer Policies.
- Todas estas rutas públicas responden 200 OK sin requerir sesión iniciada ni cookies de autenticación.

---

## Constitution Compliance Audit

| Principio Constitucional | Mecanismo de Cumplimiento en Feature 005 |
|---|---|
| **I. Multi-Tenancy Absoluto** | `organization_id` en la tabla `users` y verificaciones de sesión. Ningún usuario puede ver miembros de otro tenant. |
| **II. Cumplimiento Meta & Privacidad** | Cumplimiento estricto de las directivas de Facebook Developer Policies mediante las rutas de ley `/privacy`, `/terms` y `/data-deletion`. |
| **III. Control de Acceso RBAC** | Enforzamiento centralizado en `src/lib/rbac.ts` y middleware Next.js. |
| **IV. Calidad Verificable** | Pruebas unitarias de RBAC y pruebas de integración para rutas públicas y protegidas. |

---

## Data Model Extensions

### Entity: `users` (Extensión / Confirmación)
- `id` (UUID, Primary Key)
- `organization_id` (UUID, FK -> `organizations.id`, NOT NULL, INDEX)
- `email` (TEXT, UNIQUE, NOT NULL)
- `name` (TEXT, NOT NULL)
- `role` (ENUM: 'admin', 'billing', 'technician', DEFAULT 'billing')
- `isActive` (BOOLEAN, DEFAULT true)
- `createdAt` (TIMESTAMP, DEFAULT NOW())
- `updatedAt` (TIMESTAMP, DEFAULT NOW())

---

## API Contracts & Route Matrix

### Matriz de Accesos por Rol (RBAC)

| Ruta de UI / API | Admin | Cobranzas (`billing`) | Técnico (`technician`) | Público |
|---|:---:|:---:|:---:|:---:|
| `/privacy`, `/terms`, `/data-deletion` | ✅ | ✅ | ✅ | ✅ |
| `/subscribers`, `/subscribers/import` | ✅ | ✅ | ❌ | ❌ |
| `/messaging`, `/chat` | ✅ | ✅ | ❌ | ❌ |
| `/tickets` | ✅ | ❌ | ✅ | ❌ |
| `/settings/plans` | ✅ | ❌ | ❌ | ❌ |
| `/settings/routers` | ✅ | ❌ | ❌ | ❌ |
| `/settings/team` | ✅ | ❌ | ❌ | ❌ |
| `/whatsapp` | ✅ | ❌ | ❌ | ❌ |

---

### Endpoints de API

### 1. `GET /api/team`
- **Descripción**: Lista los miembros del equipo del tenant con su rol.

### 2. `POST /api/team/invite`
- **Descripción**: Registra o invita a un nuevo usuario asignándole un rol (`admin`, `billing`, `technician`).

### 3. `PATCH /api/team/[id]`
- **Descripción**: Actualiza el rol o estado activo de un integrante del equipo.
