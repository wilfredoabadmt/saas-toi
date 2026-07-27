# 04 — Notas de las rutas API

## Ubicación de los archivos

| Archivo del paquete | Destino en SaaS TOI |
|---|---|
| `exchange-token.route.ts` | `src/app/api/waba/exchange-token/route.ts` |
| `webhook.route.ts` | `src/app/api/waba/webhook/route.ts` |
| `deauthorize.route.ts` | `src/app/api/waba/deauthorize/route.ts` |

**Verifica antes de copiar** que no exista ya algo en `src/app/api/whatsapp/` o
`src/app/api/webhook/`. Si lo hay, no lo sobreescribas: el namespace `/api/waba/`
es deliberadamente distinto para poder convivir.

```bash
ls -R src/app/api | grep -iE 'whats|waba|webhook|meta'
```

## URLs públicas resultantes

```
POST https://saas-toi-ssd.89.116.29.168.sslip.io/api/waba/exchange-token
GET  https://saas-toi-ssd.89.116.29.168.sslip.io/api/waba/webhook       (verificación)
POST https://saas-toi-ssd.89.116.29.168.sslip.io/api/waba/webhook       (eventos)
GET  https://saas-toi-ssd.89.116.29.168.sslip.io/api/waba/deauthorize
POST https://saas-toi-ssd.89.116.29.168.sslip.io/api/waba/deauthorize
```

## El webhook debe quedar FUERA del middleware de auth

Meta llama sin cookies. Si tu middleware protege `/api/*`, el webhook devolverá
401 y Meta lo desactivará tras varios fallos.

```ts
// src/middleware.ts
export const config = {
    matcher: [
        '/((?!api/waba/webhook|api/waba/deauthorize|_next/static|_next/image|favicon.ico).*)',
    ],
};
```

Verifica sin sesión:

```bash
curl -i "https://saas-toi-ssd.89.116.29.168.sslip.io/api/waba/webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=test123"
# Esperado: HTTP 200, body exactamente "test123", Content-Type: text/plain
```

Si devuelve JSON, una redirección o un 401 → el middleware está interceptando.

## Por qué el webhook siempre responde 200

Meta desactiva un webhook que devuelve errores de forma sostenida, y **no
reintenta** los eventos perdidos. Por eso:

- Firma inválida → **401** (es lo correcto: no es Meta quien llama).
- Cualquier otro fallo → **200** + registro en `waba_webhook_deadletter`.

El dead-letter es lo que hace segura esa decisión: nada se pierde. Reprocesa con:

```ts
// scripts/reprocess-waba-deadletters.ts
import { listPendingDeadletters, markDeadlettersProcessed } from '@/lib/waba/waba.repository';

const pending = await listPendingDeadletters(200);
for (const item of pending) {
    console.log(item.reason, item.phoneNumberId, item.payload);
    // reintenta la lógica de ingesta con item.payload
}
await markDeadlettersProcessed(pending.map((p) => p.id));
```

Revísalo periódicamente: `unknown_tenant` recurrente significa que un número
conectado en Meta no está en `waba_configs`.

## Rendimiento del webhook

El handler hace un lookup a DB por `phone_number_id` y otro por evento entrante
para casar el abonado. Con volumen de ISP conviene:

1. Cachear `phone_number_id → connection` en memoria con TTL de 60 s.
2. Si el POST trae >50 eventos, encolar y responder de inmediato.

Umbral orientativo: si `processed` supera ~100 por petición de forma habitual,
implementa la cola.

## Rate limiting

`exchange-token` usa un `Map` en memoria. **Si escalas a más de una instancia en
Coolify, eso no sirve**: cada réplica tiene su propio contador. Sustitúyelo por
Redis o por el rate limiter que ya uses.

El webhook no lleva rate limit a propósito: la validación de firma ya cierra la
puerta y limitar el tráfico de Meta provocaría pérdida de eventos.

## Ruta opcional: callback OAuth por redirect

El origen tiene además `/oauth/callback` para el flujo con redirección (en vez
del popup). **No hace falta** si usas Embedded Signup con popup, que es lo
recomendado. Si lo necesitas, la única diferencia es que sí debes enviar
`redirect_uri` en el canje, y debe coincidir **exactamente** con lo registrado
en Meta Developers.

## Comprobaciones rápidas

```bash
# 1. Verificación del webhook (debe devolver el challenge en texto plano)
curl -s "https://TU_DOMINIO/api/waba/webhook?hub.mode=subscribe&hub.verify_token=$TOKEN&hub.challenge=abc"

# 2. Webhook sin firma → debe devolver 401
curl -i -X POST https://TU_DOMINIO/api/waba/webhook \
     -H 'Content-Type: application/json' -d '{"object":"whatsapp_business_account"}'

# 3. Webhook con firma válida → debe devolver 200
BODY='{"object":"whatsapp_business_account","entry":[]}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$META_APP_SECRET" | sed 's/^.* //')
curl -i -X POST https://TU_DOMINIO/api/waba/webhook \
     -H 'Content-Type: application/json' \
     -H "X-Hub-Signature-256: sha256=$SIG" -d "$BODY"

# 4. Deauthorize sin firma → debe devolver 400 (NO debe borrar nada)
curl -i -X POST https://TU_DOMINIO/api/waba/deauthorize
```

Las cuatro deben pasar antes de solicitar App Review.
