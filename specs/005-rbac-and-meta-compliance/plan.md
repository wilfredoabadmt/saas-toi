# Implementation Plan: 005-rbac-and-meta-compliance

**Feature**: Gestión de Roles y Permisos (RBAC), Registro de Auditoría y Páginas Públicas para Meta App Review

**Spec**: [specs/005-rbac-and-meta-compliance/spec.md](specs/005-rbac-and-meta-compliance/spec.md)

---

## Technical Architecture

### 1. Database Schema (`users` & Role Types)

- **`users` (`src/db/schema/users.ts`)**:
  - `id` (uuid, primaryKey)
  - `organizationId` (uuid, FK -> organizations, NOT NULL, INDEX)
  - `email` (text, NOT NULL, UNIQUE)
  - `name` (text, NOT NULL)
  - `role` ('admin' | 'billing' | 'technician', DEFAULT 'billing')
  - `isActive` (boolean, DEFAULT true)
  - `createdAt` (timestamp, DEFAULT NOW())

---

### 2. Services Layer & RBAC Core

- **`RBAC` (`src/lib/rbac.ts`)**:
  - `hasPermission(role, route)`: Verifica matriz de accesos.
  - `assertRolePermission(role, route)`: Lanza `ApiError(403)` si no tiene acceso.

- **`TeamService` (`src/services/team.service.ts`)**:
  - `listMembers(organizationId)`: Lista integrantes del equipo.
  - `inviteMember(organizationId, email, name, role)`: Crea usuario con rol especificado.
  - `updateRole(organizationId, userId, newRole)`: Cambia el rol de un miembro.
  - `toggleStatus(organizationId, userId, isActive)`: Activa/desactiva acceso.

---

### 3. Public Legal Pages & API Routes

- **Public Routes (Sin Login)**:
  - `GET /privacy` — Página pública de Política de Privacidad de Datos y WhatsApp.
  - `GET /terms` — Página pública de Términos de Servicio del SaaS.
  - `GET /data-deletion` — Instrucciones de eliminación de datos de Meta Graph API.
  - `POST /api/data-deletion` — Callback / Endpoint de confirmación de borrado de datos.

- **Protected API Routes**:
  - `GET/POST /api/team` — Gestión de usuarios del equipo por tenant.
  - `PATCH /api/team/[id]` — Edición de rol y estado.

---

### 4. UI Components & Role-Based Layout

- **Página `/settings/team`** (`src/app/(dashboard)/settings/team/page.tsx`):
  - Formulario/modal de invitación de nuevo miembro (Email, Nombre, Rol).
  - Tabla de integrantes con badges de rol y select para modificar permisos.

- **Layout Adaptativo (`src/app/(dashboard)/layout.tsx`)**:
  - Ocultamiento de ítems del menú lateral según el rol del usuario autenticado.

---

## Verification Plan

### Automated Tests
1. `tests/unit/lib/rbac.test.ts`: Pruebas de matriz de permisos por rol (`admin`, `billing`, `technician`).
2. `tests/unit/services/team.service.test.ts`: Invitación y asignación de rol en equipo.
3. `tests/integration/api/public-pages.test.ts`: Verificación de respuesta 200 OK sin auth en `/privacy`, `/terms`, `/data-deletion`.

### Verification in Production
- Navegar sin inicio de sesión a `/privacy`, `/terms`, `/data-deletion`.
- Verificar restricciones de navegación y permisos en `/settings/team`.
