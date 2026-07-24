# Implementation Plan: 006-landing-and-self-onboarding

**Feature**: Landing Page Comercial Pública (/), Registro Autónomo de Tenant y Onboarding Wizard

**Spec**: [specs/006-landing-and-self-onboarding/spec.md](specs/006-landing-and-self-onboarding/spec.md)

---

## Technical Architecture

### 1. Database Schema & Registration Flow

- **`organizations` (`src/db/schema/organizations.ts`)**:
  - `id` (uuid, primaryKey)
  - `name` (text, NOT NULL) — Ej: "FiberSpeed ISP"
  - `slug` (text, NOT NULL, UNIQUE)
  - `createdAt` (timestamp, DEFAULT NOW())

- **`users` (`src/db/schema/users.ts`)**:
  - `id` (uuid, primaryKey)
  - `organizationId` (uuid, FK -> organizations)
  - `email` (text, UNIQUE, NOT NULL)
  - `name` (text, NOT NULL)
  - `role` ('admin')
  - `passwordHash` (text, NOT NULL)

---

### 2. Services Layer

- **`AuthService` (`src/services/auth.service.ts`)**:
  - `registerOrganization(companyName, adminName, email, password)`:
    - Normaliza slug y crea la organización.
    - Hashea la contraseña con algoritmo seguro.
    - Crea el usuario `admin` asociado a la nueva organización.
    - Retorna objeto con token / sesión y URL de redirección `/onboarding`.

---

### 3. Public Routes & UI Pages

- **Public Landing Page** (`src/app/page.tsx`):
  - Rediseño de la raíz con propuesta comercial para ISPs.
  - Navbar con links a características, precios y botón "Comenzar Prueba Gratuita".
  - Secciones: Hero con CTA, Características Clave (WhatsApp Cloud API, Corte MikroTik, Tickets), Comparativa de Precios y FAQ.

- **Public Registration Page** (`src/app/register/page.tsx`):
  - Formulario estético de registro de Tenant ISP.
  - Campos: Nombre del ISP, Nombre del Administrador, Email y Contraseña.

- **Onboarding Wizard** (`src/app/(dashboard)/onboarding/page.tsx`):
  - Asistente de inicio guiado de 3 pasos:
    1. Paso 1: Confirmar Nombre del ISP y Moneda Local.
    2. Paso 2: Importar Abonados (enlace rápido a `/subscribers/import`).
    3. Paso 3: Conectar WhatsApp WABA (enlace rápido a `/whatsapp`).
  - Barra de progreso interactiva (0% - 100%).

---

## Verification Plan

### Automated Tests
1. `tests/unit/services/auth.service.test.ts`: Creación de tenant y admin en `registerOrganization`.
2. `tests/integration/api/register.test.ts`: Endpoint `POST /api/register` validando código 201 y duplicados 409.

### Verification in Production
- Navegar a la raíz `/` en modo incógnito.
- Registrar un nuevo ISP de prueba en `/register` (Ej: `ISP Demo Sur`).
- Verificar que redirige a `/onboarding` y muestra los 3 pasos de configuración.
