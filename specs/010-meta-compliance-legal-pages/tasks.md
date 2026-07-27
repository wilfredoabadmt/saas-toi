# Tareas de Implementación: 010-meta-compliance-legal-pages

## Tareas

- [x] **T01-LegalUI**: Crear `src/components/legal/LegalHeader.tsx` y `src/components/legal/LegalFooter.tsx` con diseño Dark Glassmorphism `#060709` y tabs de navegación.
- [x] **T02-DeletionAPI**: Crear/actualizar `src/app/api/data-deletion/route.ts` y `src/app/api/legal/data-deletion/route.ts` para retornar la respuesta JSON requerida por Meta App Review (`confirmation_code`, `url`).
- [x] **T03-DeletionForm**: Crear `src/components/legal/DataDeletionForm.tsx` con formulario cliente interactivo y emisión de comprobante de borrado `DEL-XXXXXX`.
- [x] **T04-PrivacyPage**: Rediseñar y redactar la página `/privacy` (`src/app/privacy/page.tsx`) con cláusulas completas de cifrado AES-256, WABA y multi-tenancy.
- [x] **T05-TermsPage**: Rediseñar y redactar la página `/terms` (`src/app/terms/page.tsx`) con condiciones de uso aceptable, políticas anti-spam y SLA.
- [x] **T06-DeletionPage**: Rediseñar `/data-deletion` (`src/app/data-deletion/page.tsx`) integrando instructivo Meta Business Manager y el `DataDeletionForm`.
- [x] **T07-Verification**: Ejecutar `pnpm typecheck`, `pnpm lint` y `pnpm build` para asegurar 0 errores de compilación y verificar la experiencia en vivo.
