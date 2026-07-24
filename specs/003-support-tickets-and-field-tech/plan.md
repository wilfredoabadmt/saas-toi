# Implementation Plan: 003-support-tickets-and-field-tech

**Feature**: Módulo de Tickets de Soporte Técnico, Registro de Averías y Asignación a Técnicos

**Spec**: [specs/003-support-tickets-and-field-tech/spec.md](specs/003-support-tickets-and-field-tech/spec.md)

---

## Technical Architecture

### 1. Database Schema (`src/db/schema/tickets.ts`)

- **Table: `tickets`**:
  - `id` (uuid, primaryKey)
  - `organizationId` (uuid, FK -> organizations, NOT NULL, INDEX)
  - `subscriberId` (uuid, FK -> subscribers, NOT NULL, INDEX)
  - `ticketNumber` (text, NOT NULL) — Ej: `TCK-1001`
  - `category` ('no_service' | 'slow_internet' | 'wifi_password' | 'other')
  - `priority` ('low' | 'medium' | 'high' | 'critical', DEFAULT 'medium')
  - `status` ('open' | 'in_progress' | 'resolved' | 'closed', DEFAULT 'open')
  - `description` (text, NOT NULL)
  - `assignedTechnician` (text, Nullable)
  - `internalNotes` (text, Nullable)
  - `createdAt` (timestamp, DEFAULT NOW())
  - `updatedAt` (timestamp, DEFAULT NOW())

---

### 2. Services Layer

- **`TicketService` (`src/services/ticket.service.ts`)**:
  - `list(organizationId, filters)`: Lista tickets filtrados por estado/prioridad/técnico.
  - `create(organizationId, input)`: Genera un nuevo ticket autonumerado por tenant (`TCK-1001`, `TCK-1002`).
  - `updateStatus(organizationId, ticketId, status, assignedTechnician, notes)`: Actualiza ticket y gatilla notificación automática por WhatsApp vía `TicketNotificationService`.
  - `createFromWhatsapp(organizationId, phone, category, description)`: Resuelve el abonado por teléfono y crea el ticket automático.

- **`TicketNotificationService` (`src/services/ticket-notification.service.ts`)**:
  - `notifyStatusChange(organizationId, ticketId, newStatus, technician)`: Rescata las credenciales WABA cifradas y envía un mensaje por WhatsApp Cloud API al abonado informando el cambio de estado.

---

### 3. API Routes

- `GET /api/tickets` — Lista de tickets del tenant con filtros
- `POST /api/tickets` — Creación manual de ticket
- `GET/PATCH /api/tickets/[id]` — Consulta y actualización de estado/asignación de técnico

---

### 4. UI Components & Pages

- **Página `/tickets`** (`src/app/(dashboard)/tickets/page.tsx`):
  - Tarjetas de resumen KPI (Abiertos, En Progreso, Resueltos Hoy).
  - Filtros por Estado, Prioridad y Técnico.
  - Tabla de tickets con badges de color.
  - Modal de detalle/edición para asignar técnico, agregar notas internas y cambiar estado.

---

## Verification Plan

### Automated Tests
1. `tests/unit/services/ticket.service.test.ts`: Creación de tickets autonumerados y filtrado por tenant.
2. `tests/unit/services/ticket-notification.service.test.ts`: Disparo de notificación WhatsApp ante cambios de estado.
3. `tests/integration/api/tickets.test.ts`: Endpoints `/api/tickets` y parches de actualización.

### Live Verification
- Crear ticket vía API/Web y verificar recepción de notificación por WhatsApp.
