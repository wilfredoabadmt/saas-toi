# Implementation Plan: Gestión Multi-Tenant de Abonados, Conexión Meta WhatsApp Cloud API y Envío de Recordatorios de Cobranza (Utility)

**Branch**: `001-tenant-whatsapp-billing` | **Date**: 2026-07-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-tenant-whatsapp-billing/spec.md`

## Summary

Implementar el core de un SaaS multi-tenant para ISPs que permite: (1) gestionar
abonados con importación CSV, (2) conectar WhatsApp Business vía Embedded Signup de
Meta, (3) enviar recordatorios de cobranza con templates Utility, y (4) recibir
comprobantes de pago por webhook con almacenamiento S3 aislado. El sistema exige
aislamiento total por tenant, cifrado AES-256-GCM de tokens WABA, verificación
HMAC-SHA256 de webhooks y deduplicación por `wamid`.

Enfoque técnico: monorepo Next.js (App Router) con API routes como backend,
PostgreSQL vía Drizzle ORM con `organization_id` en toda tabla de dominio, cifrado
de secretos con `@node-rs/argon2` + AES-256-GCM vía Node.js `crypto`, almacenamiento
S3 vía `@aws-sdk/client-s3`, y validación Zod en toda frontera.

## Technical Context

**Language/Version**: TypeScript 5.x (strict + noUncheckedIndexedAccess)

**Framework**: Next.js 15 (App Router) — SSR + API Routes como backend

**Primary Dependencies**:
- `drizzle-orm` + `drizzle-kit` (ORM y migraciones)
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (almacenamiento S3)
- `zod` (validación de inputs en toda frontera)
- `papaparse` (parsing CSV en el backend)
- `crypto` (Node.js built-in — AES-256-GCM para cifrado de tokens)

**Storage**: PostgreSQL (self-hosted) vía Drizzle ORM

**Testing**: Vitest (unit + integration)

**Target Platform**: Linux server (Docker) via Coolify

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Importación de 500 abonados < 30s, webhook response < 5s (p99),
envío de templates soportando lotes de hasta 500 abonados

**Constraints**: Respuesta de webhook ≤5s (requisito Meta), aislamiento total por
tenant, tokens WABA nunca en claro fuera del backend

**Scale/Scope**: Hasta ~50 ISPs con ~5,000 abonados cada uno en v1 (~250k abonados
totales)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Verificación | Estado |
|-----------|-------------|--------|
| I. Multi-Tenancy Absoluto | `organization_id` como columna NOT NULL e indexada en toda tabla de dominio. Drizzle queries con `.where(eq(table.organizationId, orgId))` obligatorio. RLS como capa adicional si PostgreSQL lo soporta. | ✅ PASS |
| II. Seguridad de Credenciales | Tokens WABA cifrados con AES-256-GCM en la columna `encrypted_token` de `waba_configs`. Clave en `ENCRYPTION_KEY` (env). Descifrado solo en el service layer del backend. Nunca en logs ni en respuestas API al frontend. | ✅ PASS |
| III. Idempotencia Webhooks | Endpoint `/api/webhooks/whatsapp`: (1) verifica `X-Hub-Signature-256` con HMAC-SHA256, (2) busca `wamid` en tabla `processed_webhook_events`, (3) si existe → 200 sin procesar, (4) si no → encola y responde 200, procesa async. | ✅ PASS |
| IV. Políticas WhatsApp UTILITY | Templates de cobranza diseñados como UTILITY. Rate limiter por tenant en el service de envío. Opt-out registrado y respetado. | ✅ PASS |
| V. Calidad Verificable | TypeScript strict, ESLint, build de Next.js, Vitest para unit/integration. | ✅ PASS |
| VI. Verificación Comportamiento | Self-test E2E: importar CSV → verificar lista, simular webhook → verificar dedup, Playwright para UI del panel. | ✅ PASS |
| VII. Almacenamiento S3 | `@aws-sdk/client-s3` con interfaz estándar. Prefijo `/{organization_id}/comprobantes/`. URLs presignadas. Sin vendor lock-in. | ✅ PASS |
| VIII. Foco Vertical ISP | Entidades: Subscriber (no Contact), ServicePlan (no Product), PaymentProof (no Attachment). Dominio ISP en nomenclatura y flujos. | ✅ PASS |
| IX. Specs Antes de Código | Spec 001 completa y validada antes de este plan. | ✅ PASS |
| X. Trazabilidad | Decisions log en research.md. Supuestos en spec Assumptions. | ✅ PASS |

**Gate result: ✅ ALL PASS — proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/001-tenant-whatsapp-billing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api-subscribers.md
│   ├── api-waba.md
│   ├── api-messaging.md
│   └── webhook-whatsapp.md
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, registro)
│   │   └── ...
│   ├── (dashboard)/              # Panel autenticado del ISP
│   │   ├── layout.tsx
│   │   ├── subscribers/          # Gestión de abonados
│   │   │   ├── page.tsx          # Lista de abonados
│   │   │   ├── import/page.tsx   # Importación CSV
│   │   │   └── [id]/page.tsx     # Detalle del abonado
│   │   ├── whatsapp/             # Configuración WABA
│   │   │   └── page.tsx          # Estado de conexión + Embedded Signup
│   │   └── messaging/            # Envío de recordatorios
│   │       └── page.tsx          # Selección de abonados + envío
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── whatsapp/route.ts # Webhook endpoint (GET verify + POST events)
│   │   ├── subscribers/
│   │   │   ├── route.ts          # CRUD abonados
│   │   │   └── import/route.ts   # Importación CSV
│   │   ├── waba/
│   │   │   ├── connect/route.ts  # Embedded Signup callback
│   │   │   └── status/route.ts   # Estado de conexión
│   │   ├── messaging/
│   │   │   └── send/route.ts     # Gatillo de envío masivo
│   │   └── health/route.ts       # Healthcheck
│   └── layout.tsx                # Root layout
├── db/
│   ├── schema/                   # Drizzle schema (una tabla por archivo)
│   │   ├── organizations.ts
│   │   ├── users.ts
│   │   ├── subscribers.ts
│   │   ├── service-plans.ts
│   │   ├── waba-configs.ts
│   │   ├── message-logs.ts
│   │   ├── payment-proofs.ts
│   │   ├── processed-events.ts
│   │   └── index.ts              # Re-exports
│   ├── migrations/               # Drizzle migrations
│   └── client.ts                 # DB connection pool
├── lib/
│   ├── crypto.ts                 # AES-256-GCM encrypt/decrypt
│   ├── s3.ts                     # S3 client + presigned URLs
│   ├── whatsapp/
│   │   ├── client.ts             # WhatsApp Cloud API client
│   │   ├── webhook-verify.ts     # HMAC-SHA256 signature verification
│   │   └── types.ts              # Meta API types
│   ├── csv-parser.ts             # CSV import logic
│   ├── rate-limiter.ts           # Per-tenant rate limiting
│   └── tenant.ts                 # Tenant context helpers
├── services/
│   ├── subscriber.service.ts     # Business logic: abonados
│   ├── waba.service.ts           # Business logic: WABA connection
│   ├── messaging.service.ts      # Business logic: envío de templates
│   ├── webhook.service.ts        # Business logic: procesamiento de webhooks
│   └── payment-proof.service.ts  # Business logic: comprobantes
└── components/
    ├── ui/                       # Componentes base (buttons, tables, forms)
    └── domain/                   # Componentes de dominio ISP
        ├── subscriber-table.tsx
        ├── csv-import-form.tsx
        ├── waba-connect-button.tsx
        ├── message-send-form.tsx
        └── payment-proof-viewer.tsx

tests/
├── unit/
│   ├── lib/
│   │   ├── crypto.test.ts
│   │   ├── webhook-verify.test.ts
│   │   └── csv-parser.test.ts
│   └── services/
│       ├── subscriber.service.test.ts
│       ├── webhook.service.test.ts
│       └── messaging.service.test.ts
├── integration/
│   ├── api/
│   │   ├── subscribers.test.ts
│   │   ├── webhook.test.ts
│   │   └── messaging.test.ts
│   └── db/
│       └── tenant-isolation.test.ts
└── setup.ts                      # Test DB setup + fixtures

drizzle.config.ts                 # Drizzle Kit config
next.config.ts                    # Next.js config
package.json
tsconfig.json
.env                              # (gitignored)
```

**Structure Decision**: Next.js App Router full-stack (no backend separado). API
routes como endpoints REST. Drizzle ORM con schema modular por tabla. Services layer
para lógica de negocio. Los componentes de UI se separan en `ui/` (genéricos) y
`domain/` (ISP-específicos).

## Complexity Tracking

> No hay violaciones constitucionales que justificar. Tabla vacía.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
