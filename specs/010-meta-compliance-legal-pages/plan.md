# Plan de Implementación: 010-meta-compliance-legal-pages

**Feature**: Páginas Públicas Institucionales Requeridas por Meta App Review (`/privacy`, `/terms`, `/data-deletion`)  
**Branch**: `010-meta-compliance-legal-pages`

---

## 1. Arquitectura & Estrategia Técnica

- **Framework**: Next.js (App Router) con páginas públicas dinámicas / SSR en `/privacy`, `/terms` y `/data-deletion`.
- **Estilo Visual**: Canvas `#060709`, tarjetas esmeriladas `.glass-card-dark`, bordes reflejantes `rgba(255,255,255,0.08)`, tipografía `Plus Jakarta Sans`.
- **Header & Footer Institucionales**: Componentes reutilizables `LegalHeader.tsx` y `LegalFooter.tsx` en `src/components/legal/`.
- **Formulario Interactivo de Supresión**: Componente React `DataDeletionForm.tsx` en `/data-deletion` que se comunica con la API Route `/api/data-deletion` para emitir un recibo visual con código de seguimiento (`DEL-[hash]`).
- **Resiliencia**: Páginas totalmente públicas y renderizables sin requerir autenticación ni acceso obligatorio a base de datos para lectura.

---

## 2. Fases de Trabajo

### Fase 1: Componentes Base de UI Legales
- Crear `src/components/legal/LegalHeader.tsx` con navegación por tabs, indicador de estado Meta Verified y botón de retorno a `/`.
- Crear `src/components/legal/LegalFooter.tsx` con resumen institucional y badges de seguridad AES-256-GCM.

### Fase 2: Formulario Interactivo y API Route de Eliminación
- Perfeccionar `/api/data-deletion/route.ts` para gestionar solicitudes de borrado del formulario y callbacks de Meta Graph API.
- Crear `src/components/legal/DataDeletionForm.tsx` con validación, estado de envío y visualización del recibo `DEL-XXXXXX`.

### Fase 3: Renderizado y Contenido Redactado de Páginas Legales
- Actualizar `src/app/privacy/page.tsx` con redacción legal completa y diseño Dark Glassmorphism.
- Actualizar `src/app/terms/page.tsx` con condiciones de servicio, políticas anti-spam y responsabilidad ISP/Meta.
- Actualizar `src/app/data-deletion/page.tsx` integrando el instructivo visual Meta Business Manager y el `DataDeletionForm`.

### Fase 4: Verificación & Quality Gate
- Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- Prueba funcional E2E en navegador sin sesión iniciada.
