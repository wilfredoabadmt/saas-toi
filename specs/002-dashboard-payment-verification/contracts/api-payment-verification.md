# Contract: Payment Verification API

**Feature**: 002-dashboard-payment-verification | [plan.md](../plan.md)

`organization_id` siempre desde `getSessionContext`. Roles permitidos para todos los
endpoints de esta sección: `owner`, `admin`, `operator`. Errores vía `handleApiError`.

---

## GET /api/payments/proofs

Lista comprobantes del tenant para la bandeja de verificación. Usado por el polling
(~30 s) y el refresco manual.

**Query params**:
- `status` (opcional, default `pending`): `pending | approved | rejected`.
- `page` (opcional, default 1), `limit` (opcional, default 50).

**Response 200**:

```json
{
  "data": [
    {
      "id": "uuid",
      "reviewStatus": "pending",
      "fileType": "image",
      "mimeType": "image/jpeg",
      "downloadUrl": "https://s3.../presigned?...",
      "senderPhone": "+51999888777",
      "createdAt": "2026-07-23T14:10:00Z",
      "subscriber": {
        "id": "uuid|null",
        "name": "Juan Pérez|null",
        "phone": "+51999888777|null",
        "planName": "Fibra 50 Mbps|null",
        "monthlyAmount": "80.00|null",
        "dueDate": "2026-07-20|null",
        "paymentStatus": "overdue|null"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 50 }
}
```

**Reglas**:
- `WHERE organization_id = <session org>` obligatorio.
- `downloadUrl` = presigned URL con TTL corto (≤ 900 s); el frontend nunca accede al
  bucket directamente (Principio VII).
- `subscriber` es `null` (o campos en `null`) cuando `subscriber_id IS NULL` (abonado no
  identificado); en ese caso `senderPhone` orienta la asociación manual.
- Lista vacía → `data: []` (la UI muestra estado vacío, FR-004).

---

## PATCH /api/payments/proofs/{proofId}

Aprueba o rechaza un comprobante `pending`. Idempotente (D4).

**Request body (approve)**:

```json
{ "action": "approve", "amount": 80.00 }
```

**Request body (reject)**:

```json
{ "action": "reject", "reason": "El monto no coincide con la factura" }
```

**Validación (Zod)**:
- `action`: `approve | reject` (requerido).
- `approve` → `amount`: number ≥ 0 (requerido, FR-006a).
- `reject` → `reason`: string no vacío (requerido, FR-013; falta → `400`).
- El comprobante debe tener `subscriber_id` asociado antes de aprobar/rechazar con
  notificación; si `subscriber_id IS NULL` → `409` con mensaje "asociar abonado primero".

**Comportamiento (approve)**:
1. `UPDATE ... SET review_status='approved', amount, reviewed_by, reviewed_at WHERE id=? AND organization_id=? AND review_status='pending' RETURNING *`.
2. Si 0 filas → `409 CONFLICT` con el estado actual (sin efecto, sin envío).
3. Si transicionó → `subscriber.payment_status='current'`, `due_date += 1 mes`.
4. Si el abonado NO tiene opt-out → enviar template UTILITY `payment_confirmation`;
   registrar `message_log`. Si opt-out → no enviar (`notified=false`, `reason='opted_out'`).
5. Fallo de Meta → conservar approve + update; `message_log.delivery_status='failed'`;
   respuesta `notified=false` con motivo (no revierte, FR-010).

**Comportamiento (reject)**: análogo con `review_status='rejected'`, `review_notes=reason`;
NO cambia `payment_status` del abonado (FR-012); envía template `payment_correction`.

**Response 200**:

```json
{
  "data": { "id": "uuid", "reviewStatus": "approved", "amount": 80.00, "reviewedAt": "..." },
  "subscriber": { "id": "uuid", "paymentStatus": "current", "dueDate": "2026-08-20" },
  "notification": { "notified": true, "channel": "whatsapp", "reason": null }
}
```

**Errores**: `400` validación (falta amount/reason); `403` rol; `404` no existe/otro
tenant; `409` ya resuelto o `subscriber_id` nulo.

---

## PATCH /api/payments/proofs/{proofId}/assign

Asocia un comprobante de abonado no identificado (`subscriber_id IS NULL`) a un abonado
existente del tenant (FR-021, D3).

**Request body**:

```json
{ "subscriberId": "uuid" }
```

**Reglas**:
- El abonado destino MUST pertenecer al mismo `organization_id` que el comprobante
  (si no → `404`/`403`; nunca cross-tenant).
- Solo aplica si el comprobante sigue `pending`; tras asociar, sigue el flujo normal de
  approve/reject.

**Response 200**: `{ "data": { "id": "uuid", "subscriberId": "uuid" } }`

**Errores**: `400` `subscriberId` inválido; `404` comprobante o abonado no encontrado en
el tenant; `409` comprobante ya resuelto.
