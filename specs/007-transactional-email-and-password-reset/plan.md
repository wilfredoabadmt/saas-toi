# Implementation Plan: 007-transactional-email-and-password-reset

**Feature**: Servicio de Email Transaccional, Invitaciones por Correo y Recuperación de Contraseña

**Spec**: [specs/007-transactional-email-and-password-reset/spec.md](specs/007-transactional-email-and-password-reset/spec.md)

---

## Technical Architecture

### 1. Database Schemas

- **`password_resets` (`src/db/schema/password-resets.ts`)**:
  - `id` (uuid, primaryKey)
  - `userId` (uuid, FK -> users, NOT NULL)
  - `token` (text, UNIQUE, NOT NULL)
  - `expiresAt` (timestamp, NOT NULL)
  - `usedAt` (timestamp, nullable)
  - `createdAt` (timestamp, DEFAULT NOW())

- **`team_invitations` (`src/db/schema/team-invitations.ts`)**:
  - `id` (uuid, primaryKey)
  - `organizationId` (uuid, FK -> organizations, NOT NULL)
  - `email` (text, NOT NULL)
  - `role` (text, NOT NULL)
  - `token` (text, UNIQUE, NOT NULL)
  - `expiresAt` (timestamp, NOT NULL)
  - `acceptedAt` (timestamp, nullable)
  - `createdAt` (timestamp, DEFAULT NOW())

---

### 2. Services Layer

- **`EmailService` (`src/services/email.service.ts`)**:
  - `sendPasswordReset(email, resetUrl)`: Envía correo con la plantilla HTML de restablecimiento de contraseña.
  - `sendTeamInvitation(email, companyName, role, inviteUrl)`: Envía correo con la plantilla HTML de invitación al equipo.
  - `sendRouterAlert(adminEmail, routerName, host, errorDetails)`: Envía alerta de fallo de comunicación de red en MikroTik.

- **`PasswordResetService` (`src/services/password-reset.service.ts`)**:
  - `requestReset(email)`: Busca usuario, genera token criptográfico (30 mins TTL) y dispara `EmailService.sendPasswordReset`.
  - `verifyToken(token)`: Valida existencia y expiración del token.
  - `confirmReset(token, newPassword)`: Actualiza `password_hash` del usuario y marca token como usado.

---

### 3. Public Routes & UI Pages

- **Forgot Password Page** (`src/app/forgot-password/page.tsx`):
  - Formulario público donde el usuario ingresa su correo electrónico para recibir el enlace.

- **Reset Password Page** (`src/app/reset-password/page.tsx`):
  - Formulario público que recibe `?token=...`, valida su vigencia y permite guardar la nueva contraseña.

- **Accept Invitation Page** (`src/app/accept-invite/page.tsx`):
  - Formulario público que valida el token de la invitación del equipo y activa al usuario.

---

## Verification Plan

### Automated Tests
1. `tests/unit/services/email.service.test.ts`: Renderizado e invocación del servicio de email.
2. `tests/unit/services/password-reset.service.test.ts`: Generación y validación de tokens con expiración.
3. `tests/integration/api/auth-reset.test.ts`: Endpoints `POST /api/auth/forgot-password` y `POST /api/auth/reset-password`.

### Verification in Production
- Probar la solicitud de recuperación en `/forgot-password`.
- Verificar que las invitaciones enviadas desde `/settings/team` disparen el correo de bienvenida.
