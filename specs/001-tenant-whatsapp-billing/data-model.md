# Data Model: 001-tenant-whatsapp-billing

**Date**: 2026-07-23
**Feature**: [spec.md](spec.md) | [plan.md](plan.md)

## Entity Relationship Overview

```
Organization (ISP / Tenant)
├── 1:N → User (Admin ISP)
├── 1:1 → WabaConfig (WhatsApp Business Account)
├── 1:N → ServicePlan (Plan de Servicio)
├── 1:N → Subscriber (Abonado)
│         ├── 1:N → MessageLog (Mensajes enviados/recibidos)
│         └── 1:N → PaymentProof (Comprobantes de pago)
└── 1:N → ProcessedWebhookEvent (Deduplicación)
```

## Entities

### organizations

Representa un ISP (tenant). Es la raíz de aislamiento de todo el modelo.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único del tenant |
| name | TEXT | NOT NULL | Nombre comercial del ISP |
| slug | TEXT | NOT NULL, UNIQUE | Slug URL-friendly para subdominios/rutas |
| status | TEXT | NOT NULL, DEFAULT 'active' | Estado: active, suspended, cancelled |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Última actualización |

**Indexes**: `UNIQUE(slug)`

---

### users

Usuarios administrativos del ISP. Pertenecen a una Organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| organization_id | UUID | NOT NULL, FK → organizations.id, INDEX | Tenant al que pertenece |
| email | TEXT | NOT NULL | Email del usuario |
| name | TEXT | NOT NULL | Nombre completo |
| role | TEXT | NOT NULL, DEFAULT 'admin' | Rol: owner, admin, operator |
| password_hash | TEXT | NOT NULL | Hash de contraseña (argon2) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Última actualización |

**Indexes**: `UNIQUE(email, organization_id)`, `INDEX(organization_id)`

---

### service_plans

Planes de servicio de internet que ofrece el ISP.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| organization_id | UUID | NOT NULL, FK → organizations.id, INDEX | Tenant |
| name | TEXT | NOT NULL | Nombre del plan (ej: "Fibra 50 Mbps") |
| price | NUMERIC(10,2) | NOT NULL | Precio mensual |
| speed_down | TEXT | NULL | Velocidad de descarga (ej: "50 Mbps") |
| speed_up | TEXT | NULL | Velocidad de subida (ej: "25 Mbps") |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Si el plan se ofrece activamente |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Última actualización |

**Indexes**: `INDEX(organization_id)`, `UNIQUE(name, organization_id)`

---

### subscribers

Abonados (clientes de internet) del ISP. Entidad central del dominio.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| organization_id | UUID | NOT NULL, FK → organizations.id, INDEX | Tenant |
| name | TEXT | NOT NULL | Nombre completo del abonado |
| phone | TEXT | NOT NULL | Número de teléfono (formato E.164 con código país) |
| email | TEXT | NULL | Email opcional del abonado |
| service_plan_id | UUID | NULL, FK → service_plans.id | Plan de servicio asignado |
| monthly_amount | NUMERIC(10,2) | NOT NULL | Monto mensual a cobrar |
| due_date | DATE | NOT NULL | Fecha de vencimiento del periodo actual |
| status | TEXT | NOT NULL, DEFAULT 'active' | Estado: active, suspended, cancelled |
| payment_status | TEXT | NOT NULL, DEFAULT 'current' | Estado de pago calculado: current, due_soon, overdue |
| address | TEXT | NULL | Dirección del abonado |
| notes | TEXT | NULL | Notas internas del operador |
| opted_out_whatsapp | BOOLEAN | NOT NULL, DEFAULT false | Si el abonado pidió no recibir mensajes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Última actualización |

**Indexes**: `UNIQUE(phone, organization_id)`, `INDEX(organization_id)`,
`INDEX(organization_id, payment_status)`, `INDEX(organization_id, due_date)`

**Calculated field `payment_status`**: Se actualiza por un job periódico o al
consultar:
- `current`: `due_date > today + 5 days`
- `due_soon`: `today <= due_date <= today + 5 days`
- `overdue`: `due_date < today`

---

### waba_configs

Configuración de WhatsApp Business Account del ISP. Relación 1:1 con Organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| organization_id | UUID | NOT NULL, FK → organizations.id, UNIQUE INDEX | Tenant (1:1) |
| waba_id | TEXT | NOT NULL | WABA ID de Meta |
| phone_number_id | TEXT | NOT NULL, UNIQUE | Phone Number ID de Meta |
| display_phone | TEXT | NOT NULL | Número de teléfono visible (display) |
| encrypted_token | TEXT | NOT NULL | System User Access Token cifrado (AES-256-GCM) — formato: `iv:authTag:ciphertext` |
| key_version | INTEGER | NOT NULL, DEFAULT 1 | Versión de la clave de cifrado (para rotación futura) |
| connection_status | TEXT | NOT NULL, DEFAULT 'connected' | Estado: connected, disconnected, error |
| connected_at | TIMESTAMP | NOT NULL, DEFAULT now() | Fecha de conexión |
| disconnected_at | TIMESTAMP | NULL | Fecha de desconexión (si aplica) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Última actualización |

**Indexes**: `UNIQUE(organization_id)`, `UNIQUE(phone_number_id)`

**Nota de seguridad**: `encrypted_token` NUNCA se expone en respuestas API al
frontend. Solo el service layer del backend lo descifra en memoria para hacer
llamadas a la API de Meta.

---

### message_logs

Registro de mensajes enviados y recibidos por WhatsApp.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| organization_id | UUID | NOT NULL, FK → organizations.id, INDEX | Tenant |
| subscriber_id | UUID | NOT NULL, FK → subscribers.id, INDEX | Abonado asociado |
| wamid | TEXT | NOT NULL | WhatsApp Message ID (de Meta) |
| direction | TEXT | NOT NULL | Dirección: outbound, inbound |
| message_type | TEXT | NOT NULL | Tipo: template, text, image, document, unknown |
| template_name | TEXT | NULL | Nombre del template usado (solo outbound) |
| content_preview | TEXT | NULL | Preview del contenido (primeros 100 chars, sin datos sensibles) |
| delivery_status | TEXT | NOT NULL, DEFAULT 'sent' | Estado: sent, delivered, read, failed |
| failure_reason | TEXT | NULL | Motivo de fallo (si delivery_status = failed) |
| sent_at | TIMESTAMP | NOT NULL, DEFAULT now() | Timestamp del envío/recepción |
| status_updated_at | TIMESTAMP | NULL | Última actualización de estado de entrega |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Fecha de creación |

**Indexes**: `INDEX(organization_id)`, `INDEX(organization_id, subscriber_id)`,
`INDEX(wamid)`, `INDEX(organization_id, delivery_status)`

---

### payment_proofs

Comprobantes de pago enviados por abonados vía WhatsApp.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| organization_id | UUID | NOT NULL, FK → organizations.id, INDEX | Tenant |
| subscriber_id | UUID | NOT NULL, FK → subscribers.id, INDEX | Abonado que envió el comprobante |
| message_log_id | UUID | NOT NULL, FK → message_logs.id | Mensaje asociado |
| wamid | TEXT | NOT NULL | wamid del mensaje que contenía el archivo |
| file_type | TEXT | NOT NULL | Tipo: image, document |
| mime_type | TEXT | NOT NULL | MIME type del archivo (image/jpeg, application/pdf, etc.) |
| s3_key | TEXT | NOT NULL | Key del archivo en S3 (path completo incluyendo prefijo tenant) |
| file_size_bytes | INTEGER | NULL | Tamaño del archivo en bytes |
| review_status | TEXT | NOT NULL, DEFAULT 'pending' | Estado de revisión: pending, approved, rejected |
| reviewed_by | UUID | NULL, FK → users.id | Usuario que revisó |
| reviewed_at | TIMESTAMP | NULL | Fecha de revisión |
| review_notes | TEXT | NULL | Notas de la revisión |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Fecha de creación |

**Indexes**: `INDEX(organization_id)`, `INDEX(organization_id, subscriber_id)`,
`INDEX(organization_id, review_status)`, `UNIQUE(wamid)`

---

### processed_webhook_events

Tabla de deduplicación de webhooks. Evita procesamiento duplicado.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| event_id | TEXT | NOT NULL, UNIQUE | ID único del evento (wamid o status_id) |
| event_type | TEXT | NOT NULL | Tipo: message, status, error |
| organization_id | UUID | NULL, FK → organizations.id | Tenant (puede ser NULL si el evento no se resuelve a un tenant) |
| payload_hash | TEXT | NULL | Hash del payload para auditoría |
| received_at | TIMESTAMP | NOT NULL, DEFAULT now() | Cuando se recibió |
| processed_at | TIMESTAMP | NULL | Cuando se terminó de procesar (NULL = en proceso) |

**Indexes**: `UNIQUE(event_id)`, `INDEX(received_at)` (para TTL cleanup)

**TTL**: Job periódico elimina registros con `received_at < now() - interval '7 days'`.

## State Transitions

### Subscriber `payment_status`

```
current ──(due_date - 5 days)──→ due_soon ──(due_date passed)──→ overdue
   ↑                                                                │
   └────────────────── (payment registered) ────────────────────────┘
```

### PaymentProof `review_status`

```
pending ──(admin approves)──→ approved
   │
   └──(admin rejects)──→ rejected
```

### WabaConfig `connection_status`

```
(none) ──(Embedded Signup success)──→ connected
                                         │
                                    (token error/revoked)
                                         ↓
                                    disconnected ──(re-connect)──→ connected
```

### MessageLog `delivery_status` (outbound)

```
sent ──(webhook: delivered)──→ delivered ──(webhook: read)──→ read
  │
  └──(webhook: failed)──→ failed
```
