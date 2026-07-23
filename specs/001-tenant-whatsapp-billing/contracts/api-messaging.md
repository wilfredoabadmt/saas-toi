# API Contract: Messaging (Envío de Recordatorios)

**Base Path**: `/api/messaging`
**Auth**: Session cookie (admin del ISP autenticado)
**Tenant scope**: `organization_id` se obtiene de la sesión del usuario autenticado

---

## POST /api/messaging/send

Gatilla el envío de un template Utility a un conjunto de abonados.

**Request Body**:
```json
{
  "templateName": "payment_reminder",
  "subscriberIds": ["uuid-1", "uuid-2", "uuid-3"],
  "templateParams": {
    "language": "es"
  }
}
```

**Validation (Zod)**:
- `templateName`: string, min 1, max 100, required
- `subscriberIds`: array of uuid, min 1, max 500, required
- `templateParams.language`: string, default "es", optional

**Backend flow**:
1. Verifica que el tenant tiene WABA conectado.
2. Obtiene los abonados por IDs (filtrados por `organization_id`).
3. Filtra abonados con `opted_out_whatsapp = true` (no se les envía).
4. Para cada abonado, construye el template con parámetros personalizados:
   - `{{1}}` = nombre del abonado
   - `{{2}}` = monto ($15,000.00)
   - `{{3}}` = fecha de vencimiento (01/08/2026)
5. Envía vía WhatsApp Cloud API respetando rate limits.
6. Registra cada envío en `message_logs` con el `wamid` devuelto por Meta.
7. Retorna un resumen.

**Response 200** (éxito):
```json
{
  "data": {
    "totalRequested": 3,
    "sent": 2,
    "skipped": 1,
    "skippedReasons": [
      { "subscriberId": "uuid-3", "reason": "opted_out" }
    ],
    "results": [
      { "subscriberId": "uuid-1", "wamid": "wamid.HBgNNTQ5...", "status": "sent" },
      { "subscriberId": "uuid-2", "wamid": "wamid.HBgNNTQ5...", "status": "sent" }
    ]
  }
}
```

**Response 400** (WABA no conectado):
```json
{
  "error": "WABA_NOT_CONNECTED",
  "message": "Debe conectar WhatsApp Business antes de enviar mensajes"
}
```

**Response 429** (rate limit excedido):
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Se ha excedido el límite de envío. Intente nuevamente en unos minutos.",
  "retryAfter": 60
}
```

---

## GET /api/messaging/logs

Obtiene el historial de mensajes enviados/recibidos del tenant.

**Query Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Página (default: 1) |
| limit | number | No | Items por página (default: 50, max: 200) |
| subscriberId | uuid | No | Filtro por abonado específico |
| direction | string | No | Filtro: outbound, inbound |
| deliveryStatus | string | No | Filtro: sent, delivered, read, failed |
| dateFrom | string | No | Fecha inicio (ISO 8601) |
| dateTo | string | No | Fecha fin (ISO 8601) |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "subscriber": { "id": "uuid", "name": "Juan Pérez", "phone": "+549..." },
      "wamid": "wamid.HBgNNTQ5...",
      "direction": "outbound",
      "messageType": "template",
      "templateName": "payment_reminder",
      "deliveryStatus": "delivered",
      "sentAt": "2026-07-20T10:00:00Z",
      "statusUpdatedAt": "2026-07-20T10:00:05Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 150, "totalPages": 3 }
}
```
