# Módulo WABA (Meta WhatsApp Business) — Paquete de Portabilidad

Paquete extraído del SaaS **Suscripta / SaaS TOI (Next.js + Supabase)** y reescrito para
implantarse en **SaaS TOI ISP** (`https://saas-toi-ssd.89.116.29.168.sslip.io/`) usando
**Drizzle ORM**, las tablas existentes `waba_configs`, `message_logs`, `subscribers` y
aislamiento multi-tenant por `organization_id`.

---

## ⚠️ Lee esto primero

1. **Nada de este paquete se aplica a ciegas.** El paso `00-AUDITORIA` es obligatorio.
   No conozco el esquema real de tu base de datos; todo el código viene con
   **verificación de existencia** (columnas, tablas, índices, env vars) y un
   **mapa de columnas centralizado** para adaptarlo sin tocar la lógica.
2. **Todas las migraciones SQL son idempotentes y aditivas** (`IF NOT EXISTS`,
   `DO $$ ... $$`). Ninguna hace `DROP`, `ALTER TYPE` destructivo ni renombra columnas.
3. **El módulo origen tiene fallos de aislamiento multi-tenant conocidos.**
   Están documentados en `01-REFERENCIA-ORIGEN/GOTCHAS.md` y **ya vienen corregidos**
   en el código de este paquete. No copies el original tal cual.

---

## Orden de implementación

| # | Carpeta | Qué hacer | Bloqueante |
|---|---|---|---|
| 0 | `00-AUDITORIA/` | Ejecutar auditoría de esquema y de entorno. Rellenar el reporte. | ✅ Sí |
| 1 | `01-REFERENCIA-ORIGEN/` | Leer para entender el flujo y los errores a evitar. | Lectura |
| 2 | `02-DB-DRIZZLE/` | Aplicar `migration.sql` y reconciliar `schema.waba.ts`. | ✅ Sí |
| 3 | `03-CORE/` | Copiar `src/lib/waba/*`. Implementar los 2 adaptadores marcados. | ✅ Sí |
| 4 | `04-API-ROUTES/` | Copiar las 3 rutas. Configurar webhook en Meta. | ✅ Sí |
| 5 | `05-SERVER-ACTIONS/` | Copiar acciones de servidor. | ✅ Sí |
| 6 | `06-UI/` | Copiar componentes y adaptarlos a tu design system. | Opcional* |
| 7 | `07-ENV-Y-META/` | Variables de entorno + configuración en Meta Developers. | ✅ Sí |
| 8 | `08-QA/` | Checklist de verificación y guía de App Review. | ✅ Sí |

\* El botón de Embedded Signup **sí** es obligatorio si quieres el flujo de conexión
automática. La landing indica que ya ofreces "credenciales propias del Meter Developer
Console" como alternativa manual — ambas rutas conviven, ver `05-SERVER-ACTIONS/`.

---

## Contenido

```
export-waba-module/
├── README.md                      ← este archivo
├── PROMPT.md                      ← ⭐ el prompt para el agente que implementa
│
├── 00-AUDITORIA/
│   ├── AUDITORIA_PREVIA.md        ← checklist manual + plantilla de reporte
│   ├── audit-waba.sql             ← consulta de introspección (psql / Studio)
│   └── audit-waba.ts              ← script ejecutable (tsx) que imprime el reporte
│
├── 01-REFERENCIA-ORIGEN/
│   ├── ARQUITECTURA_WABA_ORIGEN.md ← análisis exhaustivo del módulo original
│   ├── GOTCHAS.md                  ← 20 fallos reales encontrados y su corrección
│   ├── BLUEPRINT_TECH_PROVIDER.md  ← guía de validación como Tech Provider (origen)
│   └── META_APP_REVIEW_ORIGEN.md   ← post-mortem del rechazo real de Meta
│
├── 02-DB-DRIZZLE/
│   ├── migration.sql              ← SQL idempotente (ADD COLUMN IF NOT EXISTS)
│   ├── schema.waba.ts             ← definición Drizzle a reconciliar
│   └── NOTAS_MIGRACION.md
│
├── 03-CORE/                       → src/lib/waba/
│   ├── column-map.ts              ← ⭐ punto único de adaptación de nombres
│   ├── graph-client.ts            ← cliente Meta Graph API v22.0 + errores tipados
│   ├── crypto.ts                  ← AES-256-GCM para el access token
│   ├── phone.ts                   ← normalización E.164 + candidatos
│   ├── templates.ts               ← validación de plantillas (reglas de Meta)
│   ├── tenant-context.ts          ← 🔌 ADAPTADOR: tu auth → organization_id
│   └── waba.repository.ts         ← acceso Drizzle scoped por organization_id
│
├── 04-API-ROUTES/                 → src/app/api/waba/
│   ├── exchange-token.route.ts
│   ├── webhook.route.ts           ← con validación HMAC X-Hub-Signature-256
│   ├── deauthorize.route.ts
│   └── NOTAS_ROUTES.md
│
├── 05-SERVER-ACTIONS/             → src/app/actions/
│   ├── waba.actions.ts            ← conexión, perfil, envío, estado
│   └── templates.actions.ts       ← listar / crear plantillas
│
├── 06-UI/                         → src/components/waba/
│   ├── EmbeddedSignupButton.tsx   ← el flujo difícil: code + postMessage
│   ├── WabaConnectionPanel.tsx    ← Server Component, 4 estados
│   └── WabaConnectionActions.tsx  ← Client Component, prueba de envío
│
├── 07-ENV-Y-META/
│   ├── env.waba.example
│   └── CONFIG_META_DEVELOPERS.md
│
└── 08-QA/
    ├── CHECKLIST_QA.md
    └── APP_REVIEW_META.md
```

---

## Principios de diseño de este port

- **Cero suposiciones sobre tu esquema.** Si tu `waba_configs` ya usa
  `encrypted_token` en vez de `access_token_encrypted`, cambias **una línea** en
  `02-DB-DRIZZLE/schema.waba.ts` (`text('encrypted_token')`) y todo el módulo sigue
  funcionando. `03-CORE/column-map.ts` documenta qué columnas se usan y centraliza
  la configuración y validación de entorno.
- **Token cifrado en reposo.** Tu landing declara AES-256-GCM; el módulo lo respeta y
  reutiliza tu utilidad si ya existe (`crypto.ts` tiene un shim documentado).
- **`organization_id` en cada consulta.** Ninguna función del repositorio acepta una
  consulta sin tenant. El webhook resuelve el tenant desde `phone_number_id`.
- **Fail-safe, no fail-open.** Si falta una env var o una columna, el módulo se
  desactiva con un error explícito en vez de operar sobre datos de otro tenant.
- **Sin dependencias nuevas.** Solo `drizzle-orm`, `node:crypto` y `fetch` nativo.
  `libphonenumber-js` es opcional (hay fallback sin librería).
