# Plan de Ejecución Técnico: 011-hardening-auth-multitenant

**Feature**: Hardening de Autenticación, Capa de Sesión Firmada, Middleware Edge, Aislamiento Multi-Tenant Estricto e Integraciones Reales  
**Branch**: `011-hardening-auth-multitenant`  
**Spec**: [spec.md](./spec.md)  

---

## 1. Arquitectura & Estrategia Técnica

### 1.1 Principio Rector
Actualmente el tenant viaja en un header `X-Organization-ID` o cae en un fallback hardcodeado (`DEFAULT_ORG_ID`). El plan sustituye este modelo por un **aislamiento en runtime basado estrictamente en sesiones autenticadas y firmadas criptográficamente** (`saas_toi_session` con `SESSION_SECRET`).

```
                    ┌────────────────────────────────┐
   Petición HTTP ──▶│  src/middleware.ts (Edge)      │ ── Allowlist pública (login, webhooks, etc.) → Pasa
                    │  ¿Cookie saas_toi_session OK?  │ ── Inválida / Ausente → 401 / Redirección /login
                    └───────────────┬────────────────┘
                                    │ Token verificado (HMAC / JWT)
                    ┌───────────────▼────────────────┐
                    │  src/lib/auth.ts               │
                    │  getSessionContext()           │ ── Extrae organization_id & user_id de la sesión
                    └───────────────┬────────────────┘
                                    │ TenantContext garantizado
                                    ▼
                    Capa de Servicios & Consultas SQL (Filtrado estricto por organization_id)
```

---

## 2. Fases de Implementación Secuencial

### Fase 1: Sanitización de Emergencia y Hashing Seguro
- **Eliminación de Backdoor**: Eliminar el archivo y la ruta `src/app/api/auth/seed-superadmin/route.ts`.
- **Sanitización de Variables de Entorno**: Limpiar `.env.example` reemplazando las llaves R2 de Cloudflare y secretos expuestos por variables sanitizadas tipo `<YOUR_R2_ACCESS_KEY>` y `<YOUR_SESSION_SECRET>`.
- **Hashing Robusto**: Reemplazar SHA-256 en `auth.service.ts` y `password.ts` por `scrypt` (o `bcrypt` nativo de Node.js `crypto`), implementando un salt aleatorio por usuario y comparaciones de tiempo constante con `crypto.timingSafeEqual`.

### Fase 2: Capa de Sesión Firmada y Middleware Edge
- **Utilidad de Firma/Verificación**: Crear `src/lib/session.ts` para firmar y verificar los tokens de sesión usando `JOSE` / `jsonwebtoken` / `crypto.subtle` respaldado obligatoriamente por `SESSION_SECRET`.
- **Emisión de Cookie de Login**: Modificar `src/app/api/auth/login/route.ts` para escribir la cookie `saas_toi_session` firmada con las banderas `HttpOnly; Secure; SameSite=Lax; Path=/`.
- **Middleware Edge Centralizado**: Crear `src/middleware.ts` en la raíz del proyecto para interceptar y validar la cookie de sesión en todas las rutas bajo `/(dashboard)/*` y `/api/*` (exceptuando `/api/auth/login`, `/api/register`, `/api/waba/webhook`, y páginas públicas como `/login`, `/privacy`, `/terms`).

### Fase 3: Aislamiento Multi-Tenant Real (Runtime Handshake)
- **Refactorización del Contexto de Sesión**: Actualizar `getSessionContext()` en `src/lib/auth.ts` para extraer `organization_id` y `user_id` estrictamente del payload de la sesión validada.
- **Eliminación de Headers Suplantables**: Deshabilitar la lectura no confiable del header `X-Organization-ID` para usuarios normales (permitiéndolo únicamente si existe un flag explícito de impersonación auditada verificado para un Super Admin).
- **Barrido Total de Default Org**: Eliminar la constante `DEFAULT_ORG_ID` (`00000000-0000-0000-0000-000000000001`) hardcodeada en las ~24 rutas de API y páginas del dashboard, sustituyéndolas por el contexto de sesión obligatorio.

### Fase 4: RBAC, Email Real y Hardening Operativo
- **Guard RBAC de Super Admin**: Proteger las rutas bajo `/api/super-admin/*` con middleware/guard que verifique explícitamente `role === 'super_admin'`.
- **Integración de Email Transaccional Real**: Sustituir el mock en `email.service.ts` integrando una librería real (`resend` o `nodemailer`) para el envío de restablecimiento de contraseñas e invitaciones de equipo, agregando manejo elegante de fallos si faltan credenciales SMTP/Resend.
- **Autenticación Estricta de Cron**: Hacer obligatorio el header `Authorization: Bearer <CRON_SECRET>` (o `x-cron-secret`) en las rutas `/api/cron/*`.
- **Depuración de Webhooks WhatsApp**: Unificar y redirigir el tráfico del webhook legacy `/api/webhooks/whatsapp` hacia `/api/waba/webhook`, marcándolo como deprecated/removido.

### Fase 5: Verificación de Integración y Gate de Calidad
- **Pruebas Integradas de Perímetro**: Ejecutar suite de pruebas integradas ejercitando llamadas HTTP sintéticas con cookies firmadas, cookies manipuladas y peticiones no autenticadas.
- **Validación de Aislamiento Multi-Tenant**: Validar que un Tenant A no pueda leer ni alterar registros del Tenant B, aun manipulando headers `X-Organization-ID` o modificando cookies.
- **Gate Técnico Final**: Ejecutar typecheck (`tsc --noEmit`), linter (`pnpm lint`) y compilación de producción (`pnpm build`).

---

## 3. Matriz de Cambios por Archivo

| Archivo | Fase | Tipo | Descripción de Cambio |
|---|---|---|---|
| `src/app/api/auth/seed-superadmin/route.ts` | 1 | Eliminación | Remoción completa del endpoint inseguro. |
| `.env.example` | 1 | Edición | Sanitización de credenciales R2 y agregado de `SESSION_SECRET`. |
| `src/lib/password.ts` / `auth.service.ts` | 1 | Edición | Cambio de SHA-256 a scrypt/bcrypt + timingSafeEqual. |
| `src/lib/session.ts` | 2 | Nuevo | Firma HMAC/JWT y verificación de cookie `saas_toi_session`. |
| `src/app/api/auth/login/route.ts` | 2 | Edición | Emisión de cookie HttpOnly/Secure/SameSite=Lax firmada. |
| `src/middleware.ts` | 2 | Nuevo | Edge middleware de protección para `/(dashboard)` y `/api/*`. |
| `src/lib/auth.ts` | 3 | Edición | Extracción estricta de tenant desde sesión; bloqueo de header header suplantable. |
| ~24 rutas API y páginas (Dashboard) | 3 | Edición | Remoción de `DEFAULT_ORG_ID` y uso de `getSessionContext()`. |
| `src/app/api/super-admin/*` | 4 | Edición | Guard RBAC estricto para `super_admin`. |
| `src/services/email.service.ts` | 4 | Edición | Integración con Resend / Nodemailer real. |
| `src/app/api/cron/*` | 4 | Edición | Exigencia obligatoria de `CRON_SECRET`. |
| `src/app/api/webhooks/whatsapp/route.ts` | 4 | Edición | Deprecación/Redirección hacia `/api/waba/webhook`. |
| `tests/integration/auth-multitenant.test.ts` | 5 | Nuevo | Suite de pruebas de aislamiento y sesión en runtime HTTP. |
