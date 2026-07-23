# API Contract: Subscribers (Abonados)

**Base Path**: `/api/subscribers`
**Auth**: Session cookie (admin del ISP autenticado)
**Tenant scope**: `organization_id` se obtiene de la sesión del usuario autenticado

---

## GET /api/subscribers

Lista los abonados del tenant autenticado.

**Query Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Página (default: 1) |
| limit | number | No | Items por página (default: 50, max: 200) |
| status | string | No | Filtro: active, suspended, cancelled |
| payment_status | string | No | Filtro: current, due_soon, overdue |
| search | string | No | Búsqueda por nombre o teléfono |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Juan Pérez",
      "phone": "+5491155551234",
      "email": "juan@example.com",
      "servicePlan": {
        "id": "uuid",
        "name": "Fibra 50 Mbps",
        "price": 15000.00
      },
      "monthlyAmount": 15000.00,
      "dueDate": "2026-08-01",
      "status": "active",
      "paymentStatus": "current",
      "optedOutWhatsapp": false,
      "createdAt": "2026-07-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 324,
    "totalPages": 7
  }
}
```

---

## POST /api/subscribers

Crea un abonado manualmente.

**Request Body**:
```json
{
  "name": "Juan Pérez",
  "phone": "+5491155551234",
  "email": "juan@example.com",
  "servicePlanId": "uuid",
  "monthlyAmount": 15000.00,
  "dueDate": "2026-08-01",
  "address": "Calle 123",
  "notes": "Zona norte"
}
```

**Validation (Zod)**:
- `name`: string, min 2, max 200, required
- `phone`: string, E.164 format (`/^\+[1-9]\d{7,14}$/`), required
- `email`: string, email format, optional
- `servicePlanId`: uuid, optional (must exist in tenant)
- `monthlyAmount`: number, positive, max 2 decimals, required
- `dueDate`: date string (YYYY-MM-DD), required
- `address`: string, max 500, optional
- `notes`: string, max 1000, optional

**Response 201**:
```json
{
  "data": { /* subscriber object */ }
}
```

**Response 409** (teléfono duplicado en el tenant):
```json
{
  "error": "DUPLICATE_PHONE",
  "message": "Ya existe un abonado con este número de teléfono"
}
```

---

## POST /api/subscribers/import

Importa abonados desde un CSV.

**Request**: `multipart/form-data` con campo `file` (CSV, max 5MB)

**CSV Expected Columns**: `nombre,telefono,plan,monto,fecha_vencimiento`

**Response 200**:
```json
{
  "data": {
    "imported": 45,
    "duplicates": 3,
    "errors": [
      { "row": 12, "reason": "Teléfono inválido: '123'" },
      { "row": 27, "reason": "Monto no es un número válido" }
    ],
    "total": 50
  }
}
```

---

## GET /api/subscribers/:id

Obtiene el detalle de un abonado (con comprobantes).

**Response 200**:
```json
{
  "data": {
    "id": "uuid",
    "name": "Juan Pérez",
    "phone": "+5491155551234",
    "servicePlan": { "id": "uuid", "name": "Fibra 50 Mbps" },
    "monthlyAmount": 15000.00,
    "dueDate": "2026-08-01",
    "paymentStatus": "overdue",
    "status": "active",
    "paymentProofs": [
      {
        "id": "uuid",
        "fileType": "image",
        "reviewStatus": "pending",
        "downloadUrl": "https://presigned-s3-url...",
        "createdAt": "2026-07-20T14:30:00Z"
      }
    ],
    "recentMessages": [
      {
        "id": "uuid",
        "direction": "outbound",
        "templateName": "payment_reminder",
        "deliveryStatus": "delivered",
        "sentAt": "2026-07-18T10:00:00Z"
      }
    ]
  }
}
```

---

## PATCH /api/subscribers/:id

Actualiza un abonado.

**Request Body** (campos parciales):
```json
{
  "name": "Juan A. Pérez",
  "monthlyAmount": 18000.00,
  "dueDate": "2026-09-01"
}
```

**Response 200**: subscriber object actualizado.

---

## DELETE /api/subscribers/:id

Elimina (soft-delete) un abonado.

**Response 200**:
```json
{
  "data": { "id": "uuid", "status": "cancelled" }
}
```
