# Webhook Contract: WhatsApp Cloud API

**Endpoint**: `/api/webhooks/whatsapp`
**Auth**: HMAC-SHA256 signature verification (no session cookie)
**Public**: Yes — accesible sin autenticación de usuario (Meta lo llama directamente)

---

## GET /api/webhooks/whatsapp

Verification challenge de Meta. Se invoca una sola vez al registrar el webhook.

**Query Parameters** (enviados por Meta):
| Param | Type | Description |
|-------|------|-------------|
| hub.mode | string | Siempre "subscribe" |
| hub.verify_token | string | Token que configuramos en Meta |
| hub.challenge | string | Challenge que debemos devolver |

**Flow**:
1. Verificar que `hub.mode === "subscribe"`.
2. Verificar que `hub.verify_token` coincide con nuestra variable de entorno
   `WEBHOOK_VERIFY_TOKEN`.
3. Si ambos coinciden → responder `200` con `hub.challenge` como body (text/plain).
4. Si no coinciden → responder `403 Forbidden`.

**Response 200**: `hub.challenge` (text/plain)
**Response 403**: `"Forbidden"`

---

## POST /api/webhooks/whatsapp

Recibe eventos de Meta (mensajes, estados de entrega, errores).

**Headers**:
| Header | Description |
|--------|-------------|
| X-Hub-Signature-256 | `sha256=<HMAC-SHA256(app_secret, raw_body)>` |
| Content-Type | `application/json` |

**Flow de procesamiento**:

```
1. Leer body como texto crudo (NO parsear JSON primero)
2. Extraer signature de header X-Hub-Signature-256
3. ¿signature presente?
   ├── No → 401 Unauthorized (log: "Missing signature")
   └── Sí → Calcular HMAC-SHA256(META_APP_SECRET, raw_body)
             ¿timingSafeEqual(calculated, received)?
             ├── No → 401 Unauthorized (log: "Invalid signature", NO logear el secret)
             └── Sí → Parsear JSON
                       Para cada entry.changes[]:
                         Extraer event_id (wamid o status_id)
                         ¿event_id en processed_webhook_events?
                         ├── Sí → Skip (ya procesado)
                         └── No → INSERT event_id en processed_webhook_events
                                  Resolver organization_id por phone_number_id destino
                                  Procesar evento según tipo:
                                    - messages → procesar mensaje entrante
                                    - statuses → actualizar delivery_status
                       Responder 200 OK
```

**Request Body** (ejemplo — mensaje de imagen entrante):
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WABA_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5491100001111",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "messages": [
              {
                "from": "5491155551234",
                "id": "wamid.HBgNNTQ5MTEwMDAwMTExMRUCABIYFjNF...",
                "timestamp": "1690000000",
                "type": "image",
                "image": {
                  "id": "MEDIA_ID",
                  "mime_type": "image/jpeg",
                  "sha256": "abc123...",
                  "caption": "Pago de julio"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Request Body** (ejemplo — status update):
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WABA_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5491100001111",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "statuses": [
              {
                "id": "wamid.HBgNNTQ5MTEwMDAwMTExMRUCABIYFjNF...",
                "status": "delivered",
                "timestamp": "1690000005",
                "recipient_id": "5491155551234"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Procesamiento por tipo de evento**:

### Mensajes entrantes (`messages[]`)

| Tipo | Acción |
|------|--------|
| `image` | Descargar media vía Graph API → Upload a S3 `/{org_id}/comprobantes/{subscriber_id}/` → Crear `payment_proof` + `message_log` |
| `document` | Mismo flujo que image |
| `text` | Crear `message_log` con `message_type = 'text'`. No crear `payment_proof`. |
| Otros | Crear `message_log` con `message_type = 'unknown'`. Log warning. |

**Resolución de tenant y abonado**:
1. `phone_number_id` del metadata → buscar en `waba_configs` → obtener `organization_id`.
2. `from` (número del remitente) + `organization_id` → buscar en `subscribers` por `(phone, organization_id)`.
3. Si no se encuentra tenant → log warning, skip (no error).
4. Si no se encuentra subscriber → crear `message_log` con `subscriber_id = null`,
   marcar como remitente desconocido.

### Status updates (`statuses[]`)

| Status | Acción |
|--------|--------|
| `sent` | Update `message_logs` SET `delivery_status = 'sent'` WHERE `wamid = id` |
| `delivered` | Update `message_logs` SET `delivery_status = 'delivered'` |
| `read` | Update `message_logs` SET `delivery_status = 'read'` |
| `failed` | Update `message_logs` SET `delivery_status = 'failed'`, `failure_reason = errors[0].title` |

**Response 200** (siempre, incluso si el evento se descartó por dedup):
```json
{
  "status": "ok"
}
```

**Response 401** (firma inválida o ausente):
```json
{
  "error": "Unauthorized"
}
```

---

## Timing Constraint

El endpoint MUST responder a Meta en **≤5 segundos** (requisito de Meta). Si el
procesamiento de media (descarga + upload S3) excede ~3 segundos, se debe mover a
procesamiento asíncrono y responder `200` inmediatamente. En v1, el procesamiento se
hace inline con timeout guard.

## Security Notes

- El `META_APP_SECRET` usado para verificar la firma NUNCA se logea.
- El body crudo NO se logea en su totalidad (puede contener datos personales).
- Los errores `401` se logean sin incluir detalles del secret ni del body.
- Las URLs de media de Meta son temporales y requieren el token WABA para acceder;
  el token se descifra solo en el momento de la descarga.
