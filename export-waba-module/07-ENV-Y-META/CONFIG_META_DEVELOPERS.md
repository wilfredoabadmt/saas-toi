# 07 — Configuración en Meta Developers

Guía paso a paso para dejar la app de Meta lista para SaaS TOI.

---

## ⚠️ Antes de empezar: el dominio

`saas-toi-ssd.89.116.29.168.sslip.io` es un dominio wildcard-DNS sobre IP.

| Etapa | ¿Sirve? |
|---|---|
| Desarrollo y pruebas | Sí |
| Webhook de Meta | Sí, si el TLS es válido |
| Embedded Signup en modo Desarrollo | Normalmente sí |
| **App Review** | **Habitualmente NO** |
| **Verificación del negocio** | **NO** |

**Consigue un dominio propio antes de solicitar permisos avanzados.** Apunta,
por ejemplo, `app.saastoi.bo` al mismo Coolify. El módulo no cambia: solo
actualizas `NEXT_PUBLIC_APP_URL` y las URLs en Meta.

---

## 1. Crear la app

1. https://developers.facebook.com/apps → **Crear app**
2. Caso de uso: **Otro** → Tipo: **Empresa**
3. Vincula el Business Manager de TELECOMUNICACIONES OPORTUNAS INTELIGENTES S.R.L.

## 2. Añadir el producto WhatsApp

Panel → **Agregar producto** → **WhatsApp** → Configurar.

Anota de la pantalla de inicio:
- **App ID** → `NEXT_PUBLIC_META_APP_ID`
- **App Secret** (Configuración → Básica → Mostrar) → `META_APP_SECRET`

## 3. Configuración básica

| Campo | Valor |
|---|---|
| Dominios de la app | `saas-toi-ssd.89.116.29.168.sslip.io` |
| URL de política de privacidad | `https://<dominio>/privacy` |
| URL de condiciones del servicio | `https://<dominio>/terms` |
| **Deauthorize Callback URL** | `https://<dominio>/api/waba/deauthorize` |
| **Data Deletion Request URL** | `https://<dominio>/api/waba/deauthorize` |
| Categoría | Empresas y páginas |

Las dos últimas son **obligatorias** para App Review. El módulo las implementa.

## 4. Facebook Login for Business

Producto → **Facebook Login for Business** → Configuración:

- Inicio de sesión con OAuth del cliente: **Sí**
- Inicio de sesión con OAuth web: **Sí**
- **URIs de redireccionamiento OAuth válidos**:
  `https://<dominio>/api/waba/exchange-token`
  `https://<dominio>/oauth/callback` *(solo si usas el flujo redirect)*

> Con el flujo popup el `redirect_uri` no se envía en el canje, pero Meta exige
> igualmente que el dominio esté registrado.

## 5. Configuración de Embedded Signup

WhatsApp → **Embedded Signup** → Crear configuración:

| Campo | Valor |
|---|---|
| Nombre | `SaaS TOI - Onboarding ISP` |
| Tipo de acceso | **Business integration** |
| Permisos | `whatsapp_business_management`, `whatsapp_business_messaging` |
| Assets | WhatsApp Business Account |

Copia el **Configuration ID** → `NEXT_PUBLIC_META_CONFIG_ID`.

## 6. Webhook

WhatsApp → **Configuración** → Webhooks → Editar:

| Campo | Valor |
|---|---|
| URL de devolución de llamada | `https://<dominio>/api/waba/webhook` |
| Token de verificación | el valor de `META_WEBHOOK_VERIFY_TOKEN` |

Pulsa **Verificar y guardar**. Si falla:

- ¿Responde el GET en texto plano? → `curl` de `NOTAS_ROUTES.md`
- ¿El middleware está bloqueando `/api/waba/webhook`?
- ¿El certificado TLS es válido? Meta rechaza los autofirmados.

Después, **suscríbete al campo `messages`**. Sin esa suscripción no llega nada.

## 7. Permisos y App Review

Requiere:

- `whatsapp_business_management` — leer perfil del número y plantillas
- `whatsapp_business_messaging` — enviar mensajes

En modo Desarrollo funcionan con números de prueba y con los administradores de
la app. Para clientes reales hace falta App Review. Ver `08-QA/APP_REVIEW_META.md`.

## 8. Tech Provider (para el modelo SaaS multi-cliente)

Si cada organización conecta su propio número, necesitas ser **Tech Provider**:

1. Business Manager → Configuración → **Solicitudes de socio**
2. Solicita el rol de Tech Provider para WhatsApp
3. Requiere verificación del negocio (NIT 305020028 — documentación boliviana)

Sin esto solo puedes gestionar números de tu propio Business Manager, no los de
tus clientes ISP.

---

## Resumen de URLs a registrar

```
Dominio de la app        : saas-toi-ssd.89.116.29.168.sslip.io
Redirect OAuth           : https://<dominio>/api/waba/exchange-token
Webhook                  : https://<dominio>/api/waba/webhook
Deauthorize callback     : https://<dominio>/api/waba/deauthorize
Data deletion request    : https://<dominio>/api/waba/deauthorize
Política de privacidad   : https://<dominio>/privacy
Condiciones del servicio : https://<dominio>/terms
```

---

## Errores frecuentes

| Error de Meta | Causa | Solución |
|---|---|---|
| `verification code mismatch` | Se envió `redirect_uri` en el canje del flujo popup | No lo envíes (ya está resuelto en `graph-client.ts`) |
| `Invalid OAuth access token` | App Secret incorrecto o token de otra app | Verifica `META_APP_SECRET` |
| `(#200) Requires whatsapp_business_management` | Permiso no concedido | Revisa el config de Embedded Signup |
| El webhook no verifica | Middleware bloqueando, o token distinto | Ver `NOTAS_ROUTES.md` |
| No llegan estados de entrega | La app no está suscrita al WABA | `retryWebhookSubscription()` |
| `Account not registered` (131026) | El destinatario no tiene WhatsApp, o formato del número | `buildPhoneCandidates` ya prueba variantes |
| `Template name does not exist` | La plantilla no está aprobada o el idioma no coincide | Solo se envían plantillas APPROVED |
| `(#131047) Re-engagement message` | Fuera de la ventana de 24 h | Usa una plantilla, no texto libre |
