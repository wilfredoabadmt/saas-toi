# Feature Specification: 003-support-tickets-and-field-tech

**Feature**: Módulo de Tickets de Soporte Técnico, Registro de Averías y Asignación a Técnicos

**Scope**:
- **IN SCOPE**:
  - Definición del modelo de datos de tickets de soporte (`tickets`) con aislamiento estricto por `organization_id`.
  - Ingesta e interacción en tiempo real vía WhatsApp para creación automática de tickets ("Sin servicio", "Lentitud", "Cambio de clave").
  - Panel web de gestión de tickets (`/tickets`) con filtros por estado (`open`, `in_progress`, `resolved`, `closed`), prioridad (`low`, `medium`, `high`, `critical`) y técnico asignado.
  - Asignación de campo a técnicos con notas operativas y ubicación/dirección del abonado.
  - Notificaciones automáticas por WhatsApp al abonado ante cambios de estado o resolución del ticket.
- **OUT OF SCOPE**:
  - Geolocalización GPS en tiempo real del técnico en mapa interactivo (reservado para app móvil nativa).

---

## User Stories

### US1 — Reporte Interactivo de Averías por WhatsApp (Priority: P1)
**Como** Abonado del ISP  
**Quiero** reportar una falla o avería técnica directamente desde WhatsApp  
**Para** recibir inmediatamente un número de ticket de atención sin tener que llamar por teléfono.

#### Criterios de Aceptación:
- Al escribir palabras clave como "Soporte", "Falla" o "Avería" en WhatsApp, el sistema presenta las opciones de avería (1. Sin servicio, 2. Lentitud, 3. Cambio de clave).
- Al seleccionar el tipo de falla, se crea automáticamente un registro en la tabla `tickets` asociado al abonado y tenant.
- El sistema responde por WhatsApp con el número de ticket generado (ej: `TCK-1082`) y tiempo estimado de atención.
- El Webhook procesa el mensaje de manera idempotente usando `verifyMetaWebhookSignature` y deduplicación por `wamid`.

---

### US2 — Panel Web de Gestión de Tickets de Soporte (Priority: P1)
**Como** Operador/Admin del ISP  
**Quiero** un panel centralizado en `/tickets`  
**Para** visualizar, filtrar y gestionar el flujo de incidencias de la red del ISP.

#### Criterios de Aceptación:
- Vista en `/tickets` con tarjetas KPI de tickets abiertos, en progreso, resueltos hoy y tiempo promedio de respuesta.
- Tabla de tickets con ordenamiento por prioridad y fecha de creación.
- Filtros rápidos por Estado (`Abierto`, `En Proceso`, `Resuelto`), Prioridad y Técnico Asignado.
- Botón de creación manual de ticket desde la web para solicitudes telefónicas o presenciales.

---

### US3 — Asignación a Técnicos de Campo con Ficha de Ubicación (Priority: P1)
**Como** Operador del ISP  
**Quiero** asignar un ticket a un técnico de campo específico con notas y dirección del cliente  
**Para** despachar la visita técnica con toda la información de infraestructura requerida.

#### Criterios de Aceptación:
- Modal/Panel de detalle del ticket permite seleccionar el técnico asignado (nombre, teléfono).
- Se permite ingresar notas operativas internas (ej: "Revisar ONT en poste 14").
- Despliega la dirección física del abonado, plan contratado y estado de pago para contexto del técnico.

---

### US4 — Notificaciones Automáticas por WhatsApp al Abonado (Priority: P1)
**Como** Abonado  
**Quiero** recibir mensajes por WhatsApp cuando mi ticket cambie de estado o sea resuelto  
**Para** estar informado sobre el avance de mi requerimiento.

#### Criterios de Aceptación:
- Al cambiar el estado de un ticket en la web (`open` -> `in_progress` o `resolved`), el sistema gatilla un mensaje automático vía WhatsApp Cloud API al abonado.
- Ejemplo de mensaje: *"Hola Valentina, tu ticket TCK-1082 ha sido actualizado a: EN PROCESO. Técnico asignado: Juan Pérez."*
- Al marcarse como `Resuelto`, el abonado recibe la confirmación con opción de calificar el servicio.

---

## Constitution Compliance Audit

| Principio Constitucional | Mecanismo de Cumplimiento en Feature 003 |
|---|---|
| **I. Multi-Tenancy Absoluto** | `organization_id` en la tabla `tickets`. Todas las consultas filtradas por el tenant autenticado. |
| **II. Seguridad de Credenciales** | Notificaciones de cambio de estado enviadas usando `WabaService.getDecryptedTokenInternal()`. Credenciales cifradas en reposo. |
| **III. Idempotencia en Webhooks** | Interacción de reporte en WhatsApp validada por `wamid` en `processed_webhook_events`. |
| **IV. Cumplimiento WhatsApp** | Mensajes dentro de ventana de 24h enviados como texto de sesión; fuera de ventana utilizan plantillas Utility. |
| **V. Calidad Verificable** | Suite completa de pruebas unitarias e integrales (`TicketService`, `TicketNotificationService`, `/api/tickets`). |
| **VI. Verificación en Vivo** | Verificación de ciclo completo de vida del ticket en el servidor de producción. |

---

## Data Model Extensions

### Entity: `tickets`
- `id` (UUID, Primary Key)
- `ticketNumber` (TEXT, NOT NULL, UNIQUE per tenant) — Ej: "TCK-1082"
- `organization_id` (UUID, FK -> `organizations.id`, NOT NULL, INDEX)
- `subscriber_id` (UUID, FK -> `subscribers.id`, NOT NULL, INDEX)
- `category` (ENUM: 'no_service', 'slow_internet', 'wifi_password', 'other')
- `priority` (ENUM: 'low', 'medium', 'high', 'critical', DEFAULT 'medium')
- `status` (ENUM: 'open', 'in_progress', 'resolved', 'closed', DEFAULT 'open')
- `assignedTechnician` (TEXT, Nullable) — Ej: "Juan Pérez (Técnico Nivel 2)"
- `description` (TEXT, NOT NULL)
- `internalNotes` (TEXT, Nullable)
- `createdAt` (TIMESTAMP, DEFAULT NOW())
- `updatedAt` (TIMESTAMP, DEFAULT NOW())

---

## API Contracts

### 1. `GET /api/tickets`
- **Descripción**: Lista los tickets del tenant con filtros opcionales.
- **Query Params**: `status`, `priority`, `subscriberId`.

### 2. `POST /api/tickets`
- **Descripción**: Crea un nuevo ticket de soporte.

### 3. `PATCH /api/tickets/[id]`
- **Descripción**: Actualiza el estado, asignación o notas de un ticket y dispara la notificación por WhatsApp.
- **Body**:
  ```json
  {
    "status": "in_progress",
    "assignedTechnician": "Carlos Ruiz",
    "internalNotes": "Técnico en camino con reemplazo de router"
  }
  ```
