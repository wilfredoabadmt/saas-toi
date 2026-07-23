# Implementation Plan: Dashboard Ejecutivo y Verificación de Comprobantes de Pago

**Branch**: `002-dashboard-payment-verification` | **Date**: 2026-07-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-dashboard-payment-verification/spec.md`

## Summary

Construir sobre el core del feature 001 dos capacidades para el operador y el admin del
ISP: (1) una **bandeja de verificación** tenant-wide en `/payments/verify` que lista los
comprobantes `pending` recibidos por WhatsApp, con visor de imagen/PDF (URL presignada) y
datos del abonado al costado; (2) un **flujo de aprobación/rechazo** que captura el monto,
regulariza la cuenta del abonado ("Al día" + avanza `due_date` un mes), dispara un template
UTILITY de confirmación/corrección por WhatsApp, es idempotente y tolera fallos del
proveedor; (3) asociación manual de comprobantes de **abonado no identificado**; y (4) un
**dashboard ejecutivo** en `/dashboard` con 4 indicadores (total recaudado del mes, cartera
vencida, abonados en mora, comprobantes pendientes) calculados con scope estricto de tenant.

Enfoque técnico: reutiliza la stack 001 (Next.js 15 App Router, Drizzle + PostgreSQL, Zod,
`@aws-sdk/client-s3`, Vitest, Playwright). Extiende `PaymentProofService` y añade
`DashboardService`; una migración Drizzle añade `payment_proofs.amount`,
`payment_proofs.sender_phone`, hace `payment_proofs.subscriber_id` NULLABLE y añade
`organizations.timezone`. La UI usa polling (~30 s) + refresco manual (sin tiempo real).

## Technical Context

**Language/Version**: TypeScript 5.x (strict + noUncheckedIndexedAccess)

**Framework**: Next.js 15 (App Router) — SSR + API Routes como backend

**Primary Dependencies** (todas ya presentes en 001, sin dependencias nuevas):
- `drizzle-orm` + `drizzle-kit` (schema + migración incremental)
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (visor vía presigned URL)
- `zod` (validación de body en las rutas nuevas)
- `crypto` (reuso indirecto vía WabaService para el token de envío)

**Storage**: PostgreSQL (self-hosted) vía Drizzle ORM

**Testing**: Vitest (unit + integration) + Playwright (self-test E2E de la UI)

**Target Platform**: Linux server (Docker) via Coolify

**Project Type**: Web application (Next.js full-stack) — extiende el monorepo 001

**Performance Goals**: Bandeja carga y abre un comprobante < 15 s (SC-001); dashboard
responde en < 1 s con datos de un tenant de ~5k abonados; polling de bandeja cada ~30 s.

**Constraints**: Aislamiento total por tenant en TODA query nueva (agregados incluidos);
la acción de negocio (aprobar/rechazar) NUNCA se revierte por un fallo de notificación;
notificaciones solo con templates UTILITY, respetando opt-out y rate limiting.

**Scale/Scope**: Mismo orden que 001 (~50 ISPs, ~5k abonados c/u). Los agregados del
dashboard se resuelven con queries indexadas por `organization_id`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Verificación | Estado |
|-----------|-------------|--------|
| I. Multi-Tenancy Absoluto | Toda query nueva (listado de pendientes, agregados del dashboard, review, asociación) lleva `.where(eq(table.organizationId, orgId))` vía `assertTenantScope`. Los `COUNT/SUM` del dashboard se agrupan siempre bajo el `organization_id` de la sesión. | ✅ PASS |
| II. Seguridad de Credenciales | El envío de confirmación/rechazo reutiliza `WabaService.getDecryptedTokenInternal`; el token se descifra solo en el service layer, nunca al frontend ni a logs. La UI recibe solo URLs presignadas, no credenciales S3. | ✅ PASS |
| III. Idempotencia Webhooks | La recepción del comprobante ya pasa por el webhook 001 (dedup por `wamid`). La **aprobación** se hace idempotente a nivel de dominio: solo actúa si `review_status = 'pending'` (transición atómica con guard en el `UPDATE ... WHERE review_status='pending'`); reintentos no duplican envío ni efecto en la cuenta. | ✅ PASS |
| IV. Políticas WhatsApp UTILITY | Templates `payment_confirmation` y `payment_correction` categoría UTILITY. Envío respeta `RateLimiter.tryConsume(orgId)` y `optedOutWhatsapp`. | ✅ PASS |
| V. Calidad Verificable | TypeScript strict, ESLint, build Next.js, Vitest (unit del cálculo de métricas + transición de review; integration de aislamiento tenant). | ✅ PASS |
| VI. Verificación Comportamiento | Self-test E2E con Playwright: simular webhook con imagen → aparece en `/payments/verify` → aprobar → abonado "Al día" + confirmación despachada; camino infeliz: fallo de Meta no revierte aprobación, rechazo sin motivo bloqueado, opt-out no envía. | ✅ PASS |
| VII. Almacenamiento S3 | Visor y descarga vía `getPresignedDownloadUrl` (TTL corto). Comprobantes no identificados se guardan bajo prefijo del tenant (`/{orgId}/comprobantes/unidentified/`). Frontend nunca toca el bucket. | ✅ PASS |
| VIII. Foco Vertical ISP | Nomenclatura de dominio: Comprobante (PaymentProof), Abonado (Subscriber), "Al día"/"en mora" (payment_status), cartera vencida. Cierra el ciclo de cobranza ISP. | ✅ PASS |
| IX. Specs Antes de Código | Spec 002 completa + 4 clarificaciones resueltas antes de este plan. | ✅ PASS |
| X. Trazabilidad | Decisiones (timezone, persistencia de no identificados, idempotencia de aprobación) documentadas en research.md; supuestos en spec Assumptions. | ✅ PASS |

**Gate result: ✅ ALL PASS — proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/002-dashboard-payment-verification/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (deltas sobre modelo 001)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api-dashboard.md
│   └── api-payment-verification.md
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root) — deltas sobre 001

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx                 # NUEVO — Dashboard ejecutivo (4 tarjetas)
│   │   └── payments/
│   │       └── verify/
│   │           └── page.tsx             # NUEVO — Bandeja de verificación + visor
│   └── api/
│       ├── dashboard/
│       │   └── metrics/route.ts         # NUEVO — GET indicadores del tenant
│       └── payments/
│           └── proofs/
│               ├── route.ts             # NUEVO — GET comprobantes pending (tenant-wide)
│               └── [proofId]/
│                   ├── route.ts         # NUEVO — PATCH review (approve/reject + amount/notes)
│                   └── assign/route.ts  # NUEVO — PATCH asociar abonado (no identificado)
├── db/
│   ├── schema/
│   │   ├── payment-proofs.ts            # MOD — +amount, +senderPhone, subscriberId nullable
│   │   └── organizations.ts            # MOD — +timezone
│   └── migrations/                      # NUEVO — migración incremental Drizzle
├── services/
│   ├── payment-proof.service.ts         # MOD — listPending, reviewProof (extendido), assignSubscriber
│   ├── dashboard.service.ts             # NUEVO — agregados de métricas por tenant
│   └── messaging.service.ts             # MOD — sendConfirmation / sendCorrection (UTILITY)
└── components/
    └── domain/
        ├── dashboard-cards.tsx          # NUEVO — tarjetas de indicadores
        ├── proof-inbox.tsx              # NUEVO — lista/mosaico + polling
        └── proof-review-panel.tsx       # NUEVO — visor + acciones aprobar/rechazar/asociar

tests/
├── unit/services/
│   ├── dashboard.service.test.ts        # NUEVO — cálculo de métricas (incl. mes/timezone)
│   └── payment-proof.review.test.ts     # NUEVO — transición idempotente + efecto en abonado
└── integration/api/
    ├── dashboard.test.ts                # NUEVO — aislamiento tenant en agregados
    └── payment-verification.test.ts     # NUEVO — flujo approve/reject + no identificado
```

**Structure Decision**: No se crea backend nuevo ni se cambia la arquitectura 001. Se
añaden rutas API bajo `api/dashboard` y `api/payments`, dos páginas bajo `(dashboard)`,
un `DashboardService` nuevo y extensiones a `PaymentProofService`/`MessagingService`. La
migración es incremental (aditiva + relajación de un NOT NULL), sin recrear tablas.

## Complexity Tracking

> No hay violaciones constitucionales que justificar. Tabla vacía.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
