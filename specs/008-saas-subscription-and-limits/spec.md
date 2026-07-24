# Feature Specification: 008-saas-subscription-and-limits

**Feature**: Monetización del SaaS, Planes de Suscripción y Control de Límites por Tenant

**Scope**:
- **IN SCOPE**:
  - Modelo de datos para Monetización y Suscripciones:
    - **`saas_plans`**: Definición de planes globales (Starter: 300 abonados / 1 router, Pro: 1,500 abonados / 5 routers, Enterprise: Ilimitado).
    - **`subscriptions`**: Estado de la suscripción de cada ISP (`organization_id`, `plan_id`, `status`: 'active' | 'trial' | 'past_due' | 'cancelled', `expiresAt`).
  - Servicio Guardián de Límites (`SubscriptionGuard`):
    - `assertCanAddSubscribers(organizationId, countToAdd)`: Verifica consumo actual + cantidad a agregar contra el límite del plan.
    - Bloqueo inmediato con `ApiError(403, 'PLAN_LIMIT_EXCEEDED')` al intentar exceder el cupo de abonados.
  - Panel de Suscripción del Tenant en `/settings/billing`:
    - Tarjeta de plan actual, fecha de vencimiento y estado de cuenta.
    - Barra de progreso en tiempo real (% abonados consumidos vs. cupo máximo).
    - Tabla comparativa de planes con botón de solicitud de Upgrade.
  - Panel de Super Admin en `/super-admin/tenants`:
    - Gestión global de organizaciones registradas.
    - Acciones para cambiar plan, renovar fecha de expiración o suspender/activar la suscripción de un tenant.
- **OUT OF SCOPE**:
  - Cobro recurrente directo por tarjeta de crédito con Stripe Billing SDK.

---

## User Stories

### US1 — Gestión Global de Tenants y Suscripciones (Panel Super Admin `/super-admin/tenants`) (Priority: P1)
**Como** Dueño del SaaS (Super Admin)  
**Quiero** ver la lista de todos los ISPs registrados y modificar su plan o estado de suscripción  
**Para** administrar la cartera de clientes del SaaS y conceder upgrades o extensiones.

#### Criterios de Aceptación:
- El panel en `/super-admin/tenants` muestra todas las organizaciones registradas, su plan asignado, consumo de abonados y estado de suscripción.
- El Super Admin puede cambiar el plan de una organización (ej. Starter -> Pro) o cambiar su estado (`active`, `suspended`).
- Los cambios aplicados por el Super Admin tienen efecto inmediato en los límites del tenant.

---

### US2 — Panel de Suscripción y Consumo del ISP (`/settings/billing`) (Priority: P1)
**Como** Administrador de ISP  
**Quiero** ver en mi panel `/settings/billing` mi plan actual y el porcentaje de abonados consumidos  
**Para** monitorear mi capacidad restante y planificar un upgrade antes de agotar mi cupo.

#### Criterios de Aceptación:
- Muestra el nombre del plan actual (ej. Starter, Pro, Enterprise).
- Muestra la barra de progreso de abonados (ej. `210 / 300 abonados (70%)`).
- Expresa claramente el estado de la suscripción (`Activa`, `En Período de Prueba`, `Suspendida`).

---

### US3 — Bloqueo Automático por Exceso de Límite o Morosidad del Tenant (Priority: P1)
**Como** Sistema SaaS  
**Quiero** validar los límites de la suscripción del tenant antes de crear o importar abonados  
**Para** proteger los márgenes del SaaS y exigir el upgrade a planes superiores cuando el ISP crece.

#### Criterios de Aceptación:
- Si un ISP en plan Starter (límite 300 abonados) intenta crear o importar el abonado 301, la API rechaza la solicitud con un error HTTP 403 `PLAN_LIMIT_EXCEEDED` y el mensaje `"Has alcanzado el límite máximo de abonados de tu plan Starter (300). Actualiza tu plan a Pro para continuar"`.
- Si la suscripción del tenant está `cancelled` o `suspended`, las operaciones de creación quedan bloqueadas.

---

## Constitution Compliance Audit

| Principio Constitucional | Mecanismo de Cumplimiento en Feature 008 |
|---|---|
| **I. Multi-Tenancy Absoluto** | Verificación estricta de límites por `organization_id`. Cada consulta cuenta únicamente los abonados del tenant evaluado. |
| **II. Rendimiento & Eficiencia** | Conteo directo optimizado `count()` en PostgreSQL sin cargar arrays en memoria. |
| **III. Experiencia de Usuario** | Componentes de barra de progreso en tiempo real y alertas claras de actualización de plan en la UI. |
| **IV. Calidad Verificable** | Pruebas unitarias de `SubscriptionGuard` y pruebas de integración para el bloqueo de límites. |

---

## Data Model Extensions & API Contracts

### 1. Table: `saas_plans`
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL) — Ej: "Starter", "Pro", "Enterprise"
- `slug` (TEXT, UNIQUE, NOT NULL)
- `maxSubscribers` (INTEGER, NOT NULL) — Ej: 300, 1500, 999999
- `maxRouters` (INTEGER, NOT NULL) — Ej: 1, 5, 99
- `priceMonthlyUSD` (NUMERIC, NOT NULL) — Ej: 49.00, 99.00, 199.00
- `createdAt` (TIMESTAMP, DEFAULT NOW())

---

### 2. Table: `subscriptions`
- `id` (UUID, Primary Key)
- `organizationId` (UUID, FK -> `organizations.id`, UNIQUE, NOT NULL)
- `planId` (UUID, FK -> `saas_plans.id`, NOT NULL)
- `status` (TEXT, DEFAULT 'active') — ('active' | 'trial' | 'past_due' | 'suspended')
- `expiresAt` (TIMESTAMP, nullable)
- `createdAt` (TIMESTAMP, DEFAULT NOW())
- `updatedAt` (TIMESTAMP, DEFAULT NOW())

---

### Endpoints de API

- **`GET /api/subscriptions/current`**: Retorna el plan actual, consumo de abonados y porcentaje de uso del tenant.
- **`GET /api/super-admin/tenants`**: Lista global de organizaciones y suscripciones para el Super Admin.
- **`PATCH /api/super-admin/tenants/[id]`**: Actualiza plan o estado de suscripción de un tenant.
