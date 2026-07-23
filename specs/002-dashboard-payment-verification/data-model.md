# Data Model: 002-dashboard-payment-verification

**Date**: 2026-07-23
**Feature**: [spec.md](spec.md) | [plan.md](plan.md)

Esta feature **no introduce entidades nuevas**. Modifica dos tablas existentes del
feature 001. El resto del modelo (`organizations`, `users`, `subscribers`,
`service_plans`, `message_logs`, `processed_webhook_events`) se reutiliza sin cambios de
esquema. Ver [../001-tenant-whatsapp-billing/data-model.md](../001-tenant-whatsapp-billing/data-model.md).

## Cambios de esquema (migración incremental Drizzle)

### `payment_proofs` (MODIFICADA)

| Column | Cambio | Type | Constraints | Description |
|--------|--------|------|-------------|-------------|
| subscriber_id | **RELAJADO** | UUID | ~~NOT NULL~~ → **NULL** permitido, FK → subscribers.id | NULL = comprobante de abonado no identificado, pendiente de asociación manual |
| amount | **NUEVO** | NUMERIC(10,2) | NULL | Monto pagado confirmado por el operador al aprobar. NULL mientras `pending`/`rejected` |
| sender_phone | **NUEVO** | TEXT | NULL | Teléfono emisor (E.164) del comprobante; base para asociación manual cuando `subscriber_id IS NULL` |

Columnas sin cambio: `id`, `organization_id`, `message_log_id` (ya nullable), `wamid`
(UNIQUE), `file_type`, `mime_type`, `s3_key`, `file_size_bytes`, `review_status`,
`reviewed_by`, `reviewed_at`, `review_notes`, `created_at`.

**Indexes**: se conservan los de 001. Se aprovecha
`payment_proofs_review_status_idx (organization_id, review_status)` para el listado de
pendientes y el conteo del dashboard.

**Reglas de validación**:
- Al aprobar: `amount` MUST estar presente y ser ≥ 0.
- Al rechazar: `review_notes` MUST estar presente (motivo obligatorio, FR-013).
- Transición permitida solo desde `review_status = 'pending'` (guard atómico, D4).

---

### `organizations` (MODIFICADA)

| Column | Cambio | Type | Constraints | Description |
|--------|--------|------|-------------|-------------|
| timezone | **NUEVO** | TEXT | NOT NULL, DEFAULT 'America/Lima' | Zona horaria IANA del ISP; define el corte de "mes actual" para el total recaudado |

Sin cambios en el resto de columnas de `organizations`.

---

## Estado y transiciones

### PaymentProof `review_status` (idempotente, D4)

```
pending ──(approve: set amount, reviewed_by/at → notify confirmation)──→ approved
   │
   └──(reject: require review_notes, reviewed_by/at → notify correction)──→ rejected

approved / rejected ──(cualquier re-intento)──→ 409 CONFLICT (sin efecto, sin reenvío)
```

### PaymentProof `subscriber_id` (asociación manual, D3)

```
NULL (no identificado) ──(operador asocia abonado del tenant)──→ <subscriber_id>
                                                                        │
                                                              (luego approve/reject normal)
```
> El `UPDATE` de asociación exige `organization_id` del abonado = `organization_id` del
> comprobante (no se puede asociar a un abonado de otro tenant — Principio I).

### Subscriber `payment_status` (efecto de la aprobación, D2)

```
overdue / due_soon / current ──(proof approved)──→ current  (+ due_date += 1 mes)
```
> Reutiliza la máquina de estados de 001; la aprobación fuerza `current` y avanza el
> vencimiento un ciclo, sin importar el `amount`.

## Entidades leídas (sin cambio) relevantes al dashboard

- **subscribers**: `payment_status`, `monthly_amount` → cartera vencida y abonados en mora.
- **payment_proofs**: `review_status`, `amount`, `reviewed_at` → total recaudado y
  comprobantes pendientes.
- **organizations**: `timezone` → boundary del mes.

## Compatibilidad y migración

- La migración es **aditiva** (2 columnas nuevas) + **relajación** de un `NOT NULL`
  (`subscriber_id`). No hay borrado ni recreación de tablas; datos 001 existentes quedan
  válidos (`amount`/`sender_phone` = NULL, `timezone` = default).
- Se genera con `drizzle-kit` y se aplica vía el mecanismo de auto-migración runtime ya
  presente (`ensureMigrationsRun`) + prestart script.
