# Feature Specification: Gestión Multi-Tenant de Abonados, Conexión Meta WhatsApp Cloud API y Envío de Recordatorios de Cobranza (Utility)

**Feature Branch**: `001-tenant-whatsapp-billing`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Modelo multi-tenant de ISP con gestión de abonados, integración con Meta Cloud API vía Embedded Signup, envío de plantillas de recordatorio de pago (Utility) y recepción idempotente de comprobantes de pago por webhook."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Registro e Importación de Abonados (Priority: P1)

Como Administrador de un ISP (Tenant), quiero registrar e importar la lista de mis
abonados (clientes de internet con datos de contacto, plan de servicio y estado de
cuenta/vencimiento) para gestionar la cartera de cobranza de mi red.

**Why this priority**: Sin abonados cargados en el sistema no hay a quién cobrar ni
enviar mensajes. Es el dato fundacional del que dependen todas las demás historias.

**Independent Test**: Un ISP registrado puede subir un archivo CSV con abonados, ver
la lista importada en su panel, y confirmar que otro ISP registrado NO ve esos
abonados. Esto se puede demostrar de forma aislada sin necesidad de WhatsApp ni
webhooks.

**Acceptance Scenarios**:

1. **Given** un ISP autenticado con 0 abonados, **When** importa un CSV de 50
   abonados con campos válidos (nombre, teléfono, plan, monto, fecha de vencimiento),
   **Then** los 50 abonados aparecen listados en su panel con los datos correctos y
   el estado "Al día" o "Vencido" calculado respecto a la fecha actual.
2. **Given** un ISP autenticado con abonados existentes, **When** importa un CSV que
   contiene abonados repetidos (mismo teléfono), **Then** los duplicados se detectan y
   se reportan como advertencia al administrador, sin crear registros duplicados.
3. **Given** un ISP autenticado, **When** crea un abonado manualmente (formulario),
   **Then** el abonado aparece en su lista con todos los campos obligatorios completos.
4. **Given** dos ISPs autenticados (ISP-A e ISP-B), **When** ISP-A consulta su lista
   de abonados, **Then** solo ve sus propios abonados; los de ISP-B están aislados.
5. **Given** un CSV con filas inválidas (teléfono vacío, monto no numérico), **When**
   el ISP lo importa, **Then** las filas válidas se importan y las inválidas se
   reportan en un resumen de errores descargable, sin abortar la importación completa.

---

### User Story 2 — Conexión de WhatsApp Business vía Embedded Signup (Priority: P1)

Como Administrador de un ISP, quiero conectar mi cuenta de WhatsApp Business (WABA)
mediante Embedded Signup para enviar notificaciones oficiales con mi propia marca sin
riesgo de baneo.

**Why this priority**: Sin WABA conectado, el ISP no puede enviar mensajes. Es el
prerequisito para las historias 3 y 4.

**Independent Test**: Un ISP inicia el flujo Embedded Signup de Meta desde el panel,
completa la autorización, y el sistema registra y cifra el token resultante. Se puede
verificar que el token se almacenó (sin exponerlo) y que el ISP ve el estado
"Conectado" en su panel.

**Acceptance Scenarios**:

1. **Given** un ISP autenticado sin WABA conectado, **When** inicia el flujo Embedded
   Signup desde el panel, completa la autorización en la ventana de Meta y vuelve al
   panel, **Then** el sistema almacena el System User Access Token cifrado
   (AES-256-GCM), el WABA ID y el Phone Number ID del ISP, y muestra el estado
   "WhatsApp Conectado" con el número de teléfono visible.
2. **Given** un ISP con WABA ya conectado, **When** consulta la configuración de
   WhatsApp en su panel, **Then** ve el número conectado y la fecha de conexión, pero
   NO el token (el token nunca se muestra al frontend).
3. **Given** un ISP con WABA conectado, **When** el token almacenado se usa para una
   llamada a la API de Meta, **Then** el sistema descifra el token en memoria solo en
   el backend, realiza la llamada y no lo registra en logs.
4. **Given** un ISP que falla la autorización de Meta (cancela o cierra la ventana),
   **When** vuelve al panel, **Then** ve el estado "No conectado" con un botón para
   reintentar, sin datos corruptos en su configuración.

---

### User Story 3 — Envío de Recordatorios de Cobranza (Utility Template) (Priority: P1)

Como Administrador de un ISP, quiero programar/gatillar el envío de plantillas
oficiales de aviso de pago/vencimiento (categoría Utility) a mis abonados desde el
panel.

**Why this priority**: El envío de recordatorios es el valor core del producto —
automatizar la cobranza por WhatsApp. Depende de las historias 1 (abonados) y 2
(WABA conectado).

**Independent Test**: Un ISP con WABA conectado y abonados cargados selecciona un
grupo de abonados vencidos, elige un template Utility aprobado y gatilla el envío.
Meta confirma la entrega de cada mensaje.

**Acceptance Scenarios**:

1. **Given** un ISP con WABA conectado y abonados con saldo vencido, **When** el admin
   selecciona los abonados vencidos y gatilla el envío de un template Utility de
   "Recordatorio de Pago", **Then** el sistema envía el mensaje a cada abonado vía
   WhatsApp Cloud API usando el template aprobado, con los datos personalizados
   (nombre, monto, fecha de vencimiento), y registra el estado de envío por abonado
   (enviado / fallido / entregado).
2. **Given** un envío gatillado a 100 abonados, **When** Meta devuelve el `wamid` de
   cada mensaje, **Then** el sistema registra el `wamid` por abonado y lo asocia al
   registro de cobranza correspondiente.
3. **Given** un envío en curso, **When** Meta responde con un error para un abonado
   específico (número inválido, opt-out), **Then** el sistema marca ese envío como
   fallido con el motivo, sin afectar el envío al resto de abonados.
4. **Given** un ISP sin WABA conectado, **When** intenta gatillar un envío, **Then**
   el sistema lo bloquea con un mensaje claro indicando que debe conectar WhatsApp
   primero.
5. **Given** un ISP con WABA conectado, **When** gatilla un envío masivo, **Then** el
   sistema respeta los límites de tasa de envío (rate limiting) para proteger la
   calidad de número del ISP.

---

### User Story 4 — Recepción de Comprobantes de Pago del Abonado (Priority: P1)

Como Abonado del ISP, quiero recibir mi recordatorio de pago en WhatsApp y responder
con una imagen/documento (comprobante de pago) que quede registrado e identificado en
el panel de mi ISP.

**Why this priority**: Cierra el ciclo de cobranza — el abonado recibe, responde y
el ISP puede gestionar. Depende de las historias 1, 2 y 3 y del endpoint de webhook.

**Independent Test**: Se simula un webhook entrante de Meta con un mensaje de imagen
enviado por un abonado conocido. El sistema lo procesa, descarga la imagen, la sube
a S3 bajo la carpeta del tenant y la asocia al expediente del abonado visible en el
panel.

**Acceptance Scenarios**:

1. **Given** un abonado registrado en un ISP que recibió un recordatorio de pago,
   **When** el abonado responde al mensaje con una imagen (foto del comprobante),
   **Then** Meta envía un webhook al sistema, el sistema verifica la firma
   HMAC-SHA256, identifica al abonado por su número de teléfono y al ISP por el
   Phone Number ID destino, descarga la imagen desde la URL de Meta, la sube a un
   bucket S3 bajo `/{organization_id}/comprobantes/{abonado_id}/`, y la asocia al
   expediente del abonado como "Comprobante pendiente de revisión".
2. **Given** el mismo webhook recibido dos veces (reintento de Meta con el mismo
   `wamid`), **When** el sistema procesa el segundo, **Then** detecta el `wamid`
   duplicado, responde `200 OK` a Meta y NO descarga, sube ni registra el comprobante
   una segunda vez.
3. **Given** un webhook entrante con firma `X-Hub-Signature-256` inválida, **When**
   el sistema lo recibe, **Then** responde `401 Unauthorized` sin procesar el cuerpo,
   y registra la incidencia sin exponer secretos.
4. **Given** un webhook entrante con un mensaje de un número de teléfono no
   registrado en ningún ISP, **When** el sistema lo procesa, **Then** lo registra
   como mensaje de remitente desconocido y no genera ningún error visible ni efecto
   en el panel.
5. **Given** un webhook entrante con un documento PDF (factura del banco como
   comprobante), **When** el sistema lo recibe, **Then** lo procesa igual que una
   imagen: lo descarga, lo sube a S3 y lo asocia al abonado como comprobante.
6. **Given** un webhook entrante, **When** el procesamiento toma más de 3 segundos
   (descarga, upload a S3), **Then** el endpoint responde `200` a Meta de inmediato y
   el procesamiento pesado continúa de forma asíncrona.

---

### Edge Cases

- **¿Qué pasa si un abonado pertenece a más de un ISP con el mismo número?** Cada ISP
  es un tenant independiente. El mismo número de teléfono puede existir en dos ISPs
  distintos. La identificación del tenant se hace por el `Phone Number ID` destino del
  webhook (cada ISP conecta su propio número), no por el número del abonado.
- **¿Qué pasa si el token WABA de un ISP expira o se revoca?** El sistema detecta el
  error de autenticación de Meta al intentar enviar, marca el WABA como "Desconectado"
  y notifica al admin del ISP para que reconecte.
- **¿Qué pasa si el CSV de importación tiene más de 10,000 filas?** La importación se
  procesa en lotes para no bloquear el servidor; el admin recibe un resumen al
  completarse.
- **¿Qué pasa si Meta cambia el formato de la firma del webhook?** El sistema rechaza
  el webhook con `401` (comportamiento seguro por defecto) y lo registra como
  incidencia.
- **¿Qué pasa si el bucket S3 no está disponible al subir un comprobante?** El sistema
  reintenta con backoff exponencial (máx. 3 reintentos) y, si falla, marca el
  comprobante como "pendiente de subida" para reprocesamiento.
- **¿Qué pasa si un abonado envía un mensaje de texto (no imagen/documento)?** Se
  registra como mensaje entrante genérico; no se trata como comprobante de pago.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST soportar múltiples ISPs (tenants) aislados, cada uno con
  sus propios usuarios administrativos, abonados, configuración WABA y archivos.
- **FR-002**: El sistema MUST permitir al admin de un ISP importar abonados desde un
  archivo CSV con campos: nombre, teléfono, plan de servicio, monto de deuda, fecha
  de vencimiento.
- **FR-003**: El sistema MUST permitir al admin de un ISP crear, editar y eliminar
  abonados manualmente desde un formulario.
- **FR-004**: El sistema MUST detectar abonados duplicados (por número de teléfono
  dentro del mismo tenant) durante la importación y reportarlos sin crear duplicados.
- **FR-005**: El sistema MUST calcular automáticamente el estado de cada abonado
  ("Al día", "Por vencer", "Vencido") con base en la fecha de vencimiento y la fecha
  actual.
- **FR-006**: El sistema MUST implementar el flujo Embedded Signup de Meta para que
  cada ISP conecte su propia cuenta WABA.
- **FR-007**: El sistema MUST almacenar los System User Access Tokens de WABA cifrados
  en reposo (AES-256-GCM) y NUNCA exponerlos al frontend ni escribirlos en logs.
- **FR-008**: El sistema MUST enviar mensajes de template Utility vía WhatsApp Cloud
  API usando los tokens descifrados solo en el backend.
- **FR-009**: El sistema MUST registrar el estado de entrega de cada mensaje enviado
  (enviado, entregado, leído, fallido) mediante los webhooks de estado de Meta.
- **FR-010**: El sistema MUST implementar rate limiting de envío por tenant para
  proteger la calidad de número de cada ISP.
- **FR-011**: El sistema MUST verificar la firma `X-Hub-Signature-256` de todo webhook
  entrante de Meta y rechazar con `401` los que no validen.
- **FR-012**: El sistema MUST deduplicar eventos de webhook por `wamid` para evitar
  procesamiento duplicado.
- **FR-013**: El sistema MUST responder a webhooks de Meta en ≤5 segundos, delegando
  el procesamiento pesado a una cola o tarea asíncrona.
- **FR-014**: El sistema MUST descargar archivos multimedia (imágenes, documentos PDF)
  enviados por abonados vía WhatsApp, subirlos a un bucket S3-compatible bajo
  `/{organization_id}/comprobantes/{abonado_id}/` y asociarlos al expediente del
  abonado.
- **FR-015**: El sistema MUST generar URLs presignadas con TTL corto para que el admin
  del ISP pueda ver/descargar los comprobantes desde el panel sin exponer credenciales
  S3 al frontend.
- **FR-016**: Toda consulta de base de datos en tablas de dominio MUST incluir scope
  explícito del tenant (`organization_id` / `isp_id`).

### Key Entities

- **Organization (ISP / Tenant)**: Representa un Proveedor de Servicios de Internet.
  Tiene un identificador único (`organization_id`), nombre comercial, configuración
  WABA (tokens cifrados, WABA ID, Phone Number ID), y usuarios administrativos.
- **User (Admin ISP)**: Usuario del sistema que pertenece a una Organization. Tiene
  rol y permisos dentro de su tenant.
- **Subscriber (Abonado)**: Cliente del ISP. Tiene nombre, teléfono, plan de servicio,
  monto de deuda, fecha de vencimiento, estado calculado, y pertenece a una
  Organization.
- **Service Plan (Plan de Servicio)**: Tipo de servicio de internet que ofrece el ISP
  (nombre, precio mensual, velocidad). Pertenece a una Organization.
- **Message Log (Registro de Mensaje)**: Registro de cada mensaje enviado o recibido.
  Incluye `wamid`, tipo (enviado/recibido), estado de entrega, contenido del template,
  abonado asociado y timestamp. Pertenece a una Organization.
- **Payment Proof (Comprobante de Pago)**: Archivo (imagen/PDF) subido por un abonado
  como respuesta a un recordatorio. Incluye URL S3, `wamid` del mensaje fuente,
  abonado asociado, estado de revisión ("Pendiente", "Aprobado", "Rechazado").
  Pertenece a una Organization.
- **WABA Config (Configuración WhatsApp Business)**: Token de acceso cifrado, WABA ID,
  Phone Number ID, estado de conexión, fecha de conexión. Pertenece a una Organization
  (relación 1:1).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador de ISP puede importar un CSV de 500 abonados y verlos
  listados en su panel en menos de 30 segundos.
- **SC-002**: El aislamiento de datos entre tenants es absoluto: en ningún escenario
  un ISP puede ver, modificar o recibir datos de otro ISP.
- **SC-003**: Un ISP puede completar el flujo de Embedded Signup y tener su WABA
  conectado en menos de 5 minutos (excluyendo el tiempo de aprobación de Meta).
- **SC-004**: Al gatillar un envío de recordatorio a N abonados, el 100% de los
  mensajes válidos se envía a la API de Meta y el estado de cada uno se registra en el
  panel del ISP.
- **SC-005**: Un webhook de Meta recibido N veces con el mismo `wamid` genera
  exactamente 1 registro y 1 efecto en el sistema.
- **SC-006**: Un comprobante de pago enviado por un abonado aparece asociado a su
  expediente en el panel del ISP en menos de 10 segundos desde la recepción del
  webhook.
- **SC-007**: Los tokens WABA cifrados en base de datos no son descifrables sin la
  clave de cifrado; un dump de la base de datos no expone tokens en claro.
- **SC-008**: El endpoint de webhook responde a Meta en menos de 5 segundos en el
  percentil 99.

## Assumptions

- Los ISPs son organizaciones pequeñas a medianas (hasta ~5,000 abonados por ISP en
  v1); la importación CSV y los envíos masivos se diseñan para este volumen.
- La autenticación de usuarios administrativos del ISP es un componente previo o
  paralelo que ya estará disponible cuando esta feature se implemente (fuera del
  alcance específico de esta spec pero necesario).
- Meta aprueba los templates Utility de cobranza antes de su uso; la creación y envío
  de templates a aprobación de Meta es un paso manual del admin o un flujo auxiliar
  fuera del alcance de esta spec (el sistema envía templates ya aprobados).
- El bucket S3-compatible ya está provisionado y las credenciales de acceso
  (`S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) están configuradas en
  las variables de entorno.
- El sistema usa un framework backend con soporte para TypeScript estricto, y la
  aplicación web tiene un frontend que consume APIs del backend.
- El flujo Embedded Signup de Meta requiere una Meta App configurada con los permisos
  `whatsapp_business_management` y `whatsapp_business_messaging` aprobados (o en modo
  desarrollo con usuarios de prueba).

## Scope Boundaries

### DENTRO (In Scope)

- Modelo multi-tenant de ISP, usuarios del ISP y abonados.
- Módulo de importación/gestión de abonados (monto de deuda, fecha de vencimiento,
  estado).
- Flujo de integración con Meta Cloud API (Embedded Signup, almacenamiento cifrado de
  tokens WABA y suscripción a webhooks).
- Gatillo de envío de plantilla de recordatorio de pago (Utility template).
- Endpoint de webhook idempotente para recibir la respuesta/comprobante del abonado y
  asociarlo a su expediente.

### FUERA (Out of Scope — Por ahora)

- Corte o reconexión automática en routers MikroTik / OLTs (P2).
- Pasarelas de pago online automatizadas — Stripe, MercadoPago (P2).
- Chatbot avanzado con Inteligencia Artificial para soporte técnico (P3).
- Creación y envío de templates a aprobación de Meta (auxiliar, manual por ahora).
- Reportes avanzados de cobranza y analítica (P2).
- Aplicación móvil nativa para admin del ISP (P2).
