# Implementation Plan: 002-plans-and-whatsapp-inbox

**Feature**: Gestión de Planes de Internet, Ciclos de Cobro y CRM/Inbox Multi-Agente de WhatsApp

**Spec**: [specs/002-plans-and-whatsapp-inbox/spec.md](specs/002-plans-and-whatsapp-inbox/spec.md)

---

## Technical Architecture

### 1. Database & Domain Models

- **Service Plans (`src/db/schema/service-plans.ts`)**:
  - `id` (uuid, primaryKey)
  - `organizationId` (uuid, FK -> organizations)
  - `name` (text) — Nombre comercial (e.g. "Fibra 100 Mbps")
  - `price` (numeric(10,2)) — Tarifa mensual
  - `speedDown` (text) — Ancho de banda bajada (e.g. "100 Mbps")
  - `speedUp` (text) — Ancho de banda subida (e.g. "50 Mbps")
  - `isActive` (boolean, default true)

- **Subscribers (`src/db/schema/subscribers.ts`)**:
  - `servicePlanId` (uuid, FK -> service_plans) — Relación a plan contratado.

- **Message Logs / Chat Inbox (`src/db/schema/message-logs.ts`)**:
  - `organizationId` (uuid, FK -> organizations)
  - `subscriberId` (uuid, FK -> subscribers, nullable)
  - `wamid` (text)
  - `direction` ('inbound' | 'outbound')
  - `messageType` ('text' | 'image' | 'document' | 'template')
  - `contentPreview` (text)
  - `deliveryStatus` ('sent' | 'delivered' | 'read' | 'failed')

---

### 2. Services Layer

- **`ServicePlanService` (`src/services/service-plan.service.ts`)**:
  - `list(organizationId)`: Obtiene lista de planes de internet activos por tenant.
  - `create(organizationId, input)`: Crea un nuevo plan.
  - `update(organizationId, id, input)`: Edita un plan existente.
  - `toggleStatus(organizationId, id, isActive)`: Activa/desactiva comercialmente un plan.

- **`ChatInboxService` (`src/services/chat-inbox.service.ts`)**:
  - `listConversations(organizationId)`: Agrupa mensajes por teléfono/abonado, calcula no leídos y devuelve la lista de chats activos.
  - `getConversationMessages(organizationId, phone)`: Carga el historial ordenado cronológicamente.
  - `sendAgentMessage(organizationId, toPhone, text)`: Utiliza `WhatsAppClient.sendTextMessage` rescantando el token cifrado de `WabaService.getDecryptedTokenInternal()`, e inserta el registro saliente en `message_logs`.

---

### 3. API Routes

- `GET/POST /api/plans` — CRUD de planes de internet
- `GET/PATCH /api/plans/[id]` — Detalle y actualización de planes
- `GET /api/chat/conversations` — Lista de hilos de chat del Inbox
- `GET /api/chat/conversations/[phone]/messages` — Historial de mensajes de un chat
- `POST /api/chat/send` — Envío de mensaje saliente por el agente

---

### 4. UI Components & Pages

- **Configuración de Planes**: `/settings/plans`
  - Formulario de creación/edición de plan.
  - Tabla de planes con switches de activado/desactivado y estadísticas de velocidad.
- **Inbox Multi-Agente de WhatsApp**: `/chat` (o `/messages`)
  - Columna Izquierda: Lista de chats con buscador, avatares, previews y contador no leídos.
  - Área Central: Ventana de conversación estilo chat moderno (burbujas de mensajes entrantes/salientes, timestamps, estados de lectura `delivered`/`read`, input de mensaje con botón enviar).
  - Columna Derecha: **Ficha del Abonado (Context Sidebar)**:
    - Nombre, teléfono WhatsApp, email.
    - **Plan de Internet Contratado**: Nombre del plan, bajada/subida en Mbps, valor mensual.
    - **Estado de Cobranza**: Badge de estado (`Al día`, `Por vencer`, `Vencido`), fecha de pago.
    - **Dirección física**.
    - Botón para ver comprobantes de pago adjuntos en S3.

---

## Verification Plan

### Automated Tests
1. `tests/unit/services/service-plan.service.test.ts`: CRUD de planes aislado por tenant.
2. `tests/unit/services/chat-inbox.service.test.test.ts`: Agrupación de hilos de conversación y formateo.
3. `tests/integration/api/plans.test.ts`: Endpoint `/api/plans` y aserciones de aislamiento.
4. `tests/integration/api/chat.test.ts`: Simulación de envío y recepción de chat.

### Verification in Production
- Verificación del formulario `/settings/plans` creando un plan "Fibra 200 Mbps".
- Verificación de la vista `/chat` conversando en vivo y visualizando la ficha del abonado en la columna derecha.
