# PROMPT — Implementar el módulo WABA en SaaS TOI

> Copia el bloque de abajo íntegro y pásaselo al agente (Claude Code, Cursor, etc.)
> que trabaje **dentro del repositorio de SaaS TOI**, con esta carpeta
> `export-waba-module/` colocada en la raíz del proyecto.
>
> Si prefieres ir por fases, usa los prompts cortos del final.

---

## ⬇️ PROMPT PRINCIPAL — copiar desde aquí ⬇️

````
# TAREA

Implementa el módulo de conexión con Meta WhatsApp Business (WABA) en este SaaS,
usando como fuente el paquete que está en `export-waba-module/`.

Ese paquete es una extracción de un módulo WABA en producción (Next.js + Supabase),
ya reescrito para este proyecto: Drizzle ORM y aislamiento multi-tenant por
`organization_id`. Incluye código listo para copiar, migraciones SQL idempotentes
y documentación de los fallos del módulo original que NO debemos heredar.

# CONTEXTO DEL PROYECTO

- SaaS multi-tenant de cobranza y operación para ISPs (SaaS TOI, Bolivia).
- Módulos existentes: abonados, facturación, MikroTik RouterOS, tickets, Chat Inbox.
- ORM: **Drizzle**. Base de datos: PostgreSQL.
- Aislamiento de tenants: columna **`organization_id`** en todas las tablas.
- Tablas relevantes que YA EXISTEN: `waba_configs`, `message_logs`, `subscribers`,
  `organizations`.
- Credenciales cifradas en reposo con **AES-256-GCM**.

# REGLAS INNEGOCIABLES

1. **NO ROMPAS NADA.** El SaaS está en producción. Todo cambio es aditivo.
   Prohibido: `DROP COLUMN`, `DROP TABLE`, `RENAME`, cambiar tipos de columnas
   existentes, modificar tablas fuera del alcance de esta tarea.

2. **VERIFICA ANTES DE ACTUAR.** No asumas ningún nombre de tabla, columna,
   ruta o función. Antes de escribir código, inspecciona el repositorio y la
   base de datos y confirma lo que hay. Si algo no coincide con lo que espera
   el paquete, **adapta el paquete al proyecto**, nunca al revés.

3. **`organization_id` EN TODAS LAS CONSULTAS.** Ninguna función de acceso a
   datos puede consultar `waba_configs` o `message_logs` sin filtrar por
   organización. Solo hay tres excepciones permitidas, todas ya documentadas en
   la cabecera de `waba.repository.ts`: `resolveConnectionByPhoneNumberId()` y
   `findConnectionsByMetaUserId()` (los callbacks de Meta descubren el tenant,
   no lo reciben) y las funciones de la tabla `waba_webhook_deadletter`. Si
   creas una cuarta, está mal.

4. **NADA DE FALLBACKS DE TENANT.** Si no se puede resolver la organización,
   lanza `UnauthorizedError`. Nunca uses "la primera organización", "la conexión
   más reciente" ni ningún valor por defecto. El módulo original tenía ese
   fallback y era una fuga de datos entre empresas.

5. **EL TOKEN VA CIFRADO.** El access token de WhatsApp nunca se guarda en
   claro, nunca se devuelve al cliente y nunca aparece en un log.

6. **RESPETA LO EXISTENTE.** Si una columna, endpoint o utilidad ya existe con
   otro nombre, mapéala; no la dupliques ni la sustituyas.

# ORDEN DE TRABAJO

## Paso 1 — AUDITORÍA (obligatorio, antes de escribir nada)

Lee `export-waba-module/00-AUDITORIA/AUDITORIA_PREVIA.md` y ejecútala.

Debes producir un informe con:
- Esquema real de `waba_configs`, `message_logs`, `subscribers`, `organizations`
- Tipo exacto de `organization_id` (uuid / text / integer)
- Qué columnas requeridas faltan y cuáles existen con otro nombre
- Nombre real de la columna de teléfono en `subscribers`
- Si existe un índice UNIQUE sobre `message_logs.message_id`
- Rutas reales de: schema de Drizzle, cliente de Drizzle, utilidad de cifrado
- Cómo se obtiene la organización del usuario en una Server Action (código real)
- Rutas API ya existentes que puedan colisionar con `/api/waba/*`
- Qué variables de entorno del módulo ya están definidas

**PARA AQUÍ y muéstrame el informe antes de continuar.** No apliques ninguna
migración hasta que yo lo apruebe.

## Paso 2 — Base de datos

- Aplica `export-waba-module/02-DB-DRIZZLE/migration.sql`, ajustado según la
  auditoría. Es idempotente y aditiva: revísala pero no la hagas destructiva.
- Reporta todos los NOTICE y WARNING que emita.
- **Fusiona** los campos de `02-DB-DRIZZLE/schema.waba.ts` dentro de las
  definiciones de Drizzle que ya existen. NO reemplaces mis tablas.
- Ejecuta `drizzle-kit generate` y **enséñame el SQL antes de aplicarlo**. Si
  propone cualquier DROP o ALTER TYPE, para y corrige el schema.

## Paso 3 — Núcleo

Copia a `src/lib/waba/` (ajusta la ruta a la convención del proyecto):
`column-map.ts`, `crypto.ts`, `graph-client.ts`, `phone.ts`, `templates.ts`,
`tenant-context.ts`, `waba.repository.ts`.

Después:
- **Implementa `getTenantContext()`** en `tenant-context.ts` con el sistema de
  sesión real de este proyecto (lo identificaste en la auditoría). Es el único
  archivo que hay que escribir de cero.
- Si ya existe una utilidad AES-256-GCM en el proyecto, **borra `crypto.ts`** y
  deja el shim que delega en ella.
- Ajusta los imports de `db` y del schema a las rutas reales.
- Ajusta `findSubscriberByPhone()` y `listRemindableSubscribers()` a las
  columnas reales de `subscribers` y a la lógica de negocio real (estado de
  pago, servicio suspendido, etc.).

## Paso 4 — Rutas API

Copia a `src/app/api/waba/`: `exchange-token`, `webhook`, `deauthorize`.

- Verifica que no colisionan con rutas existentes.
- **Excluye `/api/waba/webhook` y `/api/waba/deauthorize` del middleware de
  auth**: Meta llama sin cookies.
- Comprueba los 4 curl de `04-API-ROUTES/NOTAS_ROUTES.md`.

## Paso 5 — Server Actions

Copia `waba.actions.ts` y `templates.actions.ts` a la carpeta de acciones del
proyecto. Ajusta imports y `revalidatePath` a las rutas reales del dashboard.

## Paso 6 — Interfaz

Copia los componentes de `06-UI/` a `src/components/waba/` y **adáptalos al
design system de este proyecto** (no dejes las clases Tailwind genéricas si
tenemos componentes propios de Card, Badge, Button, Input).

Monta `WabaConnectionPanel` en la pantalla de Configuración → Integraciones.

## Paso 7 — Entorno

Añade a `.env.example` las variables de `07-ENV-Y-META/env.waba.example`,
sin tocar las que ya existan. Dime exactamente qué debo configurar en Coolify
y qué debo registrar en Meta Developers.

## Paso 8 — Verificación

Ejecuta el checklist de `08-QA/CHECKLIST_QA.md`. Las fases 1 (regresión),
2 (multi-tenant) y 3 (seguridad) son bloqueantes: si alguna falla, corrígela
antes de darme el trabajo por terminado.

# CÓMO QUIERO QUE TRABAJES

- Para en el Paso 1 y espera mi aprobación. Después de eso, avanza de forma
  continua, informando al terminar cada paso.
- Cuando el paquete y el proyecto discrepen, **gana el proyecto**. Documenta la
  adaptación en un comentario.
- Si algo del paquete no se puede aplicar, no lo omitas en silencio: dímelo con
  el motivo y propón una alternativa.
- No añadas dependencias nuevas. El módulo solo necesita `drizzle-orm`,
  `node:crypto` y `fetch`.
- No escribas tests si el proyecto no tiene infraestructura de tests; en su
  lugar, entrégame los comandos de verificación manual.
- Lee `01-REFERENCIA-ORIGEN/GOTCHAS.md` antes de escribir código: documenta 12
  fallos reales del módulo original (fugas entre tenants, webhook sin firma,
  token en claro, CSRF en el deauthorize). El paquete ya los corrige — no los
  reintroduzcas al adaptar.

# ENTREGABLE FINAL

1. Informe de auditoría con lo que había y lo que se cambió
2. Lista de archivos creados y modificados
3. SQL aplicado y su salida
4. Lo que debo configurar yo (Coolify + Meta Developers)
5. Resultado del checklist de QA, fase por fase
6. Cualquier cosa que quedara pendiente y por qué
````

## ⬆️ hasta aquí ⬆️

---

## Prompts por fases (alternativa)

Si prefieres controlar más de cerca, usa estos en secuencia. Cada uno asume que
el anterior ya está hecho.

### Fase 1 — Solo auditoría

```
Lee `export-waba-module/00-AUDITORIA/AUDITORIA_PREVIA.md` y ejecuta la auditoría
completa de este proyecto (esquema de base de datos, estructura de código y
variables de entorno) para preparar la implantación de un módulo de WhatsApp
Business.

NO modifiques ningún archivo ni ninguna tabla. Solo inspecciona y reporta,
usando la plantilla de la sección D de ese documento.

Presta especial atención a:
- el tipo exacto de organization_id
- el nombre real de la columna de teléfono en subscribers
- si message_logs ya se usa para otros canales además de WhatsApp
- cómo se obtiene la organización del usuario en una Server Action
- si ya existe una utilidad AES-256-GCM
```

### Fase 2 — Base de datos

```
Con el informe de auditoría anterior, aplica la migración de base de datos del
módulo WABA:

1. Revisa `export-waba-module/02-DB-DRIZZLE/migration.sql` y ajústalo a lo que
   encontró la auditoría. Debe seguir siendo idempotente y aditivo: sin DROP,
   sin RENAME, sin cambios de tipo.
2. Enséñame el SQL final ANTES de ejecutarlo.
3. Ejecútalo y reporta todos los NOTICE y WARNING.
4. Fusiona los campos de `schema.waba.ts` dentro de mis definiciones de Drizzle
   existentes, conservando todas mis columnas.
5. Ejecuta drizzle-kit generate y enséñame el diff antes de aplicar nada.

Requisito crítico: debe quedar un índice UNIQUE (parcial) sobre
message_logs.message_id. Sin él, el webhook de Meta duplicará filas.
```

### Fase 3 — Núcleo y aislamiento

```
Implanta el núcleo del módulo WABA desde `export-waba-module/03-CORE/`.

Lo más importante: implementa `getTenantContext()` en `tenant-context.ts`
conectándola al sistema de sesión real de este proyecto. Debe LANZAR
UnauthorizedError si no hay organización; nunca devolver un valor por defecto.

Adapta también:
- las rutas de import de `db` y del schema
- findSubscriberByPhone() y listRemindableSubscribers() a las columnas reales
  de subscribers y a nuestra lógica de negocio
- si ya tenemos una utilidad AES-256-GCM, borra crypto.ts y deja el shim

Verifica al terminar que NINGUNA función de waba.repository.ts consulta
waba_configs o message_logs sin filtrar por organization_id, salvo
resolveConnectionByPhoneNumberId(), que es la excepción documentada del webhook.
```

### Fase 4 — Rutas API

```
Implanta las rutas de `export-waba-module/04-API-ROUTES/` en src/app/api/waba/.

Antes: comprueba que no colisionan con rutas existentes.
Después: excluye /api/waba/webhook y /api/waba/deauthorize del middleware de
autenticación (Meta llama sin cookies) y ejecuta las 4 comprobaciones curl de
NOTAS_ROUTES.md.

Las tres deben cumplirse:
- webhook sin firma → 401
- webhook con firma válida → 200
- deauthorize sin signed_request → 400 y sin borrar nada
```

### Fase 5 — Acciones e interfaz

```
Implanta las Server Actions de `export-waba-module/05-SERVER-ACTIONS/` y los
componentes de `06-UI/`.

Adapta los componentes a nuestro design system: sustituye las primitivas
genéricas (Card, Badge, Field, Metric, Input) por las nuestras.

Monta WabaConnectionPanel en Configuración → Integraciones.
```

### Fase 6 — QA

```
Ejecuta el checklist de `export-waba-module/08-QA/CHECKLIST_QA.md` completo.

Las fases 1 (regresión), 2 (aislamiento multi-tenant) y 3 (seguridad) son
bloqueantes. Para la fase 2 necesitarás dos organizaciones de prueba con
conexiones distintas: verifica explícitamente que ninguna ve los datos de la
otra.

Repórtame el resultado casilla por casilla, y corrige lo que falle.
```

---

## Prompt para extender el módulo más adelante

Cuando el módulo ya esté implantado y quieras añadir funcionalidad:

```
Amplía el módulo WABA de este proyecto con [FUNCIONALIDAD].

Restricciones del módulo:
- Drizzle ORM sobre las tablas existentes waba_configs, message_logs, subscribers
- Aislamiento multi-tenant obligatorio por organization_id en TODA consulta
- El access token se lee siempre a través de waba.repository.ts, que lo descifra;
  nunca accedas a la columna directamente
- Toda llamada a Meta pasa por src/lib/waba/graph-client.ts (versión de la API,
  timeouts y errores tipados ya centralizados)
- Los nombres de tabla y columna se resuelven en src/lib/waba/column-map.ts
- Las Server Actions devuelven ActionResult<T>, no lanzan
- El tenant se resuelve con getTenantContext(); jamás se acepta organization_id
  como parámetro de una acción

Antes de escribir código, verifica que las columnas y funciones que vas a usar
existen. Si falta algo, propón una migración aditiva e idempotente.
```
