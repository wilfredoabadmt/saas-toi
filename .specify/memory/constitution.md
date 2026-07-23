<!--
SYNC IMPACT REPORT
==================
Constitución personalizada: SaaS TOI — Gestión, Cobranza y Atención para ISPs.

Versión actual: 2.0.0
Principios definidos (10):
  - I.    Multi-Tenancy Absoluto (NO NEGOCIABLE)
  - II.   Seguridad de Credenciales y Cumplimiento con Meta (NO NEGOCIABLE)
  - III.  Idempotencia y Resiliencia en Webhooks (NO NEGOCIABLE)
  - IV.   Cumplimiento Estricto de Políticas de WhatsApp — Categoría UTILITY
  - V.    Calidad Verificable Antes de "Hecho" (NO NEGOCIABLE)
  - VI.   Verificación de Comportamiento en Vivo (NO NEGOCIABLE)
  - VII.  Almacenamiento Estándar S3
  - VIII. Foco Vertical ISP — Proveedores de Servicios de Internet
  - IX.   Specs Antes de Código
  - X.    Trazabilidad de Decisiones

Historial:
  - 1.0.0: 8 principios base del starter (I-VII genéricos + VIII hueco del nicho).
  - 1.1.0: añadido Principio IX "Verificación de Comportamiento en Vivo".
  - 2.0.0: personalización completa para SaaS TOI — ISPs.
    - Multi-Tenancy promovido a Principio I (NO NEGOCIABLE, era III ajustable).
    - Seguridad de Credenciales ampliada con mandato explícito de Meta.
    - Idempotencia especializada con firma HMAC-SHA256 + dedup por wamid.
    - Nuevo: Principio IV — Cumplimiento de Políticas WhatsApp (categoría UTILITY).
    - Soberanía / Self-Hosted absorbido; S3 promovido a Principio VII propio.
    - Principio VIII rellenado: Foco Vertical ISP.
    - Reordenamiento y renumeración de principios.
-->

# SaaS TOI Constitution

SaaS multi-tenant de gestión de suscriptores, cobranza automatizada y atención al
cliente vía WhatsApp Cloud API, enfocado en **Proveedores de Servicios de Internet
(ISPs)**. Esta constitución define las reglas no negociables del producto. Aplica a
todas las fases del flujo de trabajo (specify, plan, tasks, implement). Cualquier
conflicto entre una decisión de implementación y esta constitución SE RESUELVE A FAVOR
de esta constitución.

## Core Principles

### I. Multi-Tenancy Absoluto (NO NEGOCIABLE)

El identificador de tenant (`organization_id` / `isp_id`) es ciudadano de primera
clase en todo el modelo de datos. Toda consulta, lectura o escritura a la base de
datos DEBE llevar scope explícito del tenant.

- Cada ISP (tenant) es una organización independiente con sus propios usuarios, roles,
  permisos, configuraciones de WhatsApp Business y planes de suscripción.
- El identificador de tenant (`organization_id` / `isp_id`) es un campo obligatorio,
  indexado y presente en **toda tabla de dominio** — no un filtro opcional añadido a
  posteriori.
- **Toda consulta de base de datos** (SELECT, INSERT, UPDATE, DELETE) en la capa de
  acceso a datos DEBE incluir el scope del tenant. Una query sin scope de tenant en
  tablas de dominio es una violación constitucional.
- **Ningún endpoint, tarea en segundo plano ni integración** debe devolver o modificar
  datos de un tenant distinto al del solicitante. El aislamiento se aplica por defecto,
  no por opt-in.
- Las funciones y procedimientos que operen cross-tenant (p. ej. facturación
  consolidada de la plataforma, métricas globales) se justifican explícitamente en el
  diseño y se marcan con un comentario `// CROSS-TENANT: justificación`.

**Rationale**: En un SaaS que gestiona datos financieros, de suscriptores y
credenciales WABA de múltiples ISPs, un cruce de datos entre tenants es un fallo
catastrófico e irreversible — tanto para la relación comercial como para el
cumplimiento con Meta. Multi-tenancy diseñado desde el día cero evita reescrituras
costosas y hace cumplible el aislamiento de datos.

### II. Seguridad de Credenciales y Cumplimiento con Meta (NO NEGOCIABLE)

Los tokens de acceso de WhatsApp Business (WABA), secretos de app y credenciales de
API externas DEBEN cifrarse en reposo en la base de datos (AES-256 o equivalente) y
jamás exponerse al cliente web o en logs del servidor.

- **Cifrado en reposo obligatorio**: todo secreto almacenado en base de datos
  (System User Access Tokens de WABA, OAuth refresh tokens, claves de API de
  pasarelas de pago, secretos de webhook) se cifra con AES-256-GCM o equivalente.
  Las claves de cifrado se gestionan fuera del código fuente y fuera del control de
  versiones (variable de entorno `ENCRYPTION_KEY`).
- **Nunca al cliente**: los tokens, credenciales y secretos sensibles NUNCA se
  exponen al navegador, a apps móviles, a respuestas de API al frontend, ni se
  escriben en logs, trazas o mensajes de error del servidor. Los logs deben sanitizar
  automáticamente cualquier campo marcado como sensible.
- **Cumplimiento con Meta**: la gestión de tokens de WABA sigue las prácticas de
  seguridad mandadas por Meta (rotación, scoping mínimo, almacenamiento seguro). Un
  token de WABA filtrado puede provocar la suspensión del Business Portfolio del ISP
  y de la plataforma.
- **Inyección por entorno**: los secretos de infraestructura se inyectan vía
  variables de entorno o un gestor de secretos; nunca se comprometen a control de
  versiones. `.env` está gitignored.

**Rationale**: Una fuga de credenciales WABA afecta al ISP (suspensión de su
WhatsApp Business), a sus suscriptores (interrupción de comunicaciones) y a la
plataforma (riesgo de revocación de la app de Meta). Prevenir la fuga siempre cuesta
menos que remediarla.

### III. Idempotencia y Resiliencia en Webhooks (NO NEGOCIABLE)

Los webhooks entrantes de Meta WhatsApp Cloud API deben verificar la firma
HMAC-SHA256 (`X-Hub-Signature-256`) y deduplicar procesamientos mediante el ID
único de mensaje (`wamid`). Recibir el mismo evento N veces no debe duplicar efectos
ni registros.

- **Verificación de firma**: todo webhook entrante de Meta se valida contra la firma
  `X-Hub-Signature-256` usando el `app_secret` correspondiente. Un webhook con firma
  inválida o ausente se rechaza con `401` y se registra como incidencia (sin exponer
  detalles del secreto en el log).
- **Deduplicación por `wamid`**: el ID único del mensaje (`wamid`) o el ID del
  evento se registra tras su primer procesamiento exitoso. Los eventos con un ID ya
  procesado se responden con `200 OK` (para que Meta no reintente) pero se descartan
  sin re-ejecutar la lógica de negocio.
- **Sin efectos duplicados**: recibir el mismo callback de estado, el mismo mensaje
  entrante o el mismo evento de pago N veces NO genera mensajes reenviados, cargos
  repetidos, registros duplicados ni notificaciones redundantes.
- **Respuesta rápida a Meta**: el endpoint de webhook DEBE responder `200` en ≤5 s
  (requisito de Meta). El procesamiento pesado (IA, consulta a BD, envío de
  respuesta) se delega a una cola o tarea asíncrona; el endpoint solo valida, deduplica
  y encola.

**Rationale**: Meta reintenta entregas por diseño (hasta 7 reintentos en 72 h). Sin
verificación de firma, un atacante puede inyectar eventos falsos. Sin deduplicación,
los reintentos corrompen datos y generan acciones duplicadas (cobros dobles, mensajes
repetidos al suscriptor del ISP).

### IV. Cumplimiento Estricto de Políticas de WhatsApp — Categoría UTILITY

Toda automatización de cobranza debe diseñarse bajo la categoría UTILITY de Meta
(mensajes transaccionales, informativos y de tono profesional).

- **Categoría UTILITY exclusiva para cobranza**: los mensajes automatizados de aviso
  de pago, confirmación de pago, recordatorio de vencimiento, corte de servicio y
  similares se envían usando templates aprobados por Meta bajo la categoría UTILITY.
  No se usa la categoría MARKETING para estos mensajes.
- **Tono profesional y transaccional**: los templates de cobranza son informativos,
  directos y sin lenguaje promocional. El contenido refleja información de la cuenta
  del suscriptor (monto, fecha de vencimiento, estado), no ofertas ni upsells.
- **Ventana de 24h para conversaciones**: los mensajes de respuesta a interacciones
  del suscriptor respetan la ventana de conversación de 24 horas de Meta. Fuera de
  ventana, solo se envían templates aprobados.
- **Rate limiting y anti-flood**: el sistema implementa control de tasa de envío por
  tenant y global para proteger la calidad de número (quality rating) y evitar
  bloqueos por parte de Meta. Toda feature que envíe mensajes DEBE respetar estos
  límites.
- **Opt-out inmediato**: si un suscriptor solicita dejar de recibir mensajes, el
  sistema lo registra y deja de enviarle automáticamente. El cumplimiento de opt-out
  es inmediato, no diferido.

**Rationale**: Una violación de las políticas de Meta puede resultar en degradación de
quality rating, restricción de envío o suspensión permanente del número de WhatsApp
Business del ISP — afectando a todos sus suscriptores. Diseñar para UTILITY desde el
inicio evita reclasificaciones costosas y protege la calidad de la línea.

### V. Calidad Verificable Antes de "Hecho" (NO NEGOCIABLE)

Criterio estricto de pase. No se considera terminada ninguna tarea sin verificar
typecheck estricto, linter en verde, build exitoso y pruebas unitarias/integración
aprobadas.

- **"Hecho" requiere, como mínimo**: comprobación de tipos en modo estricto
  (`strict` + `noUncheckedIndexedAccess` en TypeScript), linter sin errores, build
  exitoso y tests unitarios/integración del alcance de la tarea en verde.
- Lo que NO se pueda verificar automáticamente se marca explícitamente como
  "pendiente de verificación humana"; no se reporta como completado sin esa marca.
- No se reporta una tarea como terminada describiendo que "debería funcionar": o pasa
  la verificación, o se declara su estado real (incluyendo fallos).

**Rationale**: La verificación automática es la única definición de "hecho" que no
depende de optimismo. En un sistema que gestiona cobros y comunicaciones de negocio,
un bug que pasa sin tests puede resultar en cobros erróneos o mensajes fantasma.

### VI. Verificación de Comportamiento en Vivo (NO NEGOCIABLE)

Toda funcionalidad con interacción observable (p. ej. recepción de webhooks,
renderizado de UI, simulación de respuestas) debe verificarse ejercitando el flujo
real antes de darse por hecha, con loop de auto-corrección hasta quedar en verde.

Complementa el Principio V. TODA feature con comportamiento observable —UI web,
mensajería, API o integración externa— se verifica ejerciendo ese comportamiento como
lo haría un usuario real antes de declararse "Hecha". El gate técnico (Principio V) es
el piso, no el techo.

- **Self-test + loop por el implementador (self-improvement loop).** Tras implementar,
  quien implementa ejecuta el self-test E2E —camino feliz Y camino infeliz (degradación
  sin colgarse)— y, si algo falla, diagnostica, corrige y re-verifica él mismo hasta
  verde. No se entrega trabajo a medio verificar ni se delega la prueba funcional al
  dueño. Lo único delegable a verificación humana es lo intrínsecamente no verificable
  por herramientas (juicio visual, aprobación de un tercero), marcado explícitamente.
- **Se conduce la interfaz real.** Navegador vía Playwright para features de UI; la
  línea del canal (API de WhatsApp Cloud de prueba / sandbox) para mensajería; llamadas
  a la API donde esa sea la superficie. No basta con tipos/lint/build, ni con que un
  endpoint devuelva 2xx, ni con inspeccionar la base de datos: se observa el resultado
  de cara al usuario o al suscriptor del ISP.
- **Local primero, nube después.** Si el comportamiento puede reproducirse en
  `localhost` —incluyendo integraciones externas vía túnel (p. ej. ngrok + handshake
  del webhook desde el panel de Meta)—, SHOULD probarse ahí antes de desplegar. El
  deploy a la nube se reserva para lo que el entorno local no pueda reproducir.
- **Guardarraíles con herramientas no oficiales.** Cuando la prueba use herramientas
  no oficiales vinculadas a un número/cuenta real, MUST respetarse reglas duras: enviar
  solo a destinatarios de una allowlist, NUNCA mensajes en ráfaga (anti-flood
  obligatorio), y minimizar el volumen. La integridad de la cuenta del ISP es un activo
  a proteger, en línea con los Principios II y IV.

**Rationale**: El gate técnico no detecta que un mensaje de cobro no llegó al
suscriptor, que un webhook se perdió silenciosamente, o que un botón de "Registrar
Pago" no disparó nada — eso solo aparece ejerciendo el flujo real. Y el valor del paso
no está solo en detectar el fallo sino en cerrarlo: el implementador itera hasta verde
en vez de devolver trabajo a medias.

### VII. Almacenamiento Estándar S3

Los archivos subidos (comprobantes de pago, facturas PDF) deben almacenarse delegados
en un bucket S3-compatible utilizando la interfaz S3 estándar, aislados en carpetas
por tenant.

- **Interfaz S3 estándar exclusiva**: todo acceso a almacenamiento de objetos
  (upload, download, delete, presigned URLs) se realiza vía el SDK/API S3 estándar
  (`@aws-sdk/client-s3` o equivalente). El código NO se acopla a features
  propietarias de un proveedor específico (p. ej. Cloudflare R2 Workers Binding en
  lugar de la API S3).
- **Aislamiento por tenant**: los archivos de cada ISP se almacenan bajo un prefijo
  que contiene su `organization_id` (p. ej. `/{organization_id}/comprobantes/`,
  `/{organization_id}/facturas/`). Un tenant NO puede acceder a los archivos de otro
  tenant.
- **Migración sin cambio de código**: gracias a la interfaz estándar, migrar de un
  proveedor S3-compatible (Cloudflare R2, AWS S3, MinIO, DigitalOcean Spaces) a otro
  requiere solo cambiar variables de entorno (`S3_ENDPOINT`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY`), no código.
- **URLs presignadas para acceso del cliente**: el frontend nunca accede al bucket
  directamente. El backend genera URLs presignadas con TTL corto para upload y
  download. Las credenciales S3 nunca se exponen al cliente (en línea con Principio II).

**Rationale**: En un SaaS para ISPs, los comprobantes de pago y facturas son
documentos legales y financieros. El aislamiento por tenant previene fugas cruzadas,
y la interfaz S3 estándar evita vendor lock-in — un ISP grande podría requerir
migración a infraestructura propia (MinIO) por política de residencia de datos.

### VIII. Foco Vertical ISP — Proveedores de Servicios de Internet

Este producto sirve específicamente a **Proveedores de Servicios de Internet (ISPs)**
— empresas que venden conectividad a internet (fibra, WISP, cable, DSL) a
suscriptores residenciales y comerciales.

- El modelo de datos y los flujos MUST reflejar el dominio real de un ISP:
  **suscriptores** (no "contactos"), **planes de servicio** (no "productos"),
  **facturas/cobros recurrentes** (no "órdenes"), **cortes y reconexiones** (no
  "suspensiones genéricas"), **zonas/sectores de cobertura**, **equipos ONU/router
  asignados** donde aplique.
- **WhatsApp Cloud API es un medio, no define la naturaleza del producto.** El sistema
  es una plataforma de gestión y cobranza para ISPs que usa WhatsApp como canal
  principal de comunicación. No es un "bot de WhatsApp genérico" con features ISP
  pegadas encima.
- Toda feature MUST servir al **operador del ISP** (admin que gestiona suscriptores y
  cobranza) o al **suscriptor del ISP** (quien recibe avisos, consulta su estado,
  reporta pagos). Cualquier feature que no cumpla esa condición queda FUERA del
  alcance de v1.
- **Dominio de cobranza ISP**: el ciclo de facturación mensual recurrente, con fecha
  de corte, periodo de gracia, avisos de vencimiento escalonados, registro de pago
  (manual y automático), y corte/reconexión por morosidad es el flujo core del
  producto. Es el primer flujo que se diseña y el último que se simplifica.

**Rationale**: Un foco vertical explícito mantiene el modelo de datos alineado con el
negocio real de un ISP y da un criterio claro para aceptar o rechazar alcance. Un ISP
no necesita "contactos con tags" sino suscriptores con plan, fecha de corte y saldo.
Modelar el dominio ISP desde el inicio evita un modelo genérico que luego requiere
parches y workarounds para representar la realidad operativa del cliente.

### IX. Specs Antes de Código

Ninguna feature se implementa sin una especificación previa.

- La especificación describe el comportamiento observable por el usuario (operador ISP
  o suscriptor), no la implementación.
- El orden del flujo es specify → plan → tasks → implement; el código de una feature
  no comienza antes de existir su spec.
- Correcciones triviales y cambios sin comportamiento observable nuevo (typos,
  formato, refactors internos sin cambio de contrato) están exentos.

**Rationale**: Especificar el comportamiento observable antes de codificar previene
retrabajo y mantiene alineadas todas las fases del flujo. En un sistema con múltiples
integraciones (Meta, pasarelas de pago, S3), la spec es el contrato entre fases.

### X. Trazabilidad de Decisiones

Las decisiones tomadas sin contexto suficiente se documentan para revisión humana.

- Cuando una decisión se toma con información incompleta o supuestos no confirmados,
  se registra de forma visible (en el spec, el plan, el PR o un marcador
  `NEEDS CLARIFICATION` / TODO con responsable), no se entierra en el código.
- Los supuestos que condicionan el comportamiento (p. ej. "asumimos que todos los ISPs
  facturan mensualmente", "asumimos que el suscriptor tiene un solo plan activo") se
  hacen explícitos para que un humano pueda revisarlos y revertirlos.

**Rationale**: Las decisiones implícitas bajo incertidumbre son la principal fuente
de deuda oculta; hacerlas visibles permite corregirlas a tiempo. En un sistema
multi-tenant con lógica de cobranza, un supuesto erróneo puede afectar la
facturación de miles de suscriptores.

## Restricciones de Plataforma y Seguridad

Estas restricciones derivan de los Principios I, II y VII y son verificables en
revisión:

- **Gestión de secretos**: los secretos se inyectan vía configuración de entorno o un
  gestor de secretos; nunca se comprometen a control de versiones.
- **Cifrado en reposo**: credenciales WABA, tokens OAuth, claves de API de pasarelas
  de pago y datos sensibles se almacenan cifrados con AES-256-GCM; el almacenamiento
  en claro de secretos es una violación.
- **Frontera de tenant**: la capa de acceso a datos exige `organization_id` /
  `isp_id`; cualquier acceso cross-tenant requiere justificación explícita y marcador
  `// CROSS-TENANT`.
- **Aislamiento de integraciones**: las dependencias de APIs externas (Meta WhatsApp
  Cloud API, pasarelas de pago, servicios de SMS fallback) se acceden a través de
  adaptadores dedicados, no dispersas por el dominio.
- **Aislamiento de almacenamiento**: los archivos en S3 se organizan bajo prefijo de
  tenant; las URLs presignadas se generan solo para el tenant autenticado.

## Restricciones Específicas de Meta WhatsApp Cloud API

Estas restricciones derivan de los Principios II, III y IV:

- **Embedded Signup**: cada ISP conecta SU propia cuenta de WhatsApp Business mediante
  el flujo Embedded Signup de Meta. La plataforma gestiona los tokens resultantes bajo
  las reglas del Principio II.
- **Verificación de webhook**: el endpoint `/api/webhooks/whatsapp` verifica
  `X-Hub-Signature-256` en TODA request POST. GET de verificación valida
  `hub.verify_token`. Ambos son requisitos de Meta.
- **Templates solo UTILITY para cobranza**: los templates de mensajería de cobranza se
  diseñan, envían a aprobación y usan exclusivamente bajo la categoría UTILITY de Meta.
- **Quality rating protegido**: el sistema monitorea y respeta los límites de envío
  del WABA de cada ISP para proteger su quality rating.
- **Data deletion callback**: la plataforma implementa el endpoint de Data Deletion
  Request de Meta y responde según la política de la app.

## Flujo de Desarrollo y Puertas de Calidad

- **Orden del flujo**: specify → plan → tasks → implement. Cada fase consume el
  artefacto de la anterior (Principio IX).
- **Puerta constitucional (Constitution Check)**: el plan de cada feature evalúa el
  cumplimiento de estos principios antes de la Fase 0 y se re-evalúa tras el diseño de
  la Fase 1. Las violaciones se registran y justifican en Complexity Tracking o se
  eliminan.
- **Puerta de calidad (Definición de "Hecho")**: typecheck estricto + lint + build en
  verde, y tests unitarios/integración (Principio V). Para features con comportamiento
  observable de cara al usuario o al suscriptor, "Hecho" exige además el self-test de
  comportamiento en vivo ejecutado por el implementador, con sus guardarraíles
  (Principio VI).
- **Trazabilidad**: decisiones bajo incertidumbre y supuestos se documentan de forma
  visible (Principio X), no en comentarios enterrados.

## Governance

Esta constitución es la autoridad máxima del proyecto. Prevalece sobre cualquier otra
práctica, convención o preferencia; ante un conflicto, gana la constitución.

- **Procedimiento de enmienda**: toda enmienda se propone por escrito describiendo el
  cambio y su motivación, se aprueba por el responsable del proyecto y se registra en
  el control de versiones junto con el Sync Impact Report actualizado.
- **Política de versionado** (semantic versioning de la constitución):
  - **MAJOR**: eliminación o redefinición incompatible de un principio o de la
    gobernanza.
  - **MINOR**: adición de un principio/sección nueva o expansión material.
  - **PATCH**: aclaraciones, correcciones de redacción y refinamientos no semánticos.
- **Revisión de cumplimiento**: cada PR y cada revisión de diseño verifican el
  cumplimiento de estos principios. La complejidad que viole un principio debe
  justificarse; si no, debe eliminarse.
- **Propagación**: al enmendar la constitución se revisan y, si procede, se actualizan
  las plantillas dependientes (plan, spec, tasks) y el `CLAUDE.md`.

**Version**: 2.0.0 | **Ratified**: 2026-07-23 | **Last Amended**: 2026-07-23
