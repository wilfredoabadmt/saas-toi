# 01 — GOTCHAS: fallos reales del módulo origen y su corrección

> Lista de problemas **verificados leyendo el código del origen**. Cada uno indica el
> archivo y la línea donde está, y cómo lo resuelve el código de este paquete.
> **Si copias el original tal cual, heredas los 12.**

---

## 🔴 CRÍTICOS — fugas entre tenants

### G-01. Fallback a "cualquier conexión activa" cuando no hay sesión

`src/app/actions/whatsapp.ts:231-240`

```ts
// Si no hay usuario autenticado, coge la PRIMERA conexión activa de TODA la tabla
const supabaseAdmin = await createAdminClient();
const { data } = await supabaseAdmin
    .from('whatsapp_connections')
    .select('*')
    .eq('is_active', true)          // ← sin filtro de tenant
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle();
```

**Impacto:** en multi-tenant, una petición sin sesión válida operaría con el token
—y el número de WhatsApp— de otra organización.

**Corrección en este paquete:** `03-CORE/waba.repository.ts` no expone ninguna función
sin `organizationId`. `tenant-context.ts` lanza `UnauthorizedError` si no resuelve
organización. No hay fallback.

---

### G-02. Consulta de eventos por `phone_number_id`, no por tenant

`src/app/actions/whatsapp.ts:326-331, 412-417, 468-474`

```ts
.from('whatsapp_message_events')
.eq('phone_number_id', connection.phone_number_id)   // ← único filtro
```

Funciona por accidente: como `phone_number_id` es único por conexión, aísla. Pero si
dos organizaciones comparten un número (BSP, pruebas, reconexión) o si el
`phone_number_id` se reasigna, se cruzan los datos.

**Corrección:** todas las consultas de `message_logs` filtran por
`organization_id` **y además** por `waba_config_id`.

---

### G-03. `disconnectWhatsApp()` borra por `user_id IS NULL`

`src/app/actions/whatsapp.ts:999-1003`

```ts
await supabaseAdmin.from('whatsapp_connections').delete().is('user_id', null);
```

Si no hay sesión, **borra todas las conexiones huérfanas de todas las organizaciones**.

**Corrección:** `disconnectWaba()` exige `organizationId` y borra únicamente
`WHERE organization_id = ? AND id = ?`.

---

### G-04. El webhook no resuelve la organización

`src/app/api/whatsapp/webhook/route.ts:83-113`

```ts
waba_id: null,           // ← nunca se rellena
phone_number_id: metadata.phone_number_id ?? null,
// y no hay user_id
```

Los eventos entran sin dueño. En el origen, `whatsapp_message_events.user_id` queda
`NULL` para todo lo que llega por webhook, lo que además rompe la política RLS
`auth.uid() = user_id` (`supabase_setup.sql:163-166`): **el usuario no ve sus propios
eventos entrantes**.

**Corrección:** `04-API-ROUTES/webhook.route.ts` hace un lookup
`phone_number_id → waba_configs` y rellena `organization_id` + `waba_config_id` en
cada fila. Si no encuentra tenant, descarta el evento y lo registra (no lo inserta
huérfano).

---

## 🔴 CRÍTICOS — seguridad

### G-05. El webhook no valida `X-Hub-Signature-256`

`src/app/api/whatsapp/webhook/route.ts:70-72` — parsea el body directamente.

Cualquiera que conozca la URL puede inyectar eventos falsos: marcar mensajes como
`delivered`, crear conversaciones entrantes ficticias, envenenar métricas.

**Corrección:** `webhook.route.ts` de este paquete lee el body **crudo**, calcula
`HMAC-SHA256(rawBody, META_APP_SECRET)` y compara con `timingSafeEqual` antes de
procesar nada. Controlable con `META_WEBHOOK_ENFORCE_SIGNATURE`.

### G-06. Access token en claro en la base de datos

`supabase_setup.sql:72` → `access_token TEXT NOT NULL`

Un token de WhatsApp Business permite enviar mensajes en nombre del cliente y leer sus
activos. En claro, cualquier dump o acceso de lectura a la DB lo compromete.

**Corrección:** `03-CORE/crypto.ts` (AES-256-GCM, formato `v1:iv:tag:ciphertext`).
SaaS TOI ya declara AES-256-GCM para credenciales → **reutiliza tu utilidad existente**.

### G-07. El endpoint de deauthorize confía en la sesión del navegador

`src/app/api/meta/deauthorize/route.ts:97-98`

```ts
const mappedUserId = currentUserId ?? (metaUserId ? await find...(metaUserId) : null);
```

`currentUserId` tiene prioridad sobre el `signed_request` validado. Si alguien
autenticado hace `GET /api/meta/deauthorize` sin firma, **purga sus propios datos**
sin ninguna validación de Meta. Es un CSRF destructivo.

**Corrección:** en este paquete el `signed_request` válido es **obligatorio**; la
sesión solo se usa como pista de logging, nunca como fuente de identidad.

### G-08. Fuga de datos en logs

`exchange-token/route.ts:154-161` loguea `access_token.substring(0,20)`.
`OAuthCallbackContent.tsx:73` hace `console.log` del `code` completo en el navegador.

**Corrección:** ningún log del paquete imprime material del token. Solo IDs.

---

## 🟠 IMPORTANTES — correctitud

### G-09. `UNIQUE(waba_id, phone_number_id)` sin tenant

`supabase_setup.sql:78`

Con ese constraint, **dos organizaciones no pueden conectar el mismo número**, y peor:
un `UPSERT ON CONFLICT (waba_id, phone_number_id)` de la org B **sobrescribe la fila de
la org A**, incluido `user_id`. Robo silencioso de conexión.

**Corrección:** `UNIQUE (organization_id, waba_id, phone_number_id)` y el upsert
incluye `organization_id` en el target del conflicto.

### G-10. `message_id UNIQUE` global vs. multi-tenant

`supabase_setup.sql:137`

El `wamid` de Meta es globalmente único, así que técnicamente funciona. Pero un actor
que conozca un `wamid` ajeno puede provocar un conflicto de upsert cruzado desde el
webhook no autenticado (ver G-05).

**Corrección:** índice único **parcial** `(message_id) WHERE message_id IS NOT NULL`
—para no romper filas de `message_logs` preexistentes sin `message_id`— más filtro de
`organization_id` en el upsert.

### G-11. El webhook devuelve 200 aunque falle la persistencia

`webhook/route.ts:125-135`: si el upsert falla, se hace `console.error` y aun así se
responde `{ received: true }`. Meta no reintenta y el evento se pierde para siempre.

**Corrección:** se responde `202 Accepted` siempre (correcto: Meta desactiva webhooks
que responden lento o con error), **pero** los fallos de persistencia se escriben en una
cola/log estructurado con el payload íntegro para reproceso. Ver `NOTAS_ROUTES.md`.

### G-12. Polling de estado sin backoff ni cancelación en servidor

`AppReviewConsole.tsx:177-194` y `CampaignComposer.tsx:113-130`: `setInterval` cada 3 s,
máximo 10 intentos → una Server Action por cada tick, por cada usuario, por cada envío.
Con volumen de ISP (cientos de abonados) esto satura.

**Corrección sugerida:** el paquete conserva el polling para la UI de envío puntual,
pero para campañas masivas usa el webhook como única fuente de verdad y refresca la
tabla con `revalidatePath` / SWR, no con polling por mensaje.

---

## 🟡 MENORES — deuda y detalles

| # | Detalle | Dónde |
|---|---|---|
| G-13 | Normalización de teléfono **hardcodeada para México** (`52` / `521`) | `utils/whatsapp.ts:65-76` → adaptar a `591` Bolivia |
| G-14 | Textos de ejemplo con dominio ajeno (`suscripta.co/pay`) | `actions/whatsapp.ts:133`, `CampaignComposer.tsx:57` |
| G-15 | `token_type` y expiración del token **nunca se guardan** ni se refrescan | `exchange-token/route.ts:75` |
| G-16 | Versión de Graph API hardcodeada `v22.0` en 2 sitios distintos | `utils/whatsapp.ts:1`, `exchange-token:48` → env var |
| G-17 | `subscribed_apps` se consulta pero nunca se suscribe automáticamente tras conectar | `actions/whatsapp.ts:573-603` — llamar a `subscribeWabaApp()` justo después del canje |
| G-18 | Sin rate limiting en el endpoint de canje ni en el webhook | todas las rutas |
| G-19 | Sin tests (deuda reconocida en `CLAUDE.md`) | proyecto entero |
| G-20 | `error_title` se escribe desde el webhook pero nunca se lee en la UI | `webhook/route.ts:91` |

---

## Resumen de lo que **sí** merece la pena copiar del origen

A pesar de la lista anterior, estas piezas están bien resueltas y van portadas íntegras:

- ✅ El patrón de reconciliación `code` + `postMessage` del Embedded Signup (G-01 del
  Embedded Signup es un problema real y la solución del origen es correcta).
- ✅ `shouldMarkConnectionInactive()`: degradar la conexión en vez de romper la página.
- ✅ La validación de plantillas previa a la llamada a Meta (6 reglas).
- ✅ El reintento con variantes de número ante `Account not registered`.
- ✅ El upsert idempotente sobre `message_id`.
- ✅ La validación HMAC del `signed_request` con `timingSafeEqual` (bien hecha).
- ✅ El canje **sin `redirect_uri`** para el flujo popup.
