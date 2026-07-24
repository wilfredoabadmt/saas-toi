# Feature Specification: 004-mikrotik-router-automation

**Feature**: Integración con Routers/MikroTik (API / Webhooks) para Corte y Reconexión Automática

**Scope**:
- **IN SCOPE**:
  - Registro y gestión de Routers/MikroTik por tenant (`/settings/routers`) especificando IP/Host, Puerto API/REST, Usuario y Contraseña/API Token.
  - Cifrado en reposo utilizando AES-256-GCM para todas las credenciales de routers registradas.
  - Botón de "Probar Conexión" para validar la disponibilidad del router MikroTik desde el panel.
  - Desconexión / Suspensión automática: Al cambiar el estado de un abonado a `suspended` (o por mora tras días de gracia), se deshabilita su usuario PPPoE / IP Binding en el MikroTik.
  - Reconexión / Activación automática: Al aprobar un comprobante de pago en el sistema, se rehabilita de inmediato el servicio en el MikroTik.
  - Registro de auditoría de red (`router_audit_logs`) con timestamp, abonado, acción (`suspend` / `reactivate`), payload enviado y código de respuesta HTTP/API.
- **OUT OF SCOPE**:
  - Modificación avanzada de reglas de Firewall Mangle / Queues complejas.

---

## User Stories

### US1 — Configuración y Prueba de Conexión con MikroTik por Tenant (Priority: P1)
**Como** Administrador de ISP  
**Quiero** registrar y probar las credenciales de acceso API/REST de mi Router MikroTik en `/settings/routers`  
**Para** vincular la infraestructura de red de mi ISP a la plataforma SaaS con cifrado seguro de contraseñas.

#### Criterios de Aceptación:
- El Administrador puede ingresar: Nombre del Router, Dirección IP/Host, Puerto REST (default 443/80), Usuario API y Contraseña/Token.
- Las credenciales se cifran en reposo con AES-256-GCM antes de guardarse en la base de datos con `organization_id` obligatorio.
- El panel ofrece un botón "Probar Conexión" que realiza una petición de comprobación (`GET /rest/system/resource` o equivalente) y muestra un badge de conexión "Exitosa" o "Fallida".

---

### US2 — Suspensión Automática de Servicio por Falta de Pago (Priority: P1)
**Como** Sistema de Cobranza  
**Quiero** ejecutar la deshabilitación del usuario PPPoE / IP Binding en el MikroTik cuando la cuenta pase a estado "Suspendido"  
**Para** cortar el tráfico de internet a los abonados morosos de forma automatizada.

#### Criterios de Aceptación:
- Al cambiar el estado del abonado a `suspended` (manualmente o mediante tarea programada de vencimiento), el sistema ubica el router asignado al tenant.
- El sistema envía el comando REST/API al MikroTik (`PATCH /rest/ppp/secret/{id}` -> `disabled: true` o `remove lease`).
- Se genera un registro en `router_audit_logs` con `action: 'suspend'`, el comando exacto ejecutado y el código de respuesta del router (ej: `200 OK`).

---

### US3 — Reconexión Inmediata al Aprobar Pago (Priority: P1)
**Como** Sistema de Cobranza  
**Quiero** reactivar de inmediato la cuenta del abonado en el MikroTik al aprobar su pago  
**Para** restituir su servicio de internet sin intervención manual del soporte.

#### Criterios de Aceptación:
- Al presionar "Aprobar Pago" en el módulo de comprobantes, el sistema gatilla automáticamente el evento de reconexión.
- Se envía el comando de habilitación al MikroTik (`PATCH /rest/ppp/secret/{id}` -> `disabled: false`).
- El estado del abonado cambia a `active` y se registra en `router_audit_logs` la reconexión exitosa.
- Se envía una notificación por WhatsApp al abonado informando: *"Tu pago ha sido verificado y tu servicio de internet ha sido reconectado exitosamente."*

---

## Constitution Compliance Audit

| Principio Constitucional | Mecanismo de Cumplimiento en Feature 004 |
|---|---|
| **I. Multi-Tenancy Absoluto** | `organization_id` obligatorio en `router_configs` y `router_audit_logs`. Los routers y comandos están estrictamente aislados por ISP. |
| **II. Seguridad de Credenciales** | Las contraseñas/tokens de acceso MikroTik se cifran con AES-256-GCM mediante `encryptSecret()` y nunca se devuelven en texto plano en la API. |
| **III. Idempotencia & Auditoría** | Todos los comandos de red se registran en `router_audit_logs` con un ID de ejecución único para evitar ejecuciones redundantes. |
| **IV. Cumplimiento WhatsApp** | La reconexión gatilla el aviso por WhatsApp usando `WabaService.getDecryptedTokenInternal()`. |
| **V. Calidad Verificable** | Cobertura de tests unitarios e integrales para `RouterService`, `RouterClient` y endpoints `/api/routers`. |
| **VI. Verificación en Vivo** | Prueba de conectividad simulada/real y logs de auditoría verificados en el servidor. |

---

## Data Model Extensions

### Entity: `router_configs`
- `id` (UUID, Primary Key)
- `organization_id` (UUID, FK -> `organizations.id`, NOT NULL, INDEX)
- `name` (TEXT, NOT NULL) — Ej: "Router Core Principal CCR2004"
- `host` (TEXT, NOT NULL) — Ej: "192.168.88.1" o dominio FQDN
- `apiPort` (INTEGER, DEFAULT 443)
- `username` (TEXT, NOT NULL)
- `encryptedPassword` (TEXT, NOT NULL) — Cifrado AES-256-GCM
- `iv` (TEXT, NOT NULL)
- `authTag` (TEXT, NOT NULL)
- `isActive` (BOOLEAN, DEFAULT true)
- `createdAt` (TIMESTAMP, DEFAULT NOW())
- `updatedAt` (TIMESTAMP, DEFAULT NOW())

### Entity: `router_audit_logs`
- `id` (UUID, Primary Key)
- `organization_id` (UUID, FK -> `organizations.id`, NOT NULL, INDEX)
- `routerId` (UUID, FK -> `router_configs.id`, NOT NULL)
- `subscriberId` (UUID, FK -> `subscribers.id`, Nullable)
- `action` (ENUM: 'test_connection', 'suspend', 'reactivate')
- `command` (TEXT, NOT NULL) — Ej: "PATCH /rest/ppp/secret/val_rojas disabled=true"
- `responseStatus` (INTEGER, NOT NULL) — Ej: 200
- `responseBody` (TEXT, Nullable)
- `createdAt` (TIMESTAMP, DEFAULT NOW())

---

## API Contracts

### 1. `GET /api/routers`
- **Descripción**: Lista los routers configurados del tenant (omitiendo la contraseña cifrada).

### 2. `POST /api/routers`
- **Descripción**: Registra una nueva configuración de router cifrando credenciales.

### 3. `POST /api/routers/[id]/test`
- **Descripción**: Realiza una prueba de conectividad REST con el router MikroTik.

### 4. `POST /api/routers/audit-logs`
- **Descripción**: Consulta el historial de comandos ejecutados en la red.
