# Implementation Plan: 008-saas-subscription-and-limits

**Feature**: Monetización del SaaS, Planes de Suscripción y Control de Límites por Tenant

**Spec**: [specs/008-saas-subscription-and-limits/spec.md](specs/008-saas-subscription-and-limits/spec.md)

---

## Technical Architecture

### 1. Database Schemas

- **`saas_plans` (`src/db/schema/saas-plans.ts`)**:
  - `id` (uuid, primaryKey)
  - `name` (text, NOT NULL) — Ej: "Starter", "Pro", "Enterprise"
  - `slug` (text, UNIQUE, NOT NULL)
  - `maxSubscribers` (integer, NOT NULL) — Ej: 300, 1500, 999999
  - `maxRouters` (integer, NOT NULL) — Ej: 1, 5, 99
  - `priceMonthlyUSD` (numeric, NOT NULL) — Ej: 49.00, 99.00, 199.00
  - `createdAt` (timestamp, DEFAULT NOW())

- **`subscriptions` (`src/db/schema/subscriptions.ts`)**:
  - `id` (uuid, primaryKey)
  - `organizationId` (uuid, FK -> organizations, UNIQUE, NOT NULL)
  - `planId` (uuid, FK -> saas_plans, NOT NULL)
  - `status` ('active' | 'trial' | 'past_due' | 'suspended', DEFAULT 'active')
  - `expiresAt` (timestamp, nullable)
  - `createdAt` (timestamp, DEFAULT NOW())
  - `updatedAt` (timestamp, DEFAULT NOW())

---

### 2. Services Layer & Subscription Guard

- **`SubscriptionGuard` (`src/services/subscription-guard.service.ts`)**:
  - `getCurrentSubscription(organizationId)`: Obtiene la suscripción del tenant, plan asignado y conteo de abonados actual.
  - `assertCanAddSubscriber(organizationId, countToAdd = 1)`: Lanza `ApiError(403, 'PLAN_LIMIT_EXCEEDED')` si se excede el límite del plan.

- **`SubscriptionService` (`src/services/subscription.service.ts`)**:
  - `listAllTenantsWithSubscriptions()`: Lista para el panel de Super Admin.
  - `updateTenantSubscription(organizationId, planId, status)`: Actualiza plan o estado de un tenant.

---

### 3. UI Pages & API Routes

- **Tenant Panel `/settings/billing`** (`src/app/(dashboard)/settings/billing/page.tsx`):
  - Barra de progreso de abonados consumidos vs. cupo máximo.
  - Tarjeta de suscripción actual y tabla comparativa de planes con botón de upgrade.

- **Super Admin Panel `/super-admin/tenants`** (`src/app/(dashboard)/super-admin/tenants/page.tsx`):
  - Tabla global de tenants con select para cambiar plan y toggle de estado de la suscripción.

- **API Routes**:
  - `GET /api/subscriptions/current`
  - `GET/PATCH /api/super-admin/tenants`

---

## Verification Plan

### Automated Tests
1. `tests/unit/services/subscription-guard.service.test.ts`: Validación de límites del plan Starter (bloqueo en abonado 301).
2. `tests/unit/services/subscription.service.test.ts`: Cambio de plan y extensión de vigencia.
3. `tests/integration/api/subscriptions.test.ts`: Endpoint `/api/subscriptions/current` y guardián en creación de abonado.

### Verification in Production
- Probar el panel `/settings/billing` con un tenant de prueba.
- Navegar a `/super-admin/tenants` y realizar un cambio de plan simulado.
