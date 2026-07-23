# Feature Specification: Dashboard Ejecutivo y Verificación de Comprobantes de Pago

**Feature Branch**: `002-dashboard-payment-verification`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Dashboard Ejecutivo y Módulo de Verificación de Comprobantes de Pago recibidos por WhatsApp — SaaS Multi-Tenant para ISPs."

## Clarifications

### Session 2026-07-23

- Q: Al aprobar un comprobante, ¿qué monto se registra como recaudado? → A: El operador ingresa/confirma el monto al aprobar; se guarda en el comprobante (`amount`) y alimenta el "Total recaudado".
- Q: ¿Cómo se regulariza la cuenta al aprobar (con posibles pagos parciales)? → A: Aprobar siempre deja al abonado "Al día" (`current`) y avanza `due_date` un ciclo mensual, sin importar el monto capturado (sin lógica de saldos parciales en v1).
- Q: ¿Cómo se actualiza la bandeja ante nuevos comprobantes en v1? → A: Polling automático periódico (~30 s) + botón de refresco manual (sin push en tiempo real).
- Q: ¿Qué puede hacer el operador con un comprobante de abonado no identificado? → A: Buscar y asociarlo manualmente a un abonado existente; tras asociarlo sigue el flujo normal de aprobar/rechazar (no se crean abonados nuevos desde ahí en v1).

## User Scenarios & Testing *(mandatory)*

<!--
  Historias priorizadas como journeys independientes. Cada una entrega valor por sí
  sola y es testeable de forma aislada.
-->

### User Story 1 - Bandeja de verificación de comprobantes (Priority: P1)

Como Operador de Cobranzas quiero una bandeja de entrada con los comprobantes de pago
(imágenes/PDFs) que los abonados enviaron por WhatsApp, para revisarlos rápidamente en
un solo lugar en vez de buscar entre conversaciones.

**Why this priority**: Es el corazón operativo de la feature. Sin la bandeja, los
comprobantes que ya llegan por WhatsApp (P1 001) quedan sin flujo de trabajo. Entrega
valor incluso antes de existir el dashboard: el operador puede ver y abrir cada
comprobante pendiente. Es el prerequisito de las historias 2 y 3.

**Independent Test**: Con al menos un comprobante `pending` en la base del tenant,
navegar a `/payments/verify`, comprobar que la lista/mosaico muestra ese comprobante,
abrir el visor y ver la imagen/PDF junto a los datos del abonado (nombre, teléfono,
plan, monto, fecha de vencimiento).

**Acceptance Scenarios**:

1. **Given** un tenant con 3 comprobantes en estado `pending` y otro tenant con 5,
   **When** el operador del primer tenant abre `/payments/verify`, **Then** ve
   exactamente sus 3 comprobantes y ninguno del otro tenant.
2. **Given** un comprobante pendiente de tipo imagen, **When** el operador hace clic en
   él, **Then** se abre un visor con la imagen renderizada y, al costado, los datos del
   abonado asociado.
3. **Given** un comprobante pendiente de tipo documento (PDF), **When** el operador lo
   abre, **Then** puede visualizar o descargar el PDF mediante una URL presignada de
   acceso temporal.
4. **Given** que no hay comprobantes pendientes, **When** el operador abre la bandeja,
   **Then** ve un estado vacío claro ("No hay comprobantes pendientes") sin errores.

---

### User Story 2 - Aprobar comprobante y notificar (Priority: P1)

Como Operador de Cobranzas quiero aprobar un comprobante con un clic para que la cuenta
del abonado quede "Al día" automáticamente y se le envíe un recibo de confirmación por
WhatsApp.

**Why this priority**: Cierra el ciclo de cobranza — el motivo por el que existe la
bandeja. Convierte la revisión en una acción de negocio (regularizar la cuenta) y
comunica el resultado al abonado. Depende de la Historia 1.

**Independent Test**: Con un comprobante `pending` de un abonado `overdue`, hacer clic
en "Aprobar"; verificar que el comprobante pasa a `approved`, el `payment_status` del
abonado pasa a `current` (Al día) con su fecha de vencimiento avanzada un ciclo, y que
la API de Meta recibe y despacha el template de confirmación al teléfono del abonado.

**Acceptance Scenarios**:

1. **Given** un comprobante `pending` de un abonado en mora, **When** el operador hace
   clic en "Aprobar", **Then** el comprobante pasa a `approved`, se registra
   `reviewed_by` y `reviewed_at`, y el abonado queda `current` (Al día).
2. **Given** una aprobación exitosa, **When** se confirma la acción, **Then** el sistema
   envía un template UTILITY de confirmación de pago al abonado vía WhatsApp y registra
   el envío en el historial de mensajes.
3. **Given** que la API de Meta falla al enviar la confirmación, **When** ocurre el
   fallo, **Then** la aprobación del comprobante y la actualización de la cuenta se
   conservan, el fallo de envío se registra, y la UI informa que el pago se aprobó pero
   la notificación quedó pendiente de reintento (no se revierte la aprobación).
4. **Given** un comprobante ya `approved` o `rejected`, **When** el operador intenta
   aprobarlo de nuevo, **Then** el sistema rechaza la doble acción y muestra el estado
   actual (sin duplicar el envío ni el efecto en la cuenta).

---

### User Story 3 - Rechazar comprobante con motivo y notificar (Priority: P2)

Como Operador de Cobranzas quiero rechazar un comprobante indicando el motivo, para que
el abonado reciba automáticamente por WhatsApp un mensaje pidiéndole corregir el pago.

**Why this priority**: Cubre el camino infeliz de la revisión (comprobante ilegible,
monto incorrecto, no corresponde). Importante para operación real, pero el flujo puede
lanzarse con solo aprobar; por eso va después de las historias P1.

**Independent Test**: Con un comprobante `pending`, hacer clic en "Rechazar", elegir/
escribir un motivo y confirmar; verificar que el comprobante pasa a `rejected` con el
motivo guardado, la cuenta del abonado NO cambia de estado, y la API de Meta despacha
un template pidiendo corregir el pago.

**Acceptance Scenarios**:

1. **Given** un comprobante `pending`, **When** el operador hace clic en "Rechazar" e
   indica un motivo, **Then** el comprobante pasa a `rejected`, el motivo se guarda en
   `review_notes`, y se registra `reviewed_by`/`reviewed_at`.
2. **Given** un rechazo exitoso, **When** se confirma, **Then** el `payment_status` del
   abonado permanece sin cambios (sigue en mora o como estaba) y se envía un template
   UTILITY pidiéndole corregir/reenviar el comprobante.
3. **Given** el operador intenta rechazar sin indicar un motivo, **When** confirma,
   **Then** el sistema exige el motivo antes de continuar.
4. **Given** que la API de Meta falla al enviar la solicitud de corrección, **When**
   ocurre el fallo, **Then** el rechazo se conserva, el fallo de envío se registra, y la
   UI informa que la notificación quedó pendiente de reintento.

---

### User Story 4 - Dashboard ejecutivo con indicadores clave (Priority: P2)

Como Administrador de ISP quiero ver un Dashboard con indicadores clave (total recaudado
del mes, cartera vencida, abonados en mora y comprobantes pendientes) para conocer de un
vistazo el estado financiero de mi negocio.

**Why this priority**: Da visibilidad ejecutiva de alto valor, pero es
observación/lectura: no bloquea el flujo operativo de cobranza (historias 1–3). Se
apoya en los mismos datos que la bandeja produce (aprobaciones registradas).

**Independent Test**: Con datos de un tenant (abonados con distintos `payment_status`,
comprobantes `pending` y comprobantes `approved` este mes), abrir el dashboard y
verificar que cada tarjeta muestra el valor correcto calculado solo sobre ese tenant.

**Acceptance Scenarios**:

1. **Given** un tenant con comprobantes aprobados este mes por un total conocido,
   **When** el admin abre el dashboard, **Then** la tarjeta "Total recaudado (mes
   actual)" muestra ese total y excluye pagos de meses anteriores y de otros tenants.
2. **Given** abonados con `payment_status = overdue`, **When** el admin abre el
   dashboard, **Then** "Cartera vencida" muestra la suma de montos adeudados y "Abonados
   en mora" muestra el conteo de esos abonados.
3. **Given** N comprobantes `pending`, **When** el admin abre el dashboard, **Then**
   "Comprobantes pendientes" muestra N y ofrece acceso directo a `/payments/verify`.
4. **Given** dos tenants con datos distintos, **When** cada admin abre su dashboard,
   **Then** cada uno ve únicamente los indicadores de su propia organización.

---

### Edge Cases

- **Comprobante sin abonado resoluble**: un archivo llegó de un número que no coincide
  con ningún abonado del tenant. El comprobante sigue visible en la bandeja marcado como
  "abonado no identificado"; el operador lo asocia manualmente a un abonado existente (o
  lo rechaza). Nunca se pierde silenciosamente.
- **Abonado con opt-out de WhatsApp**: al aprobar/rechazar, si el abonado optó por no
  recibir mensajes, la acción de negocio se aplica igual pero NO se envía notificación;
  la UI indica que no se notificó por opt-out.
- **Aprobación concurrente**: dos operadores abren el mismo comprobante y ambos hacen
  clic en "Aprobar". Solo la primera acción surte efecto; la segunda ve el estado ya
  resuelto sin duplicar envío ni efecto.
- **Mes sin recaudación**: el dashboard muestra 0 (cero) con formato de moneda, no un
  espacio vacío ni error.
- **Archivo expirado/ilegible en el visor**: si la URL presignada expiró o el objeto no
  está disponible, el visor muestra un error recuperable y permite regenerar el acceso.
- **Refresco de la bandeja**: un comprobante nuevo llega por WhatsApp mientras el
  operador tiene la bandeja abierta; al refrescar (o vía actualización periódica)
  aparece sin recargar toda la aplicación.
- **Zona horaria del "mes actual"**: el corte del mes usa la zona horaria de la
  organización para no atribuir un pago al mes equivocado.

## Requirements *(mandatory)*

### Functional Requirements

**Bandeja de verificación (US1)**

- **FR-001**: El sistema MUST listar en `/payments/verify` los comprobantes de pago en
  estado `pending` pertenecientes exclusivamente a la organización del usuario
  autenticado.
- **FR-002**: El sistema MUST mostrar cada comprobante con: vista previa/indicador del
  tipo de archivo, datos del abonado asociado (nombre, teléfono, plan, monto mensual,
  fecha de vencimiento y estado de pago) y fecha de recepción.
- **FR-003**: El sistema MUST permitir abrir un visor del comprobante que renderice
  imágenes y permita visualizar/descargar PDFs mediante una URL presignada de acceso
  temporal (el frontend nunca accede directamente al bucket).
- **FR-004**: El sistema MUST mostrar un estado vacío claro cuando no existan
  comprobantes pendientes.
- **FR-005**: El sistema MUST reflejar comprobantes recién recibidos por WhatsApp
  mediante polling automático periódico (~30 s) y un botón de refresco manual, sin
  recargar toda la aplicación ni requerir push en tiempo real.

**Aprobación (US2)**

- **FR-006**: El sistema MUST permitir aprobar un comprobante `pending` con una sola
  acción, registrando `review_status = approved`, `reviewed_by` y `reviewed_at`.
- **FR-006a**: Al aprobar, el sistema MUST solicitar/confirmar el monto pagado y
  guardarlo en el comprobante (`amount`); este monto es la base del cálculo de "Total
  recaudado". El operador puede ajustarlo para reflejar pagos parciales, adelantos o
  recargos.
- **FR-007**: Al aprobar, el sistema MUST actualizar la cuenta del abonado a "Al día"
  (`payment_status = current`) y avanzar su fecha de vencimiento un ciclo de facturación
  mensual, independientemente del `amount` capturado (v1 no modela saldos parciales).
- **FR-008**: Al aprobar, el sistema MUST enviar al abonado un template UTILITY de
  confirmación de pago vía WhatsApp y registrar el envío en el historial de mensajes.
- **FR-009**: El sistema MUST tratar la aprobación como idempotente: un comprobante ya
  `approved`/`rejected` no puede re-aprobarse y no dispara envíos ni efectos duplicados.
- **FR-010**: Si el envío de la confirmación falla, el sistema MUST conservar la
  aprobación y la actualización de la cuenta, registrar el fallo, e informar en la UI que
  la notificación quedó pendiente (sin revertir la aprobación).

**Rechazo (US3)**

- **FR-011**: El sistema MUST permitir rechazar un comprobante `pending` exigiendo un
  motivo, registrando `review_status = rejected`, `review_notes`, `reviewed_by` y
  `reviewed_at`.
- **FR-012**: Al rechazar, el sistema MUST dejar el `payment_status` del abonado sin
  cambios y enviar un template UTILITY pidiéndole corregir/reenviar el pago.
- **FR-013**: El sistema MUST impedir el rechazo si no se proporcionó un motivo.
- **FR-014**: Si el envío de la solicitud de corrección falla, el sistema MUST conservar
  el rechazo, registrar el fallo e informar que la notificación quedó pendiente.

**Dashboard (US4)**

- **FR-015**: El sistema MUST presentar un dashboard con al menos cuatro indicadores del
  tenant autenticado: total recaudado del mes actual, cartera vencida (suma de montos en
  mora), abonados en mora (conteo) y comprobantes pendientes (conteo).
- **FR-016**: El sistema MUST calcular "total recaudado del mes actual" como la suma del
  `amount` de los comprobantes aprobados dentro del mes calendario actual en la zona
  horaria de la organización.
- **FR-017**: El sistema MUST calcular todos los indicadores con scope estricto de
  tenant, sin mezclar datos de otras organizaciones.
- **FR-018**: El indicador "Comprobantes pendientes" MUST enlazar directamente a
  `/payments/verify`.
- **FR-019**: El dashboard MUST mostrar valores cero con formato adecuado (moneda/conteo)
  cuando no existan datos, en lugar de vacíos o errores.

**Transversales**

- **FR-020**: Toda acción de aprobación/rechazo MUST estar disponible solo para usuarios
  con rol autorizado (operator, admin, owner) de la organización dueña del comprobante.
- **FR-021**: El sistema MUST manejar comprobantes cuyo abonado no se identifica
  automáticamente: se muestran como "abonado no identificado" sin descartarse
  silenciosamente. El operador MUST poder buscar y asociarlos manualmente a un abonado
  existente del tenant; una vez asociado, el comprobante sigue el flujo normal de
  aprobar/rechazar. (Crear un abonado nuevo desde la bandeja queda fuera de v1.)
- **FR-022**: El sistema MUST omitir el envío de notificación cuando el abonado tiene
  opt-out de WhatsApp, aplicando igualmente la acción de negocio e informándolo en la UI.
- **FR-023**: Toda notificación saliente MUST usar templates categoría UTILITY y respetar
  el control de tasa de envío por tenant.

### Key Entities *(include if feature involves data)*

Esta feature reutiliza el modelo de datos del feature 001 (no introduce entidades nuevas
obligatorias). Las entidades relevantes:

- **PaymentProof (comprobante de pago)**: archivo recibido por WhatsApp asociado a un
  abonado; atributos clave: tipo de archivo, referencia de almacenamiento (S3),
  `review_status` (pending/approved/rejected), `reviewed_by`, `reviewed_at`,
  `review_notes`, y `amount` (monto pagado capturado al aprobar — columna nueva a añadir
  al modelo 001). Es el objeto central de la bandeja.
- **Subscriber (abonado)**: cliente del ISP; atributos clave para esta feature:
  `payment_status` (current/due_soon/overdue), `due_date`, `monthly_amount`, `phone`,
  `opted_out_whatsapp`, plan asociado. Su estado se actualiza al aprobar.
- **MessageLog (registro de mensaje)**: registro del template de confirmación/corrección
  enviado, con su estado de entrega.
- **Organization (ISP / tenant)**: raíz de aislamiento; todos los indicadores y listados
  se calculan bajo su scope.
- **User (operador/admin)**: autor de la revisión (`reviewed_by`); su rol gobierna el
  acceso a las acciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un operador puede localizar y abrir un comprobante pendiente desde la
  bandeja en menos de 15 segundos desde que carga la sección.
- **SC-002**: El 100% de los comprobantes listados y de los indicadores mostrados
  pertenecen a la organización del usuario; 0 casos de datos cruzados entre tenants en
  las pruebas de aislamiento.
- **SC-003**: Aprobar un comprobante deja al abonado "Al día" y despacha la confirmación
  al abonado en la misma acción; en pruebas E2E, la confirmación se observa despachada
  hacia la API de WhatsApp en el 100% de las aprobaciones sin opt-out.
- **SC-004**: Un comprobante recibido por WhatsApp aparece en la bandeja tras un refresco
  o dentro del intervalo de actualización automática (objetivo ≤ 30 s), sin recargar la
  aplicación.
- **SC-005**: Los cuatro indicadores del dashboard coinciden con el cálculo manual sobre
  los datos de prueba del tenant (0 discrepancias).
- **SC-006**: Un fallo del proveedor (API de Meta o almacenamiento) durante
  aprobación/rechazo nunca deja la cuenta en estado inconsistente: la acción de negocio
  se conserva y el fallo de notificación queda registrado y reintentable en el 100% de
  los casos provocados.
- **SC-007**: Rechazar un comprobante sin motivo es imposible: el sistema lo bloquea en
  el 100% de los intentos.

## Assumptions

- **Reutiliza el modelo 001**: `payment_proofs`, `subscribers`, `message_logs`,
  `organizations` y `users` ya existen (feature 001). Esta feature agrega
  comportamiento/UI y **una columna `amount` en `payment_proofs`** (monto pagado
  capturado al aprobar — ver Clarifications). No introduce entidades nuevas.
- **"Al día" = `payment_status = current`**: el dominio 001 no define un estado "Pagado"
  separado; regularizar la cuenta significa `current` con la fecha de vencimiento
  avanzada un ciclo mensual. Supuesto: facturación mensual y un solo plan activo por
  abonado.
- **"Total recaudado del mes"** = suma del `amount` capturado en los comprobantes
  aprobados dentro del mes (ver Clarifications). No hay integración de pasarela; el monto
  lo confirma el operador en la aprobación.
- **Actualización de la bandeja**: polling automático (~30 s) + refresco manual (ver
  Clarifications). El push en tiempo real (websockets/SSE) queda fuera de v1.
- **Notificaciones UTILITY**: los templates de "confirmación de pago" y "corrección de
  pago" existen o se crean/someten a aprobación de Meta como parte del plan; el envío
  respeta opt-out, ventana de 24 h y rate limiting (Principios IV y VI).
- **Roles**: `operator`, `admin` y `owner` pueden revisar comprobantes; el dashboard es
  visible al menos para `admin`/`owner`. La matriz fina de permisos se refina en plan.
- **Fuera de alcance**: integración con bancos o pasarelas de pago (validación manual por
  el operador); conciliación automática de montos; reportes exportables avanzados.
