# Feature Specification: 007-transactional-email-and-password-reset

**Feature**: Servicio de Email Transaccional, Invitaciones por Correo y Recuperación de Contraseña

**Scope**:
- **IN SCOPE**:
  - Servicio de envío de correo transaccional (`EmailService`) configurable vía proveedor SMTP o Resend mediante variables de entorno (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).
  - Plantillas HTML profesionales y responsivas para 3 casos de uso principales:
    1. **Recuperación de Contraseña**: Enlace tokenizado para restablecer credenciales.
    2. **Invitación de Miembros de Equipo**: Correo con botón de aceptación y asignación de rol.
    3. **Alerta Crítica de Infraestructura / Router**: Notificación por email cuando se detecta falla reiterada en la API de MikroTik.
  - Flujo de Recuperación de Contraseña:
    - **`/forgot-password`**: Formulario público donde el usuario ingresa su email registrado.
    - **`/reset-password`**: Formulario público que valida el token (expiración de 30 minutos) y permite ingresar la nueva clave.
  - Generación y almacenamiento seguro de tokens tokenizados (`password_resets` y `team_invitations`).
  - Integración del envío automático de invitaciones desde `/settings/team`.
- **OUT OF SCOPE**:
  - Envíos masivos o boletines de Email Marketing.

---

## User Stories

### US1 — Recuperación de Contraseña Tokenizada (`/forgot-password` & `/reset-password`) (Priority: P1)
**Como** Usuario del Sistema  
**Quiero** solicitar el restablecimiento de mi contraseña desde `/forgot-password`  
**Para** recibir un enlace seguro en mi correo electrónico y actualizar mi clave si la he olvidado.

#### Criterios de Aceptación:
- Al ingresar el email registrado en `/forgot-password`, el sistema genera un token único (almacenado con timestamp y TTL de 30 minutos) y envía el correo con la URL `/reset-password?token=...`.
- Al acceder a `/reset-password?token=...`, la página valida que el token sea legítimo y no haya expirado.
- Al guardar la nueva contraseña, se actualiza el `password_hash` del usuario y el token queda invalidado de inmediato.

---

### US2 — Invitaciones de Equipo por Correo Electrónico (`/settings/team`) (Priority: P1)
**Como** Administrador de ISP  
**Quiero** que el sistema envíe automáticamente un correo de invitación cuando registre a un integrante en `/settings/team`  
**Para** que el nuevo operador reciba su enlace de bienvenida y configure sus datos de acceso.

#### Criterios de Aceptación:
- Al invitar a un usuario desde `/settings/team`, el servidor genera un registro de invitación con token y dispara el correo de bienvenida.
- El correo incluye el Nombre del ISP, el rol asignado (`Admin`, `Cobranzas`, `Técnico`) y un botón para "Aceptar Invitación".
- Al hacer clic en el enlace, el usuario activa su cuenta y completa su registro en la organización.

---

### US3 — Alertas de Falla en Routers MikroTik (Priority: P1)
**Como** Administrador de ISP  
**Quiero** recibir una alerta por correo electrónico cuando mi Router MikroTik pierda conexión  
**Para** tomar acciones correctivas inmediatas y evitar interrupciones en la automatización de la red.

#### Criterios de Aceptación:
- Cuando `RouterService.testConnection` o los procesos de auto-corte detectan un fallo de comunicación con la API REST del router, el sistema dispara el correo de alerta.
- El correo incluye el Nombre del Router, Host / IP, código de estado y fecha/hora exacta del incidente.

---

## Constitution Compliance Audit

| Principio Constitucional | Mecanismo de Cumplimiento en Feature 007 |
|---|---|
| **I. Multi-Tenancy Absoluto** | Los tokens de invitación y notificación de alertas están estrictamente vinculados a `organization_id`. |
| **II. Seguridad de Tokens** | Tokens de recuperación aleatorios (cryptographic random hex 32 bytes) con TTL estricto (30 mins para contraseñas, 7 días para invitaciones). |
| **III. Calidad Verificable** | Pruebas unitarias para `EmailService` con transporte mock/test y pruebas de integración para el flujo de token. |

---

## Data Model Extensions & API Contracts

### 1. Table: `password_resets`
- `id` (UUID, Primary Key)
- `userId` (UUID, FK -> `users.id`, NOT NULL)
- `token` (TEXT, UNIQUE, NOT NULL)
- `expiresAt` (TIMESTAMP, NOT NULL)
- `usedAt` (TIMESTAMP, nullable)
- `createdAt` (TIMESTAMP, DEFAULT NOW())

---

### 2. Table: `team_invitations`
- `id` (UUID, Primary Key)
- `organizationId` (UUID, FK -> `organizations.id`, NOT NULL)
- `email` (TEXT, NOT NULL)
- `role` (TEXT, NOT NULL)
- `token` (TEXT, UNIQUE, NOT NULL)
- `expiresAt` (TIMESTAMP, NOT NULL)
- `acceptedAt` (TIMESTAMP, nullable)
- `createdAt` (TIMESTAMP, DEFAULT NOW())

---

### Endpoints de API

- **`POST /api/auth/forgot-password`**: Genera token y envía email de recuperación.
- **`POST /api/auth/reset-password`**: Recibe `token` y `newPassword`, actualiza contraseña y marca token como usado.
- **`GET /api/auth/verify-token`**: Valida validez de un token.
