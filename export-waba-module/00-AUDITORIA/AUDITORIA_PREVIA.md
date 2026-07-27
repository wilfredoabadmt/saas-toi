# 00 — Auditoría previa (OBLIGATORIA)

> **No apliques ninguna migración ni copies ningún archivo antes de completar esto.**
> El objetivo es que la implantación sea **aditiva** y **no rompa nada** de SaaS TOI.

---

## A. Ejecutar la auditoría

### Opción 1 — script (recomendada)

```bash
cp export-waba-module/00-AUDITORIA/audit-waba.ts scripts/audit-waba.ts
npx tsx scripts/audit-waba.ts > docs/waba-audit-report.txt
```

### Opción 2 — SQL manual

Ejecuta `00-AUDITORIA/audit-waba.sql` completo en tu cliente de Postgres y guarda la salida.

---

## B. Checklist manual (rellenar antes de continuar)

### B.1 Base de datos

- [ ] ¿Existe la tabla `organizations` (o el equivalente que define el tenant)?
      Nombre real: `________________`
- [ ] ¿Cómo se llama la PK de la organización? `id` / `organization_id` / otro: `________`
- [ ] ¿El tipo de `organization_id` es `uuid`, `text` o `integer`? → `________`
      **Este dato es crítico**: la migración usa `uuid` por defecto y hay que ajustarlo.
- [ ] ¿`waba_configs` ya existe? ¿Con cuántas filas? `____`
- [ ] ¿`waba_configs` ya guarda un token? ¿Cifrado o en claro? `________________`
- [ ] ¿`message_logs` ya existe y con qué se usa hoy (¿solo WhatsApp o también SMS/email)?
      `________________________________________`
- [ ] ¿Cómo se llama la columna de teléfono en `subscribers`? `phone` / `phone_number` /
      `telefono` / `celular` → `________`
- [ ] ¿Hay RLS activo en alguna de estas tablas? `Sí / No`
- [ ] ¿Existe ya un índice `UNIQUE` sobre `message_logs.message_id`? `Sí / No`

### B.2 Aplicación

- [ ] Ruta del schema de Drizzle: `________________________` (ej. `src/db/schema/index.ts`)
- [ ] Ruta del cliente de Drizzle: `________________________` (ej. `src/db/index.ts`)
- [ ] ¿Cómo se obtiene la organización del usuario autenticado en una Server Action?
      Función/patrón actual: `________________________________________`
      → **Este es el adaptador que implementarás en `03-CORE/tenant-context.ts`.**
- [ ] ¿Existe ya una utilidad AES-256-GCM? Ruta: `________________________`
      → Si existe, **reutilízala** y borra `03-CORE/crypto.ts`.
- [ ] ¿El proyecto usa App Router (`src/app/`)? `Sí / No`
      Si usa Pages Router, las rutas de `04-API-ROUTES/` deben reescribirse.
- [ ] ¿Ya hay algún endpoint `/api/webhook` o `/api/whatsapp/*` en uso? `________`
      → Si lo hay, **no lo sobreescribas**: monta el nuevo en `/api/waba/*`.

### B.3 Meta / Infraestructura

- [ ] App de Meta creada en developers.facebook.com. App ID: `________________`
- [ ] Producto **WhatsApp** añadido a la app. `Sí / No`
- [ ] **Tech Provider / Solution Partner** configurado (necesario para Embedded Signup
      multi-cliente). `Sí / No`
- [ ] Configuración de Embedded Signup creada. Config ID: `________________`
- [ ] El dominio `saas-toi-ssd.89.116.29.168.sslip.io` está en **App Domains**
      y en **Valid OAuth Redirect URIs**. `Sí / No`
      ⚠️ Meta suele rechazar dominios `sslip.io` / basados en IP para App Review.
      **Ver la nota de bloqueo abajo.**
- [ ] HTTPS válido y accesible públicamente (Meta debe poder hacer POST al webhook).
      `Sí / No`

---

## C. ⚠️ Bloqueo probable: el dominio

`https://saas-toi-ssd.89.116.29.168.sslip.io/` es un dominio *wildcard DNS sobre IP*.
En la práctica:

| Etapa | ¿Funciona con sslip.io? |
|---|---|
| Desarrollo / pruebas internas | Sí, normalmente |
| Webhook de Meta | Sí, si el TLS es válido |
| Embedded Signup en modo Dev | Suele funcionar |
| **App Review de Meta** | **Habitualmente NO** |
| **Business Verification** | **NO** — exige dominio propio verificable |

**Recomendación:** apunta un dominio propio (`app.saastoi.com`, `toi.bo`, etc.) al mismo
Coolify antes de solicitar permisos avanzados. El módulo no necesita cambios: todo se
resuelve con `NEXT_PUBLIC_APP_URL`. Hazlo antes de grabar el screencast de review.

Esto no bloquea la implementación técnica — sí bloquea la aprobación final de Meta.

---

## D. Plantilla del reporte (rellenar y entregar al agente implementador)

```
=== REPORTE DE AUDITORÍA WABA — SaaS TOI ===
Fecha: ____________________

TENANT
  tabla de organización : ______________
  columna tenant        : organization_id
  tipo                  : uuid | text | integer

TABLAS
  organizations : existe / no existe
  waba_configs  : existe / no existe  — filas: ____
  message_logs  : existe / no existe  — filas: ____
  subscribers   : existe / no existe  — filas: ____

COLUMNAS QUE FALTAN
  waba_configs : ______________________________________
  message_logs : ______________________________________

COLUMNAS CON NOMBRE DISTINTO (alias a mapear en column-map.ts)
  ______________________________________________________

ÍNDICE UNIQUE message_logs.message_id : sí / no
RLS activo                             : sí / no

RUTAS DEL PROYECTO
  drizzle schema  : ______________________
  drizzle client  : ______________________
  auth/tenant fn  : ______________________
  crypto util     : ______________________ (o "no existe")

ENV FALTANTES
  ______________________________________________________

DECISIÓN
  [ ] Aplicar migration.sql tal cual
  [ ] Aplicar migration.sql con ajustes: ____________________
  [ ] Solo mapear columnas existentes (no hace falta migrar)
```

---

## E. Regla de oro

> Si una columna ya existe con otro nombre → **mapéala en `03-CORE/column-map.ts`**.
> Si no existe en absoluto → **añádela con `02-DB-DRIZZLE/migration.sql`**.
> **Nunca renombres ni borres una columna existente de SaaS TOI.**
