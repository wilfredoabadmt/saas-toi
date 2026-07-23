# Contract: Dashboard Metrics API

**Feature**: 002-dashboard-payment-verification | [plan.md](../plan.md)

Todos los endpoints derivan el `organization_id` de `getSessionContext(request)`; el
cliente NUNCA lo envía como parámetro de negocio. Errores usan `handleApiError`
(formato `{ error: { code, message } }`).

---

## GET /api/dashboard/metrics

Devuelve los 4 indicadores del dashboard, scoped al tenant de la sesión.

**Auth**: roles `owner`, `admin` (operator opcional). Otro rol → `403 FORBIDDEN`.

**Request**: sin body ni query params.

**Response 200**:

```json
{
  "data": {
    "monthCollected": { "amount": 1250.00, "currency": "PEN", "periodStart": "2026-07-01", "periodEnd": "2026-07-31", "timezone": "America/Lima" },
    "overduePortfolio": { "amount": 3400.00, "currency": "PEN" },
    "overdueSubscribers": { "count": 42 },
    "pendingProofs": { "count": 7 }
  }
}
```

**Reglas**:
- `monthCollected.amount` = `SUM(payment_proofs.amount)` con `review_status='approved'` y
  `reviewed_at` dentro del mes local de `organizations.timezone`. `0` si no hay filas
  (nunca `null`).
- `overduePortfolio.amount` = `SUM(subscribers.monthly_amount)` con
  `payment_status='overdue'`. `0` si ninguno.
- `overdueSubscribers.count` = `COUNT(subscribers)` con `payment_status='overdue'`.
- `pendingProofs.count` = `COUNT(payment_proofs)` con `review_status='pending'` (incluye
  los de `subscriber_id IS NULL`).
- Todos los agregados llevan `WHERE organization_id = <session org>` — 0 tolerancia a
  cruce de tenant (SC-002).

**Errores**: `401` sin contexto de tenant; `403` rol no autorizado; `500` interno
(mensaje genérico, sin filtrar detalles).
