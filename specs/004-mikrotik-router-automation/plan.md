# Implementation Plan: 004-mikrotik-router-automation

**Feature**: Integración con Routers/MikroTik (API / Webhooks) para Corte y Reconexión Automática

**Spec**: [specs/004-mikrotik-router-automation/spec.md](specs/004-mikrotik-router-automation/spec.md)

---

## Technical Architecture

### 1. Database Schemas

- **`router_configs` (`src/db/schema/router-configs.ts`)**:
  - `id` (uuid, primaryKey)
  - `organizationId` (uuid, FK -> organizations, NOT NULL, INDEX)
  - `name` (text, NOT NULL) — Ej: "MikroTik CCR2004 Core"
  - `host` (text, NOT NULL) — Dirección IP o Host domain
  - `apiPort` (integer, DEFAULT 443)
  - `username` (text, NOT NULL)
  - `encryptedPassword` (text, NOT NULL) — AES-256-GCM
  - `iv` (text, NOT NULL)
  - `authTag` (text, NOT NULL)
  - `isActive` (boolean, DEFAULT true)

- **`router_audit_logs` (`src/db/schema/router-audit-logs.ts`)**:
  - `id` (uuid, primaryKey)
  - `organizationId` (uuid, FK -> organizations, NOT NULL, INDEX)
  - `routerId` (uuid, FK -> router_configs)
  - `subscriberId` (uuid, FK -> subscribers, nullable)
  - `action` ('test_connection' | 'suspend' | 'reactivate')
  - `command` (text, NOT NULL)
  - `responseStatus` (integer, NOT NULL)
  - `responseBody` (text, nullable)
  - `createdAt` (timestamp, DEFAULT NOW())

---

### 2. Services Layer

- **`MikroTikClient` (`src/lib/mikrotik/client.ts`)**:
  - `testConnection(host, port, user, pass)`: Ejecuta ping/status REST.
  - `disableSubscriberService(host, port, user, pass, subscriberIdentifier)`: Deshabilita usuario/IP.
  - `enableSubscriberService(host, port, user, pass, subscriberIdentifier)`: Rehabilita servicio.

- **`RouterService` (`src/services/router.service.ts`)**:
  - `list(organizationId)`: Lista routers configurados descifrando la presencia sin exponer contraseñas.
  - `create(organizationId, input)`: Cifra la contraseña con AES-256-GCM y guarda en BD.
  - `testConnection(organizationId, routerId)`: Obtiene credenciales, descifra y ejecuta `MikroTikClient.testConnection`.
  - `executeCut(organizationId, subscriberId)`: Deshabilita servicio en router y guarda audit log.
  - `executeReconnection(organizationId, subscriberId)`: Rehabilita servicio en router, guarda audit log y envía aviso WhatsApp.

---

### 3. API Routes

- `GET/POST /api/routers` — CRUD de configuraciones de routers MikroTik
- `POST /api/routers/[id]/test` — Prueba de conectividad REST
- `GET /api/routers/audit-logs` — Historial de comandos de red ejecutados

---

### 4. UI Components & Pages

- **Página `/settings/routers`** (`src/app/(dashboard)/settings/routers/page.tsx`):
  - Formulario de registro de router (Host, puerto REST, credenciales).
  - Tabla de routers con botón "Probar Conexión" y badges de estado.
  - Tabla de logs de auditoría de comandos enviadas al MikroTik.

---

## Verification Plan

### Automated Tests
1. `tests/unit/lib/mikrotik-client.test.ts`: Formateo de comandos MikroTik REST API.
2. `tests/unit/services/router.service.test.ts`: Cifrado/descifrado de credenciales y audit logging.
3. `tests/integration/api/routers.test.ts`: Endpoints `/api/routers` y pruebas de aislamiento por tenant.
