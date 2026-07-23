# Feature Specification: 002-plans-and-whatsapp-inbox

**Feature**: Gestión de Planes de Internet, Ciclos de Cobro y CRM/Inbox Multi-Agente de WhatsApp

**Scope**:
- **IN SCOPE**:
  - CRUD de Planes de Internet por Tenant (`/settings/plans`).
  - Asignación de Plan de Internet a Abonados (`service_plan_id`).
  - CRM / Inbox Multi-Agente de Chats de WhatsApp (`/messages` o `/chat`).
  - Panel lateral en la vista de chat con la ficha completa del abonado (Plan, velocidad Mbps, estado de cobranza, dirección, WhatsApp).
  - Recepción de mensajes en vivo por Webhook y envío de respuestas salientes vía Meta Cloud API.
- **OUT OF SCOPE**:
  - Integración o corte automático en Routers MikroTik / OLT (reservado para P4).
  - Bot de IA / respuestas generativas automáticas (reservado para P4).

---

## User Stories

### US1 — CRUD de Planes de Internet por Tenant (Priority: P1)
**Como** Administrador de ISP  
**Quiero** crear, listar, editar y desactivar Planes de Internet (nombre, velocidad de bajada/subida en Mbps, precio mensual)  
**Para** asociarlos a mis abonados y estructurar la oferta comercial de mi ISP con facturación recurrente clara.

#### Criterios de Aceptación:
- El Administrador puede crear un plan especificando: Nombre, Precio Mensual, Velocidad Bajada (Mbps), Velocidad Subida (Mbps) y Estado (Activo/Inactivo).
- El plan se almacena con `organization_id` obligatorio y aislado por tenant.
- Se puede editar cualquier plan existente y cambiar su disponibilidad.
- En la lista de abonados y en el formulario de abonado, el plan de internet se selecciona de un dropdown dinámico con los planes activos del tenant.

---

### US2 — CRM / Inbox Multi-Agente de WhatsApp (Priority: P1)
**Como** Agente de Soporte o Cobranzas  
**Quiero** una vista de Inbox unificada (`/messages` o `/chat`) con la lista de conversaciones activas por teléfono de abonado  
**Para** leer mensajes entrantes en tiempo real y responder directamente desde la web usando la API oficial de WhatsApp Cloud API.

#### Criterios de Aceptación:
- El Inbox lista las conversaciones ordenadas por fecha/hora del último mensaje recibido o enviado.
- Cada conversación muestra el nombre del abonado (o número formateado E.164 si no está registrado), avatar con iniciales, badge de mensajes no leídos y preview del último mensaje.
- Al seleccionar un chat, la ventana principal carga el historial cronológico de mensajes (textos, imágenes, documentos) con indicación visual de mensajes entrantes (izquierda) y salientes (derecha).
- El agente puede escribir un mensaje de texto y presionar "Enviar", enviándolo vía Meta Cloud API (POST `/{phone_number_id}/messages`) y registrándolo en `message_logs`.
- Los mensajes entrantes recibidos por el Webhook `/api/webhooks/whatsapp` se asocian a la conversación y actualizan el Inbox de inmediato.

---

### US3 — Panel Lateral de Ficha de Abonado en Chat (Priority: P1)
**Como** Agente de Soporte/Cobranzas en una conversación activa  
**Quiero** ver un panel lateral a la derecha de la pantalla de chat con la información completa del abonado  
**Para** consultar su plan contratado, velocidad, estado de cobranza y dirección sin tener que salir del chat.

#### Criterios de Aceptación:
- El panel lateral derecho muestra:
  - **Identificación**: Nombre del abonado, Teléfono WhatsApp, Email.
  - **Plan Contratado**: Nombre del plan de internet, Velocidad (Mbps bajada/subida), Precio mensual.
  - **Estado de Cobranza**: Badge de estado (`Al día`, `Por vencer`, `Vencido`), Fecha de vencimiento, Monto pendiente.
  - **Dirección & Ubicación**: Dirección física del abonado.
  - **Historial de Comprobantes**: Lista rápida de los últimos comprobantes S3 adjuntos con enlace para visualizar.
- Si el número que escribe no está registrado como abonado, el panel lateral muestra un botón "Convertir en Abonado" para registrarlo directamente.

---

## Constitution Compliance Audit

| Principio Constitucional | Mecanismo de Cumplimiento en Feature 002 |
|---|---|
| **I. Multi-Tenancy Absoluto** | `organization_id` obligatorio en `service_plans`, `message_logs`, `subscribers`. Consultas a planes y chats filtradas estrictamente por tenant. |
| **II. Seguridad de Credenciales** | La API de envío en el Inbox rescata el token System User cifrado AES-256-GCM usando `WabaService.getDecryptedTokenInternal()`. Nunca se devuelve el token al cliente. |
| **III. Idempotencia en Webhooks** | Todo mensaje entrante en el Inbox pasa por `verifyMetaWebhookSignature` y deduplicación por `wamid` en `processed_webhook_events`. |
| **IV. Cumplimiento WhatsApp** | Las respuestas de los agentes dentro de la ventana de 24h usan mensajes de texto de sesión (`type: text`). Fuera de ventana de 24h, el sistema indica que requiere plantilla Utility. |
| **V. Calidad Verificable** | Cobertura de tests unitarios e integrales para `ServicePlanService`, `ChatInboxService` y endpoints de API. |
| **VI. Verificación en Vivo** | Prueba de chat en vivo y creación de planes ejecutados con verificación de interfaz. |
| **VII. Almacenamiento S3** | Visualización de comprobantes recibidos en el panel lateral del chat utilizando presigned URLs con TTL de 15 minutos. |
| **VIII. Foco Vertical ISP** | Los planes registran velocidades de bajada/subida en Mbps; la ficha muestra la dirección del cliente y el plan de conectividad. |

---

## Data Model Extensions

### Entity: `service_plans` (Extensión / Confirmación)
- `id` (UUID, Primary Key)
- `organization_id` (UUID, FK -> `organizations.id`, INDEX, NOT NULL)
- `name` (TEXT, NOT NULL) — Ej: "Fibra 100 Mbps Hogar"
- `price` (NUMERIC(10,2), NOT NULL) — Ej: 25000.00
- `speed_down` (TEXT, NOT NULL) — Ej: "100 Mbps"
- `speed_up` (TEXT, NOT NULL) — Ej: "50 Mbps"
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMP, DEFAULT NOW())
- `updated_at` (TIMESTAMP, DEFAULT NOW())

### Entity: `subscribers` (Relación)
- `service_plan_id` (UUID, FK -> `service_plans.id`, Nullable)

---

## API Contracts

### 1. `GET /api/plans`
- **Descripción**: Lista todos los planes de internet del tenant.
- **Respuesta 200**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "Fibra 100 Mbps",
        "price": "25000.00",
        "speedDown": "100 Mbps",
        "speedUp": "50 Mbps",
        "isActive": true
      }
    ]
  }
  ```

### 2. `POST /api/plans`
- **Descripción**: Crea un nuevo plan de internet para el ISP.
- **Body**:
  ```json
  {
    "name": "Fibra 300 Mbps Gamer",
    "price": "35000.00",
    "speedDown": "300 Mbps",
    "speedUp": "150 Mbps"
  }
  ```

### 3. `GET /api/chat/conversations`
- **Descripción**: Lista los hilos de conversación de WhatsApp del tenant con el último mensaje y datos del abonado.
- **Respuesta 200**:
  ```json
  {
    "data": [
      {
        "subscriberId": "uuid",
        "name": "Carlos Mendoza",
        "phone": "+56912345678",
        "unreadCount": 1,
        "lastMessage": "Hola, envié mi comprobante",
        "lastMessageAt": "2026-07-23T19:30:00Z"
      }
    ]
  }
  ```

### 4. `GET /api/chat/conversations/[phone]/messages`
- **Descripción**: Carga el historial de mensajes recibidos y enviados con un teléfono.

### 5. `POST /api/chat/send`
- **Descripción**: Envía un mensaje de texto desde la interfaz de Inbox al abonado vía Meta WhatsApp Cloud API.
- **Body**:
  ```json
  {
    "toPhone": "+56912345678",
    "message": "Hola Carlos, recibimos tu pago correctamente. Muchas gracias."
  }
  ```
