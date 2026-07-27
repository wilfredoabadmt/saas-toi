# Plan de Implementación: 011-hardening-auth-multitenant

**Feature**: Autenticación real, sesiones revocables y aislamiento multi-tenant a prueba de manipulación
**Branch**: `011-hardening-auth-multitenant`
**Spec**: [spec.md](./spec.md)

---

## 1. Arquitectura & Estrategia Técnica

### 1.1 Principio rector

Hoy el tenant viaja en un **header que el cliente controla**. Después de esta feature, el tenant vive en **un registro de base de datos que el cliente no puede tocar**, y la cookie es solo un puntero opaco hacia él. Toda la implementación se reduce a mover la fuente de verdad de un sitio al otro y luego barrer todos los puntos que dependían del sitio viejo.

### 1.2 Modelo de sesión

Sesiones **persistidas y revocables** (decisión del dueño, 2026-07-26):

```
cookie: saas_toi_session = <token_b64url_32bytes>.<hmac_sha256(token, SESSION_SECRET)>
                            └─ opaco, sin significado ─┘  └─ detecta manipulación sin ir a BD ─┘

tabla sessions:  token_hash = sha256(token)   ← se guarda el HASH, nunca el token
```

Dos capas deliberadas:
- La **firma HMAC** permite descartar cookies basura sin consultar la base (barato ante ataques de fuerza bruta).
- El **hash en base** garantiza que un volcado de la tabla `sessions` no permita suplantar a nadie — mismo criterio que se aplica a las contraseñas.

Ventaja frente a JWT stateless: al suspender un tenant desde el panel Super Admin, la siguiente petición del ISP se corta al instante en lugar de seguir viva hasta 7 días.

### 1.3 Resolución del contexto: un único camino

```
                        ┌──────────────────────────────┐
   Petición HTTP ──────▶│  src/middleware.ts           │  allowlist pública → pasa
                        │  ¿cookie firmada presente?   │  si no → 401 / redirect /login
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │  lib/session.ts              │  sessions ⋈ users ⋈ organizations
                        │  resolveSession()            │  valida expiración + org.status
                        └──────────────┬───────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
  requireSession()             requireRole(...)              getServerSession()
  (rutas API)                  (RBAC en API)                 (Server Components)
        │                              │                              │
        └──────────────────────────────┴──────────────────────────────┘
                                       │
                          organizationId  ───▶  capa de servicios (ya exige el scope)
```

La capa de servicios **no se toca**: ya recibe `organizationId` explícito y lanza `MissingTenantContextError` si falta. El bug nunca estuvo ahí; estuvo en quién le pasaba el valor.

### 1.4 Decisiones técnicas y su porqué

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Sesiones en BD | JWT stateless | Revocación inmediata al suspender un tenant; cierre de sesión real |
| `scrypt` de `node:crypto` | bcrypt / argon2 | Cero dependencias nuevas, resistente a GPU, disponible en el runtime Node de Next |
| Hash del token en BD | Token en claro | Un volcado de `sessions` no debe permitir suplantación |
| Middleware **+** guard por handler | Solo middleware | Defensa en profundidad: un `matcher` mal escrito no puede abrir todo el sistema |
| 404 en acceso cruzado | 403 | No confirmar la existencia de recursos de otro tenant |
| Rol leído del usuario vivo | Rol congelado en la cookie | Un cambio de rol o una expulsión surten efecto en la petición siguiente |
| Seed de super admin por CLI | Endpoint HTTP protegido | Elimina por completo la superficie de ataque en lugar de custodiarla |

### 1.5 Riesgo principal y su mitigación

**Riesgo**: quedarse a medias. Un barrido incompleto de los 23 archivos con organización hardcodeada deja rutas que siguen sirviendo datos de la org demo y da una falsa sensación de cierre.

**Mitigación**: la Fase 6 añade al gate un **grep que falla el build** si reaparece el literal de la org demo o una lectura de `x-organization-id`. La regresión deja de depender de que alguien se acuerde.

---

## 2. Fases de Trabajo

Ordenadas por dependencia; las Fases 0 y 1 desbloquean todo lo demás.

### Fase 0 — Contención inmediata *(sin dependencias, se puede ejecutar ya)*
Cierra las dos vías explotables desde internet **hoy**, sin esperar al resto de la feature.
- Rotar en Cloudflare las llaves R2 expuestas y limpiar `.env.example` dejando solo marcadores `REEMPLAZA_*`.
- Eliminar `src/app/api/auth/seed-superadmin/route.ts`.
- Documentar en `.env.example` las variables faltantes, incluida la nueva `SESSION_SECRET`.

### Fase 1 — Núcleo de sesión
- Esquema `sessions` (`src/db/schema/sessions.ts`) + migración Drizzle.
- `src/lib/session.ts`: `createSession`, `resolveSession`, `destroySession`, `destroyAllSessionsForOrg`, sellado/verificación HMAC de la cookie.
- `src/lib/password.ts`: `hashPassword` (scrypt), `verifyPassword` con detección del formato heredado SHA-256 y `needsRehash`.

### Fase 2 — Perímetro HTTP
- `src/middleware.ts` con allowlist explícita de rutas públicas (landing, auth, legales, webhooks de Meta, health, cron).
- Reescritura de `src/lib/auth.ts`: `getSessionContext()` pasa a leer solo la sesión; se borran el fallback y la lectura de headers.
- `requireSession()` / `requireRole()` para rutas API y `getServerSession()` para Server Components.
- `src/lib/waba/tenant-context.ts`: apuntar a la nueva resolución, conservando su contrato de lanzar en vez de devolver un valor por defecto.

### Fase 3 — Barrido de la organización hardcodeada *(el grueso mecánico: 23 archivos)*
- 16 rutas API: sustituir `DEFAULT_ORG_ID` por `requireSession()` + validación de rol.
- 4 páginas del dashboard: sustituir la constante local por `getServerSession()`.
- `lib/auth.ts`, `services/auth.service.ts`, `db/seed.ts`: eliminar los literales restantes.
- Acceso por UUID a recursos ajenos: devolver 404 en lugar de 403.

### Fase 4 — Autenticación, roles y estado del tenant
- `AuthService`: login determinista con email duplicado entre orgs, respuesta y tiempo indistinguibles ante fallo, rehash transparente.
- `POST /api/auth/logout` + control visible en el dashboard.
- Rate limiting por IP en las tres rutas de `/api/auth/*`.
- `super_admin` incorporado a `UserRole` y `ROLE_PERMISSIONS`; guard en `/api/super-admin/*` y `/super-admin/*`.
- `status` de organización aplicado: `/register` crea `pending`, pantalla de "pendiente de aprobación", aprobación/suspensión desde el panel Super Admin con revocación de sesiones vivas.
- Script CLI `scripts/create-super-admin.ts` que se niega a ejecutarse si ya existe un `super_admin`.

### Fase 5 — UI real
- Layout del dashboard: nombre, organización, rol y plan tomados de la sesión; fuera los valores hardcodeados.
- Navegación filtrada por rol (control cosmético, nunca el único).

### Fase 6 — Verificación
- Pruebas de perímetro HTTP (FR-020) que fallan si se reintroduce cualquiera de H-01 a H-09.
- Grep de regresión en el gate.
- `CRON_SECRET` obligatorio y purga de sesiones expiradas en `/api/cron/cleanup`.
- Gate completo + self-test E2E en navegador con dos organizaciones reales (Principio VI).

---

## 3. Contratos de los módulos nuevos

```ts
// src/lib/session.ts
export interface SessionData {
  userId: string;
  organizationId: string;
  role: UserRole;
  userName: string;
  organizationName: string;
  organizationStatus: 'pending' | 'active' | 'suspended';
}

createSession(userId, organizationId, meta?): Promise<{ cookieValue: string; expiresAt: Date }>
resolveSession(cookieValue: string | undefined): Promise<SessionData | null>  // null = no autenticado
destroySession(cookieValue: string): Promise<void>
destroyAllSessionsForOrg(organizationId: string): Promise<number>  // suspensión inmediata

// src/lib/auth.ts  (contrato reescrito, mismo nombre para no romper importadores)
getSessionContext(): Promise<TenantContext>          // lanza UNAUTHORIZED si no hay sesión
requireSession(): Promise<SessionData>               // + valida organizationStatus === 'active'
requireRole(...roles: UserRole[]): Promise<SessionData>
getServerSession(): Promise<SessionData | null>      // Server Components

// src/lib/password.ts
hashPassword(plain: string): string                  // scrypt$N$r$p$<salt_b64>$<hash_b64>
verifyPassword(plain: string, stored: string): boolean   // acepta scrypt$… y SHA-256 heredado
needsRehash(stored: string): boolean
```

**Nota de compatibilidad**: `getSessionContext()` conserva nombre y forma de retorno para que las 16 rutas que ya lo usan no requieran cambios de firma — cambia su implementación, no su contrato. Deja de aceptar el parámetro `request`.

---

## 4. Plan de Verificación *(Principio VI — Verificación de Comportamiento en Vivo)*

El gate técnico no basta: hoy está verde y el sistema es vulnerable. La verificación es **de comportamiento**, conducida por mí.

### 4.1 Automática (entra al gate)
- Perímetro: 401 sin sesión en todas las rutas de negocio; headers de tenant falsificados ignorados; 404 en acceso cruzado por UUID; 403 por rol; 403 en `/api/super-admin/*`; 404 en el seed eliminado.
- Contraseñas: mismo password → hashes distintos; hash SHA-256 heredado valida y se migra; `timingSafeEqual` en uso.
- Sesión: logout invalida; cookie manipulada rechazada; sesión de org suspendida rechazada.
- Grep de regresión: 0 ocurrencias del literal de org demo y de `x-organization-id` en `src/`.

### 4.2 En vivo (yo la ejecuto, no se delega)

Escenario de dos tenants con datos reales:
1. Crear Org A ("ISP Alfa") y Org B ("ISP Beta") con un abonado distintivo cada una.
2. Login como A en el navegador → verificar que el dashboard muestra "ISP Alfa" y solo su abonado.
3. Con la cookie de A, `curl -H "X-Organization-ID: <uuid-B>"` contra las 6 familias de endpoints → **cero** datos de B.
4. `GET /api/subscribers/<id-del-abonado-de-B>` con sesión de A → 404.
5. Logout → reutilizar la cookie → 401.
6. Login con un usuario `technician` → `/settings/team` y `/api/team` → 403.
7. Registrar Org C → login → pantalla "pendiente de aprobación" → aprobar desde Super Admin → operar sin reiniciar sesión.
8. Suspender Org A mientras su sesión está viva → siguiente petición cortada.
9. `POST /api/auth/seed-superadmin` → 404. `/api/super-admin/tenants` con sesión de admin de ISP → 403.

### 4.3 Camino infeliz (obligatorio, Definición de Hecho REFORZADA)
- Cookie con firma válida pero `token_hash` inexistente en base → 401 limpio, sin excepción no controlada.
- Sesión válida cuyo usuario fue eliminado del equipo → 401, no crash.
- Base de datos caída durante la resolución → 503 con mensaje claro, **nunca** acceso permitido.
- Webhook de Meta con el middleware activo → sigue respondiendo 200 en ≤ 5 s (romperlo desactiva la integración de WhatsApp).
- 11 intentos de login en un minuto → el undécimo devuelve 429.

### 4.4 Pendiente de verificación humana
- Rotación efectiva de las llaves R2 en el panel de Cloudflare (requiere acceso del dueño).
- Confirmación visual del layout del dashboard con datos reales de sesión.

---

## 5. Orden de ejecución y puntos de corte

```
Fase 0 ──▶ Fase 1 ──▶ Fase 2 ──▶ Fase 3 ──▶ Fase 4 ──▶ Fase 5 ──▶ Fase 6
(ya)       (núcleo)   (perímetro) (barrido)  (auth/RBAC) (UI)      (verificación)
   │           │          │
   │           │          └─ Punto de corte 1: aquí el sistema ya es seguro aunque
   │           │             algunas rutas devuelvan 401 de más. Desplegable.
   │           └─ Sin esto nada más compila: es la base de todo.
   └─ Independiente: se puede hacer y desplegar hoy mismo.
```

**Punto de corte 1** (fin de Fase 3): las brechas críticas están cerradas y el aislamiento es efectivo. Si hubiera urgencia por publicar, es el mínimo desplegable con seguridad.
**Punto de corte 2** (fin de Fase 4): funcionalmente completo; solo falta la UI real y la verificación formal.

## 6. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Barrido incompleto de los 23 archivos | Rutas siguen sirviendo la org demo | Grep de regresión en el gate (Fase 6) |
| Middleware bloquea webhooks de Meta | WhatsApp deja de funcionar; Meta desactiva el webhook | Allowlist explícita + prueba de camino infeliz 4.3 |
| Usuarios existentes pierden acceso | Interrupción para el dueño y los ISPs actuales | `verifyPassword` acepta el formato heredado; rehash transparente (SC-005) |
| Regresión en el módulo WABA | Se rompe la conexión ya aprobada | `tenant-context.ts` conserva su contrato; solo cambia el origen del tenant |
| El literal de la org demo sigue en el seed | Tráfico real vuelve a caer en la org demo | Seed marcado como exclusivo de desarrollo local |
