# Research: 002-dashboard-payment-verification

**Date**: 2026-07-23
**Feature**: [spec.md](spec.md) | [plan.md](plan.md)

La stack está fijada por el feature 001 (Next.js 15, Drizzle/PostgreSQL, Zod, AWS SDK
S3, Vitest, Playwright), así que no hay incógnitas de tecnología base. Las decisiones de
Phase 0 son de **diseño de dominio y comportamiento**, derivadas de las clarificaciones
de la spec y del estado real del código 001.

---

## D1 — Captura del monto pagado (`amount`)

- **Decision**: Añadir columna `amount NUMERIC(10,2) NULL` a `payment_proofs`. Se
  rellena solo al aprobar (`review_status = 'approved'`), con el valor confirmado por el
  operador. `NULL` mientras el comprobante está `pending` o `rejected`.
- **Rationale**: Clarificación Q1 → el operador confirma el monto al aprobar (pagos
  parciales/adelantos/recargos). Guardarlo en el propio comprobante evita una entidad de
  "pago" separada en v1 y da la base directa para el agregado "Total recaudado".
- **Alternatives considered**:
  - Derivar de `subscriber.monthly_amount`: rechazado — ignora pagos parciales/recargos
    y produce un total inexacto.
  - Nueva tabla `payments`: rechazado por sobre-ingeniería para v1; se puede introducir
    después sin romper este diseño (el `amount` migraría a esa tabla).

## D2 — Efecto de la aprobación sobre el abonado

- **Decision**: Al aprobar, `payment_status = 'current'` y `due_date` avanza exactamente
  **un mes** desde el `due_date` vigente (no desde "hoy"), independientemente del
  `amount`. Sin lógica de saldos parciales.
- **Rationale**: Clarificación Q2 → simplicidad para v1; avanzar desde el `due_date`
  vigente preserva el día de facturación del abonado y evita corrimiento del ciclo.
- **Alternatives considered**: condicionar el estado a `amount >= monthly_amount`
  (rechazado, Q2); avanzar desde `today` (rechazado — desplaza el día de corte).
- **Nota de implementación**: avance de mes con manejo de fin de mes (p. ej. 31 →
  último día del mes siguiente) para no producir fechas inválidas.

## D3 — Comprobantes de abonado no identificado

- **Decision**: Hacer `payment_proofs.subscriber_id` **NULLABLE** y añadir
  `sender_phone TEXT NULL`. `processIncomingProof` deja de descartar (`return null`)
  cuando no encuentra abonado: sube el archivo a S3 bajo
  `/{orgId}/comprobantes/unidentified/` y persiste el comprobante con `subscriber_id =
  NULL` y `sender_phone` = número emisor. `message_log_id` queda `NULL` en ese caso (ya
  es nullable). El operador asocia luego vía `PATCH /assign`.
- **Rationale**: FR-021 (Q4) exige que estos comprobantes sean visibles y asociables; el
  código 001 actualmente los pierde silenciosamente. Guardar `sender_phone` da al
  operador el dato para identificar y asociar.
- **Alternatives considered**:
  - Mantener `NOT NULL` con un abonado "placeholder": rechazado — contamina la tabla de
    abonados y rompe métricas.
  - Descartar como hoy: rechazado — viola FR-021.
- **Impacto en agregados**: los comprobantes con `subscriber_id = NULL` cuentan igual en
  "Comprobantes pendientes"; no afectan cartera/mora (que se calculan sobre `subscribers`).

## D4 — Idempotencia de la revisión (aprobar/rechazar)

- **Decision**: La transición se aplica con guard en la propia sentencia:
  `UPDATE payment_proofs SET ... WHERE id = ? AND organization_id = ? AND review_status =
  'pending' RETURNING *`. Si no retorna fila → el comprobante ya fue resuelto (o no
  existe/no es del tenant): se responde `409 CONFLICT` con el estado actual, sin reenviar
  ni re-aplicar efecto. El envío de WhatsApp y la actualización del abonado ocurren
  **solo** tras un UPDATE que sí transicionó.
- **Rationale**: Principio III a nivel de dominio; cubre aprobación concurrente (dos
  operadores) y doble clic. El guard en el WHERE es atómico sin necesidad de lock
  explícito.
- **Alternatives considered**: `SELECT ... FOR UPDATE` + check en app (más verboso, mismo
  efecto); optimistic version column (innecesario para una transición de un solo salto).

## D5 — Resiliencia ante fallo del proveedor (Meta / S3)

- **Decision**: Orden de operaciones al aprobar: (1) transición atómica del comprobante
  a `approved` + set `amount`, `reviewed_by`, `reviewed_at`; (2) actualización del
  abonado (`current` + `due_date`); (3) **luego** intento de envío del template. Si (3)
  falla, se registra un `message_log` con `delivery_status = 'failed'` y `failure_reason`,
  la respuesta API indica `notified: false` con motivo, y NO se revierte (1)/(2). El
  reintento de notificación es una acción posterior (manual o job), nunca revierte la
  aprobación.
- **Rationale**: FR-010/FR-014 + SC-006: la acción de negocio es la fuente de verdad; la
  notificación es best-effort. Alinea con el manejo de `UNAUTHORIZED` ya presente en
  `MessagingService` (llama a `WabaService.handleAuthFailure`).
- **Alternatives considered**: transacción todo-o-nada incluyendo el envío (rechazado —
  un hipo de Meta dejaría al abonado en mora pese a haber pagado).

## D6 — Templates UTILITY de confirmación y corrección

- **Decision**: Dos templates nuevos categoría **UTILITY**: `payment_confirmation`
  (aprobación) y `payment_correction` (rechazo, incluye el motivo como parámetro). Se
  envían con el mismo patrón que `MessagingService.sendReminderTemplates`
  (`WhatsAppClient.sendTemplateMessage` + `RateLimiter` + check `optedOutWhatsapp`).
- **Rationale**: Principio IV. Reutiliza toda la mecánica de envío/registro ya probada.
- **Dependencia externa (Trazabilidad, Principio X)**: los templates deben crearse y
  **aprobarse en Meta** antes de la verificación en vivo con número real. Para el self-test
  local se usa el sandbox/allowlist (Principio VI). Marcado como **pendiente de
  aprobación de Meta** — es lo único delegable a un tercero.
- **Alternatives considered**: mensaje de texto libre (rechazado — fuera de ventana 24 h
  requiere template; y cobranza debe ser UTILITY).

## D7 — Cálculo del "mes actual" y zona horaria

- **Decision**: Añadir `organizations.timezone TEXT NOT NULL DEFAULT 'America/Lima'`. El
  boundary del mes ("total recaudado del mes actual") se calcula convirtiendo `now()` a
  la timezone de la organización, tomando el primer día del mes local, y filtrando
  `reviewed_at` en ese rango. El agregado suma `amount` de comprobantes `approved` con
  `reviewed_at` dentro del mes local.
- **Rationale**: FR-016 exige el corte en la zona de la organización; sin columna, un ISP
  en otra zona atribuiría pagos al mes equivocado. Default razonable para el mercado
  objetivo, ajustable por tenant.
- **Alternatives considered**: timezone global por env (rechazado — no sirve a ISPs en
  zonas distintas); calcular en UTC (rechazado — corte de mes desalineado).

## D8 — Actualización de la bandeja (polling)

- **Decision**: El componente `proof-inbox.tsx` hace polling a `GET
  /api/payments/proofs?status=pending` cada ~30 s (intervalo configurable) y expone un
  botón de refresco manual. Sin websockets/SSE.
- **Rationale**: Clarificación Q3 + SC-004. El operador no requiere latencia
  sub-segundo; el polling evita infraestructura de tiempo real en v1.
- **Alternatives considered**: SSE/websockets (diferido a v2); solo manual (peor UX).

## D9 — Cálculo de indicadores del dashboard

- **Decision**: `DashboardService.getMetrics(orgId)` ejecuta 4 agregados scoped por
  tenant:
  1. **Total recaudado (mes)**: `SUM(amount)` en `payment_proofs` con `review_status =
     'approved'` y `reviewed_at` dentro del mes local (D7). `0` si no hay filas.
  2. **Cartera vencida**: `SUM(monthly_amount)` en `subscribers` con `payment_status =
     'overdue'`.
  3. **Abonados en mora**: `COUNT(*)` en `subscribers` con `payment_status = 'overdue'`.
  4. **Comprobantes pendientes**: `COUNT(*)` en `payment_proofs` con `review_status =
     'pending'`.
  Todos con `WHERE organization_id = orgId`. Aprovecha los índices existentes
  (`subscribers_org_payment_status_idx`, `payment_proofs_review_status_idx`).
- **Rationale**: FR-015..FR-019 + SC-005; queries indexadas → < 1 s a escala objetivo.
- **Alternatives considered**: tabla materializada de métricas (innecesaria a esta
  escala; reevaluable si crece).

## D10 — Autorización por rol

- **Decision**: Las acciones de review/assign y el listado de bandeja se permiten a
  `owner`, `admin`, `operator`; el dashboard a `owner`, `admin` (operator opcional). Se
  verifica el `role` de `getSessionContext` en cada ruta; scope de tenant siempre por
  `organization_id`.
- **Rationale**: FR-020 + spec Assumptions. `getSessionContext` ya expone `role`.
- **Nota**: el sistema de auth es MVP (headers/fallback). La matriz fina de permisos se
  respeta a nivel de ruta; endurecer auth queda fuera de esta feature.
