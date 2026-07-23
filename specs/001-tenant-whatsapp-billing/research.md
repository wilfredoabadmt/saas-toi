# Research: 001-tenant-whatsapp-billing

**Date**: 2026-07-23
**Feature**: [spec.md](spec.md) | [plan.md](plan.md)

## DV-001: Framework Full-Stack — Next.js App Router vs Separate Backend

**Decision**: Next.js 15 App Router (full-stack, API routes como backend)

**Rationale**: El producto es un SaaS web con panel de administración. Next.js App
Router unifica frontend y backend en un solo deploy, simplifica la infraestructura
(un solo contenedor Docker), y ofrece SSR para el panel. Los API routes manejan las
rutas REST y webhooks. Para v1 con ~50 ISPs, no necesitamos microservicios.

**Alternatives considered**:
- **Separate Express/Fastify backend + Vite frontend**: Más control sobre el backend
  pero duplica infra (2 contenedores, 2 deploys, CORS). Innecesario para v1.
- **Hono / ElysiaJS**: Muy ligeros pero menos ecosistema. Next.js tiene más madurez
  y soporte de Vercel/comunidad para SSR.

---

## DV-002: ORM — Drizzle vs Prisma vs Kysely

**Decision**: Drizzle ORM + Drizzle Kit

**Rationale**: Drizzle tiene tipado más preciso con TypeScript estricto
(`noUncheckedIndexedAccess`), genera SQL predecible, y el schema-first approach
facilita auditar que toda tabla tiene `organization_id`. Drizzle Kit genera
migraciones SQL explícitas revisables en PR. Performance cercana a SQL crudo.

**Alternatives considered**:
- **Prisma**: Genera un client propio (no SQL directo), el tipado con
  `noUncheckedIndexedAccess` genera friction. El query engine binario añade peso al
  Docker. Popular pero más opaco.
- **Kysely**: Excelente tipado pero no tiene schema declaration ni migraciones
  integradas — requiere herramienta adicional.

---

## DV-003: Cifrado de Tokens WABA — AES-256-GCM

**Decision**: Node.js built-in `crypto` module con AES-256-GCM

**Rationale**: AES-256-GCM es el estándar de cifrado autenticado (confidencialidad +
integridad). Node.js lo implementa nativamente sin dependencias externas. La clave
de cifrado (`ENCRYPTION_KEY`) se almacena como variable de entorno (32 bytes en hex).
Cada token se cifra con un IV único (12 bytes random) y se almacena como
`iv:authTag:ciphertext` en la columna de la DB.

**Formato de almacenamiento**: `base64(iv):base64(authTag):base64(ciphertext)`

**Consideraciones de rotación**: En v1, la rotación de clave requiere re-cifrar
todos los tokens. Un campo `key_version` en la tabla permite soportar rotación
gradual en el futuro.

**Alternatives considered**:
- **libsodium (sodium-native)**: Más ergonómico pero añade una dependencia nativa
  con compilación. Node.js crypto es suficiente.
- **AWS KMS / Google Cloud KMS**: Overhead de llamada remota para cada
  encrypt/decrypt. Innecesario para v1 self-hosted.

---

## DV-004: Verificación de Webhook — HMAC-SHA256

**Decision**: Verificación síncrona de `X-Hub-Signature-256` con `crypto.timingSafeEqual`

**Rationale**: Meta firma cada webhook POST con HMAC-SHA256 usando el `app_secret`
como clave. El endpoint calcula el HMAC del body crudo y lo compara con el header
usando `timingSafeEqual` (constant-time) para prevenir timing attacks.

**Flujo**:
1. Leer body como buffer crudo (no parsear JSON antes de verificar).
2. Calcular `HMAC-SHA256(app_secret, raw_body)`.
3. Comparar con el valor de `X-Hub-Signature-256` (sin el prefijo `sha256=`).
4. Si no coincide → `401 Unauthorized` (no procesar).
5. Si coincide → parsear JSON y continuar.

**Nota sobre Next.js**: Las API routes de Next.js parsean el body automáticamente.
Se necesita configurar `export const config = { api: { bodyParser: false } }` (Pages
Router) o usar `request.text()` / `request.arrayBuffer()` en App Router para obtener
el body crudo.

---

## DV-005: Deduplicación de Webhooks — Estrategia por `wamid`

**Decision**: Tabla `processed_webhook_events` con `event_id` (wamid) como clave
única + lookup antes de procesar

**Rationale**: Meta reintenta webhooks hasta 7 veces en 72h. El `wamid` es único
por mensaje. Antes de procesar, se busca el `event_id` en la tabla. Si existe →
`200 OK` sin procesar. Si no → INSERT del event_id + encolar procesamiento. El
INSERT con `ON CONFLICT DO NOTHING` es atómico.

**Schema**:
```
processed_webhook_events:
  id: uuid PK
  event_id: text UNIQUE NOT NULL (wamid o status_id)
  event_type: text NOT NULL (message | status | ...)
  organization_id: uuid FK NOT NULL
  received_at: timestamp NOT NULL
  processed_at: timestamp NULL
```

**TTL / Limpieza**: Los eventos procesados se retienen 7 días (periodo de reintentos
de Meta) y se purgan con un job periódico. Esto mantiene la tabla liviana.

---

## DV-006: Procesamiento Asíncrono de Webhooks

**Decision**: Procesamiento inline con timeout guard (v1), migrable a queue

**Rationale**: Para v1 con ~50 ISPs, el volumen de webhooks es manejable inline.
El endpoint verifica firma, deduplica, y procesa en la misma request (descarga media,
upload S3, update DB). Un timeout guard asegura que el response se envía en <5s.

Para escalar más allá de v1: migrar a un job queue (BullMQ con Redis, o pg-boss con
PostgreSQL). La arquitectura del service layer ya separa la lógica del endpoint, así
que la migración es un cambio de wiring, no de lógica.

**Supuesto**: Si la descarga de media de Meta + upload a S3 toma >4s
consistentemente, se promueve el queue a v1. Este supuesto se valida en el self-test.

**Alternatives considered**:
- **BullMQ + Redis desde v1**: Overhead de infraestructura (Redis) para un volumen
  que no lo justifica aún. Añade complejidad de deploy.
- **pg-boss (PostgreSQL-backed queue)**: Buena opción para v1.5 si el inline no
  escala. No requiere Redis.

---

## DV-007: Almacenamiento S3 — Estructura de Prefijos

**Decision**: Prefijo `/{organization_id}/comprobantes/{subscriber_id}/{timestamp}_{wamid}.{ext}`

**Rationale**: Aísla archivos por tenant (Principio VII). El `subscriber_id` agrupa
comprobantes por abonado. El timestamp + wamid hacen el nombre único y trazable.

**URLs presignadas**: El backend genera URLs presignadas con TTL de 15 minutos para
download. Para upload de comprobantes (desde webhook), el backend sube directamente
con las credenciales S3 del servidor — el frontend nunca toca S3.

---

## DV-008: Importación CSV — Estrategia de Procesamiento

**Decision**: Procesamiento síncrono en lotes de 100 filas con validación Zod

**Rationale**: Para archivos de hasta ~5,000 filas (spec assumption), el
procesamiento síncrono en lotes es suficiente. Cada lote se valida con un schema Zod,
se inserta con `INSERT ... ON CONFLICT (phone, organization_id) DO NOTHING` para
dedup, y se reportan las filas con error.

**Flujo**:
1. Frontend sube CSV vía `multipart/form-data`.
2. Backend parsea con `papaparse` (streaming).
3. Cada fila se valida contra schema Zod (nombre, teléfono, plan, monto, vencimiento).
4. Filas válidas se insertan en lotes de 100. Duplicados se detectan por constraint
   `UNIQUE(phone, organization_id)`.
5. Se devuelve un resumen: `{ imported: N, duplicates: N, errors: [{ row, reason }] }`.

---

## DV-009: Embedded Signup de Meta — Flujo de Integración

**Decision**: Flujo Embedded Signup v2 con JavaScript SDK en el frontend + callback
API en el backend

**Rationale**: Meta provee un flujo OAuth-like donde el ISP autoriza desde una ventana
embebida. El frontend usa el Facebook JavaScript SDK para iniciar el flujo. Al
completar, Meta devuelve un `code` que el backend intercambia por un System User
Access Token. El token se cifra (DV-003) y se almacena junto con el WABA ID y Phone
Number ID.

**Flujo**:
1. Admin del ISP hace clic en "Conectar WhatsApp" en el panel.
2. Se abre la ventana de Meta Embedded Signup (JS SDK `FB.login`).
3. El ISP autoriza los permisos (`whatsapp_business_management`,
   `whatsapp_business_messaging`).
4. Meta devuelve un `code` al frontend.
5. El frontend envía el `code` al backend (`POST /api/waba/connect`).
6. El backend intercambia el `code` por un token via Graph API.
7. El backend cifra el token y lo almacena en `waba_configs`.
8. El backend suscribe el WABA al webhook de la app.
9. El frontend muestra "WhatsApp Conectado".

---

## DV-010: Rate Limiting de Envío por Tenant

**Decision**: Rate limiter in-memory (Map) con ventana deslizante por
`organization_id`, configurable por tier

**Rationale**: Para v1, un rate limiter en memoria es suficiente. Cada tenant tiene
un límite de mensajes por minuto (default: 80/min, ajustable por tier del ISP). El
messaging service consulta el limiter antes de cada envío y encola los que excedan
el límite.

**Migración**: Para multi-instancia, migrar a Redis-based rate limiting. La interfaz
del rate limiter es un service con método `canSend(orgId): boolean`, así que el
cambio es transparente.

---

## Decisiones pendientes de verificación humana

| ID | Decisión | Requiere input del dueño |
|----|----------|--------------------------|
| — | Ninguna pendiente | — |

Todas las decisiones se resolvieron con defaults razonables y están alineadas con la
constitución. No hay NEEDS CLARIFICATION pendientes.
