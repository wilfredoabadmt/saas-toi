# Feature Specification: 010-meta-compliance-legal-pages

**Feature Branch**: `010-meta-compliance-legal-pages`  
**Created**: 2026-07-26  
**Status**: Draft  
**Input**: Páginas públicas institucionales requeridas por Meta App Review (`/privacy`, `/terms`, `/data-deletion`) para SaaS Multi-Tenant de ISPs (WhatsApp Cloud API & MikroTik Automation).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Política de Privacidad & Cumplimiento Meta (`/privacy`) (Priority: P1)

**Como** Evaluador de Meta (App Reviewer) / Usuario / Cliente del ISP  
**Quiero** acceder a la ruta pública `/privacy` sin necesidad de autenticación  
**Para** revisar la Política de Privacidad, verificar el tratamiento de datos personales, identificadores de Meta (WABA ID, Phone Number ID, tokens de acceso), cifrado en reposo (AES-256-GCM) y aislamiento estricto multi-tenant (`organization_id`).

**Why this priority**: Es un requisito bloqueante para la aprobación de la App de Meta en el proceso de App Review como Tech Provider de WhatsApp Cloud API.

**Independent Test**: Navegar directamente a `http://localhost:3000/privacy` o la URL de producción sin sesión iniciada. La página debe cargar de forma instantánea (< 1 segundo), mostrando el contenido completo formateado en tarjetas de vidrio esmerilado (`.glass-card-dark`) con la declaración legal requerida.

**Acceptance Scenarios**:
1. **Given** un visitante anónimo o Evaluador de Meta, **When** accede a `/privacy`, **Then** la página carga sin redireccionar al `/login`, en menos de 1 segundo.
2. **Given** el contenido de `/privacy`, **When** se examinan las secciones, **Then** contiene declaraciones explícitas sobre:
   - Datos recopilados (Cuenta ISP, abonados: teléfono, nombre, plan, saldo; e Identificadores Meta: WABA ID, Phone Number ID, access tokens).
   - Uso de la información (Procesamiento de webhooks WhatsApp, plantillas de utilidad Utility, soporte y automatización MikroTik).
   - Seguridad (Cifrado en reposo AES-256-GCM, aislamiento `organization_id` y compromiso estricto de cero venta de datos).
   - Derechos ARCO (Mecanismos de acceso, rectificación y supresión de datos).

---

### User Story 2 — Términos de Servicio y Condiciones SaaS (`/terms`) (Priority: P1)

**Como** Evaluador de Meta / Cliente ISP  
**Quiero** consultar las Condiciones del Servicio en la ruta pública `/terms`  
**Para** entender los derechos, obligaciones, políticas anti-spam, reglas de consentimiento (opt-in) y términos de uso de la WhatsApp Cloud API.

**Why this priority**: Exigencia legal y de Meta para definir los límites de responsabilidad, prohibición de spam en cobranzas y adherencia obligatoria a las *Meta Business Messaging Policy* y *Commerce Policy*.

**Independent Test**: Acceder a `/terms` de forma pública y verificar que la estructura legal cumpla con las cláusulas de consentimiento y responsabilidad del ISP.

**Acceptance Scenarios**:
1. **Given** un usuario navegando en `/terms`, **When** revisa las cláusulas de uso aceptable, **Then** observa la prohibición explícita de spam, acoso en cobranzas y el requisito indispensable de contar con el consentimiento (opt-in) previo de los abonados.
2. **Given** un cliente evaluando el servicio, **When** consulta las garantías de SLA e infraestructura, **Then** se detalla la limitación de responsabilidad ante caídas de la infraestructura de terceros (Meta Graph API o proveedores de conectividad).

---

### User Story 3 — Instrucciones y Callback de Eliminación de Datos Meta (`/data-deletion`) (Priority: P1)

**Como** Evaluador de Meta / Cliente ISP  
**Quiero** acceder a la ruta pública `/data-deletion`  
**Para** consultar las instrucciones paso a paso de revocación desde Meta Business Manager y contar con un formulario/mecanismo interactivo para solicitar el borrado completo de datos de WhatsApp/WABA en un plazo máximo de 30 días.

**Why this priority**: Meta exige una URL pública de Instrucciones de Eliminación de Datos (`Data Deletion Instructions URL`) con confirmación visual o recibo de seguimiento para validar la integración de WhatsApp Cloud API.

**Independent Test**: Enviar una solicitud desde el formulario interactivo en `/data-deletion`, verificar la emisión inmediata de un código único de confirmación (recibo de seguimiento `DEL-XXXXXX`) e instrucciones claras de purga de datos.

**Acceptance Scenarios**:
1. **Given** un usuario en `/data-deletion`, **When** revisa la sección de revocación de Meta, **Then** encuentra la guía paso a paso con captura/diagrama para desvincular la app desde el panel de *Meta Business Manager / Facebook Apps*.
2. **Given** un cliente que desea purgar su información, **When** completa el formulario de solicitud de supresión de datos con su email y WABA ID, **Then** el sistema emite una confirmación visual con un ticket/código de seguimiento único (`DEL-[hash]`) y notifica al equipo de Super Admin.

---

### Edge Cases

- **Acceso sin conectividad a base de datos**: Las páginas legales (`/privacy`, `/terms`, `/data-deletion`) deben ser resilientemente renderizables (SSR o HTML estático/estratégico) de modo que carguen aun si la base de datos experimenta latencia o caída temporal.
- **Formulario de eliminación sin WABA ID o datos incompletos**: El formulario en `/data-deletion` debe validar los campos requeridos (email de contacto y/o WABA ID) con Zod y feedback claro en pantalla antes de generar el ticket.
- **Navegación móvil o pantallas pequeñas**: El header flotante de vidrio esmerilado y las tarjetas de contenido legal deben ajustarse fluidamente en dispositivos móviles (responsive web design).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Las rutas `/privacy`, `/terms` y `/data-deletion` DEBEN ser completamente públicas, sin requerir tokens JWT, cookies de sesión ni redireccionar al formulario de autenticación (`/login`).
- **FR-002**: La página `/privacy` DEBE incluir cláusulas específicas sobre:
  - Cifrado en reposo AES-256-GCM de tokens de Meta y credenciales WABA.
  - Aislamiento lógico multi-tenant obligatorio mediante `organization_id`.
  - Tratamiento exclusivo para la entrega de notificaciones de utilidad (Utility templates), gestión de cobros y corte/reconexión de servicio ISP.
  - Cero transferencia o venta de datos de suscriptores a terceros.
- **FR-003**: La página `/terms` DEBE incorporar:
  - Adherencia obligatoria a las *Meta Business Messaging Policy* y *Commerce Policy*.
  - Garantía por parte del ISP de haber obtenido el consentimiento inequívoco (opt-in) de sus abonados.
  - Cláusula de exención de responsabilidad del SaaS ante interrupciones de servicios de Meta o proveedores de telecomunicaciones.
- **FR-004**: La página `/data-deletion` DEBE ofrecer:
  - Instructivo visual y detallado para desautorizar la App desde *Meta Business Manager*.
  - Formulario interactivo con envio de correo o registro de ticket de supresión de datos para el Super Admin.
  - Generación de un código de confirmación de eliminación (código de seguimiento) mostrado en pantalla inmediatamente tras el envío.
- **FR-005**: El diseño visual DEBE aplicar estrictamente la guía estética **Dark Glassmorphism**:
  - Fondo Canvas: `#060709`.
  - Tarjetas y paneles: `.glass-card-dark` con bordes reflejantes (`border: 1px solid rgba(255, 255, 255, 0.08)`) y efecto esmerilado (`backdrop-filter: blur(16px)`).
  - Tipografía: Google Fonts `'Plus Jakarta Sans'`.
- **FR-006**: Se DEBE proveer un Header flotante institucional común para las tres páginas con:
  - Enlace/Botón de retorno a la Landing Page (`/`).
  - Navegador rápido de pestañas/pills entre Legal `/privacy`, `/terms` y `/data-deletion`.
  - Selector de idioma (Español / English) o diseño bilingüe accesible.

---

### Key Entities

- **DataDeletionRequest**:
  - `id` (UUID)
  - `email` (string)
  - `waba_id` (string, opcional)
  - `confirmation_code` (string, e.g. `DEL-8F92A1`)
  - `status` (enum: `pending`, `processing`, `completed`)
  - `created_at` (timestamp)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las 3 páginas públicas (`/privacy`, `/terms`, `/data-deletion`) registran un First Contentful Paint (FCP) e inicio de carga inferior a **1.0 segundo**.
- **SC-002**: Cumplimiento del 100% de los requisitos estipulados por Meta App Review para proveedores de solución WhatsApp Business API (cifrado, borrado de datos, opt-in y exención de responsabilidad).
- **SC-003**: Formulario de `/data-deletion` emite un comprobante visual con `confirmation_code` en menos de **500 ms** tras el submit.
- **SC-004**: Evaluación de diseño UI: 0 errores de contraste o desbordamiento en pantallas móviles y de escritorio sobre el canvas `#060709`.

---

## Assumptions

- Las páginas legales se implementan en Next.js (App Router) en las rutas `/privacy/page.tsx`, `/terms/page.tsx` y `/data-deletion/page.tsx`.
- La recopilación de solicitudes de eliminación en `/data-deletion` interactúa con una Server Action o API Route `/api/legal/data-deletion` que devuelve el código de confirmación visual requerido por Meta Graph API.
