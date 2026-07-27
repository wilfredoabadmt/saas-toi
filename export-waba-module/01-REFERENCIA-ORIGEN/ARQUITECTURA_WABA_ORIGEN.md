# 01 — Arquitectura del módulo WABA en el proyecto origen

Análisis exhaustivo de la sección **Conexión Meta WhatsApp Business (WABA)** tal como
existe hoy en `suscripta-saas-main` (Next.js 16 App Router + Supabase). Sirve como
referencia conceptual: **el código que debes implantar está en `03-` a `06-`**, ya
adaptado a Drizzle + multi-tenant.

---

## 1. Inventario de archivos del origen

| Archivo | Líneas | Responsabilidad |
|---|---:|---|
| `src/utils/whatsapp.ts` | 126 | Cliente Graph API v22.0, tipos, normalización de teléfono |
| `src/app/actions/whatsapp.ts` | 1006 | **Núcleo**: 11 Server Actions (conexión, plantillas, envío, estado) |
| `src/app/api/whatsapp/exchange-token/route.ts` | 181 | Canje OAuth `code` → token largo → persistencia |
| `src/app/api/whatsapp/webhook/route.ts` | 140 | Verificación GET + ingesta POST de estados/mensajes |
| `src/app/api/meta/deauthorize/route.ts` | 138 | Callback firmado de desautorización + purga |
| `src/utils/data-deletion.ts` | 117 | Purga de datos WABA de un usuario |
| `src/components/EmbeddedSignupButton.tsx` | 436 | Botón + SDK JS de Facebook + `postMessage` |
| `src/components/AppReviewConsole.tsx` | 617 | Consola de demo para App Review |
| `src/components/dashboard/CampaignComposer.tsx` | 322 | Envío de plantilla con polling de estado |
| `src/app/dashboard/templates/page.tsx` | 163 | Catálogo de plantillas |
| `src/app/dashboard/campaigns/page.tsx` | 70 | Pantalla de envíos |
| `src/app/dashboard/conversations/page.tsx` | 489 | Hilos de conversación desde eventos |
| `src/app/oauth/callback/OAuthCallbackContent.tsx` | 219 | Callback de redirect (flujo alternativo) |
| `supabase_setup.sql` | 232 | Esquema: `whatsapp_connections`, `whatsapp_message_events` |

**Total del módulo WABA: ~3 300 líneas.**

---

## 2. Modelo de datos original

### `whatsapp_connections` (→ tu `waba_configs`)

```
id                    uuid PK
user_id               uuid FK auth.users     ← en SaaS TOI será organization_id
waba_id               text NOT NULL
phone_number_id       text NOT NULL
display_phone_number  text
verified_name         text
access_token          text NOT NULL          ← ⚠️ EN CLARO en el origen
is_active             boolean DEFAULT true
created_at / updated_at
UNIQUE(waba_id, phone_number_id)
```

### `whatsapp_message_events` (→ tu `message_logs`)

```
id               uuid PK
user_id          uuid FK
waba_id          text
phone_number_id  text
message_id       text NOT NULL UNIQUE   ← wamid, clave de idempotencia
recipient_phone  text
template_name    text
direction        text DEFAULT 'outbound'
message_text     text
status           text NOT NULL
error_code / error_title / error_message  text
raw_payload      jsonb
created_at / updated_at / last_event_at
```

Tabla **append-only con upsert sobre `message_id`**. El ciclo de vida de un mensaje
saliente escribe la misma fila 3–4 veces:

```
accepted (Server Action) → sent → delivered → read      (webhook)
                                 ↘ failed (+ error_code)
```

---

## 3. Los cuatro flujos

### 3.1 Conexión — Embedded Signup

```
Usuario pulsa "Conectar con Meta"
   │
   ├─ SDK JS de Facebook (connect.facebook.net/en_US/sdk.js)
   │  FB.init({ appId, version: 'v22.0' })
   │
   ├─ FB.login(cb, {
   │      config_id, response_type: 'code',
   │      override_default_response_type: true,
   │      extras: { featureType: 'whatsapp_business_app_onboarding',
   │                sessionInfoVersion: '3' } })
   │
   ├─ [Popup de Meta] login → permisos → Business → número
   │
   ├─ DOS canales asíncronos, en orden NO garantizado:
   │    (a) callback de FB.login → authResponse.code
   │    (b) window.postMessage desde https://www.facebook.com
   │        → JSON { type: 'WA_EMBEDDED_SIGNUP',
   │                 data: { waba_id, phone_number_id } }
   │
   ├─ El componente acumula ambos en un ref y dispara el canje
   │  solo cuando tiene los 3 valores (patrón "flushPending")
   │
   └─ POST /api/whatsapp/exchange-token { code, waba_id, phone_number_id }
        │
        ├─ GET graph.facebook.com/v22.0/oauth/access_token
        │     ?client_id&client_secret&code            ← SIN redirect_uri
        ├─ GET /{phone_number_id}                      → display_phone_number, verified_name
        ├─ GET /me?fields=id                           → meta_user_id (para deauthorize)
        └─ UPSERT whatsapp_connections ON CONFLICT (waba_id, phone_number_id)
```

**Detalle crítico:** en el flujo popup **no se envía `redirect_uri`** en el canje.
Meta emite el código sin destino de redirección; enviarlo produce
`verification code mismatch`. Está documentado en el propio código del origen.

**Segundo detalle crítico:** `waba_id` y `phone_number_id` **no vienen en el
`authResponse`**. Llegan exclusivamente por `postMessage`. Por eso el componente
persiste el estado parcial en `sessionStorage` y reconcilia: si el usuario recarga
o si el `postMessage` llega después del callback, no se pierde nada.

### 3.2 Lectura de activos (`whatsapp_business_management`)

`getWhatsAppWorkspaceBundle()` hace 2 llamadas en paralelo + 1 consulta local:

```
GET /{phone_number_id}?fields=id,display_phone_number,verified_name,
        quality_rating,code_verification_status,name_status,platform_type,throughput
GET /{waba_id}/message_templates?fields=id,name,status,language,category,
        sub_category,components&limit=100
SELECT ... FROM whatsapp_message_events WHERE phone_number_id = ? ORDER BY updated_at DESC
```

Si Meta devuelve un error de los tipos "token inválido / no existe / permiso", el
código marca `is_active = false` y devuelve un bundle vacío en lugar de reventar la
página. Patrón `shouldMarkConnectionInactive()` — **conviene conservarlo**.

### 3.3 Envío (`whatsapp_business_messaging`)

```
POST /{phone_number_id}/messages
{
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: '<E.164 sin +>',
  type: 'template',
  template: { name, language: { code }, components: [{ type:'body', parameters:[...] }] }
}
→ { messages: [{ id: 'wamid.XXX' }], contacts: [{ wa_id }] }
→ upsert message_event status='accepted'
→ el cliente hace polling cada 3 s (máx 10 intentos) hasta delivered/read/failed
```

**Reintento por variantes de número:** el origen prueba varios formatos de teléfono
cuando Meta responde `Account not registered` (caso México: `+52 1 XXX` vs `+52 XXX`).
Para Bolivia el equivalente es el prefijo `591` — ver `03-CORE/phone.ts`.

También existe `sendWhatsAppTextMessage()` para respuestas en ventana de 24 h
(`type: 'text'`), usado por la bandeja de conversaciones.

### 3.4 Webhook

```
GET  /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y
     → devuelve Y en texto plano si el token coincide

POST /api/whatsapp/webhook
     payload.entry[].changes[] donde field === 'messages'
       value.statuses[] → eventos outbound (sent/delivered/read/failed + errors[])
       value.messages[] → eventos inbound  (status='received', message_text)
     → UPSERT en lote ON CONFLICT (message_id)
     → responde { received: true } SIEMPRE rápido
```

### 3.5 Desautorización

```
POST /api/meta/deauthorize  (signed_request de Meta)
  ├─ HMAC-SHA256(payload, APP_SECRET) con timingSafeEqual
  ├─ decodifica base64url → { user_id }
  ├─ resuelve el usuario local por meta_user_id
  └─ purgeUserWhatsAppData(): borra message_events + connections, limpia metadata
```

---

## 4. Superficie de UI del origen

| Ruta | Qué muestra |
|---|---|
| `/dashboard/review` | Consola lineal para App Review: conectar → crear plantilla → leer estado → enviar |
| `/dashboard/templates` | Catálogo de plantillas con `status`, idioma, categoría y cuerpo |
| `/dashboard/campaigns` | Composer de envío con vista previa y polling de estado |
| `/dashboard/conversations` | Hilos agrupados por teléfono, con respuesta libre en ventana de 24 h |
| `/oauth/callback` | Pantalla de canje para el flujo redirect (alternativo al popup) |
| `/data-deletion` | Formulario público de solicitud de borrado (requisito de Meta) |

---

## 5. Validación de plantillas implementada en el origen

Reglas de Meta que el origen valida **antes** de llamar a la API (ahorra rechazos):

1. Nombre: minúsculas, números y `_` (se normaliza automáticamente).
2. Idioma: `^[a-z]{2}(_[A-Z]{2})?$` → `es`, `es_MX`, `en_US`.
3. Variables `{{n}}` secuenciales empezando en `{{1}}`.
4. Ninguna variable al inicio ni al final del cuerpo.
5. Ninguna variable adyacente a otra (`{{1}} {{2}}` prohibido).
6. Se genera automáticamente el bloque `example.body_text` requerido por Meta.

Todo esto está portado íntegro en `03-CORE/templates.ts`.

---

## 6. Qué cambia al portarlo a SaaS TOI

| Origen | SaaS TOI |
|---|---|
| Supabase JS client (`createClient` / `createAdminClient`) | **Drizzle ORM** |
| RLS de Postgres para aislar | **`WHERE organization_id = ?` explícito** |
| `user_id` (usuario individual) | **`organization_id` (tenant)** |
| `access_token` en claro | **AES-256-GCM en `access_token_encrypted`** |
| Webhook sin verificación de firma | **HMAC `X-Hub-Signature-256` obligatorio** |
| Webhook sin resolución de tenant | **Resuelve org desde `phone_number_id`** |
| Fallback "cualquier conexión activa" | **Eliminado** (fuga entre tenants) |
| Tabla `customers` | Tabla **`subscribers`** existente |
| `whatsapp_message_events` | Tabla **`message_logs`** existente |

Los detalles de cada cambio, y por qué son necesarios, están en `GOTCHAS.md`.
