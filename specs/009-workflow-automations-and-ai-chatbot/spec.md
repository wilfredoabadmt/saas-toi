# Feature Specification: 009-workflow-automations-and-ai-chatbot

**Feature Branch**: `009-workflow-automations-and-ai-chatbot`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Implementar automatizaciones de workflow para nurturing de suscriptores y un chatbot con IA para calificación automática de leads por WhatsApp"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y Activar Flujos de Automatización (Priority: P1)

**Como** Administrador del ISP  
**Quiero** crear flujos automatizados que se activen cuando un suscriptor realice una acción específica (ej. nuevo registro, pago vencido, ticket creado)  
**Para** asegurar que cada suscriptor reciba el seguimiento adecuado sin intervención manual.

**Why this priority**: Las automatizaciones de workflow son el corazón del nurturing. Sin ellas, el ISP debe recordar manualmente cada seguimiento, lo cual es escalable solo para ISPs muy pequeños.

**Independent Test**: Puedo crear un flujo "Cuando un suscriptor se registra → esperar 1 día → enviar bienvenida por WhatsApp" y verificar que se ejecuta automáticamente al registrarse un nuevo suscriptor.

**Acceptance Scenarios**:

1. **Given** un administrador está en `/settings/automations`, **When** hace clic en "Nuevo Flujo" y configura un trigger "Nuevo Suscriptor", **Then** el sistema muestra un editor visual con opciones de acciones (enviar mensaje, esperar tiempo, condición).
2. **Given** un flujo está activo con trigger "Pago Vencido", **When** un suscriptor entra en mora, **Then** el flujo se ejecuta automáticamente y envía el mensaje programado.
3. **Given** un flujo tiene una condición "Si plan = Pro", **When** un suscriptor cumple la condición, **Then** se ejecuta la rama "Sí"; si no, la rama "No".
4. **Given** un flujo está activo, **When** el administrador lo desactiva, **Then** las ejecuciones en curso se completan pero no se inician nuevas.

---

### User Story 2 - Monitorear Ejecuciones de Flujos (Priority: P1)

**Como** Administrador del ISP  
**Quiero** ver un historial de todas las ejecuciones de mis automatizaciones (qué flujo se disparó, a qué suscriptor, en qué paso falló si aplica)  
**Para** diagnosticar problemas y optimizar mis flujos.

**Why this priority**: Sin visibilidad de las ejecuciones, el administrador no puede saber si sus automatizaciones están funcionando correctamente.

**Independent Test**: Puedo ver en `/settings/automations/logs` que el flujo "Bienvenida" se ejecutó 15 veces hoy, con 13 éxitos y 2 fallos por suscriptor opt-out.

**Acceptance Scenarios**:

1. **Given** un flujo se ha ejecutado 10 veces, **When** el administrador accede a los logs, **Then** ve una tabla con: fecha, suscriptor, paso alcanzado, estado (éxito/fallo/pendiente).
2. **Given** una ejecución falló, **When** el administrador hace clic en ella, **Then** ve el detalle del error (ej. "Suscriptor tiene opt-out activo").
3. **Given** el administrador filtra por "Solo fallos", **When** aplica el filtro, **Then** solo se muestran ejecuciones con estado "fallo".

---

### User Story 3 - Chatbot IA Responde Preguntas Frecuentes (Priority: P2)

**Como** Suscriptor del ISP  
**Quiero** que cuando escriba al WhatsApp del ISP, un chatbot con IA responda automáticamente mis preguntas frecuentes (estado de cuenta, fecha de corte, planes disponibles)  
**Para** obtener respuesta inmediata sin esperar a un agente humano.

**Why this priority**: El chatbot reduce la carga del equipo de soporte y mejora la experiencia del suscriptor con respuestas 24/7.

**Independent Test**: Envío "¿Cuándo vence mi cuenta?" al WhatsApp del ISP y recibo una respuesta automática con mi fecha de vencimiento y saldo.

**Acceptance Scenarios**:

1. **Given** un suscriptor envía "¿Cuánto debo?", **When** el chatbot procesa el mensaje, **Then** responde con el saldo actual y fecha de vencimiento del suscriptor.
2. **Given** un suscriptor envía "¿Qué planes tienen?", **When** el chatbot procesa el mensaje, **Then** responde con la lista de planes disponibles del ISP con precios.
3. **Given** un suscriptor envía una pregunta que el chatbot no entiende, **When** el chatbot no tiene confianza suficiente, **Then** transfiere la conversación a un agente humano con el contexto de la conversación.
4. **Given** un suscriptor solicita hablar con una persona, **When** el chatbot detecta la intención, **Then** transfiere inmediatamente a un agente disponible.

---

### User Story 4 - Calificación Automática de Leads (Priority: P2)

**Como** Administrador del ISP  
**Quiero** que el chatbot califique automáticamente a los nuevos prospectos que escriben al WhatsApp (preguntando nombre, necesidad, zona de cobertura)  
**Para** que solo los leads calificados lleguen a un agente humano, optimizando su tiempo.

**Why this priority**: La calificación automática filtra leads no qualificados y entrega prospects listos para venta al equipo comercial.

**Independent Test**: Un prospecto escribe "Quiero internet", el chatbot le pregunta nombre, zona y necesidad, y si califica (zona cubierta + necesidad clara), lo marca como "Lead Calificado" y notifica al equipo.

**Acceptance Scenarios**:

1. **Given** un nuevo contacto escribe al WhatsApp, **When** inicia conversación, **Then** el chatbot saluda y pregunta datos clave (nombre, zona, uso previsto).
2. **Given** el chatbot recolectó los datos, **When** el contacto está en zona de cobertura y tiene necesidad clara, **Then** lo marca como "Lead Calificado" en el CRM.
3. **Given** un lead es calificado, **When** se guarda en el sistema, **Then** se notifica al equipo de ventas por WhatsApp o email con los datos del lead.
4. **Given** el contacto no está en zona de cobertura, **When** el chatbot verifica la zona, **Then** informa que no hay cobertura y sugiere leave sus datos para notificar cuando haya servicio.

---

### User Story 5 - Plantillas de Flujos Predefinidos (Priority: P3)

**Como** Administrador del ISP  
**Quiero** tener plantillas de automatizaciones predefinidas (bienvenida, recordatorio de pago, renovación, encuesta de satisfacción)  
**Para** activar flujos útiles sin necesidad de diseñarlos desde cero.

**Why this priority**: Las plantillas reducen la curva de aprendizaje y permiten que ISPs pequeños activen automatizaciones valor en minutos.

**Independent Test**: Puedo seleccionar la plantilla "Recordatorio de Pago" y tener un flujo funcional en menos de 2 minutos personalizando solo los mensajes.

**Acceptance Scenarios**:

1. **Given** el administrador accede a `/settings/automations/templates`, **When** ve la biblioteca, **Then** muestra al menos 5 plantillas categorizadas (Cobranza, Onboarding, Soporte, Retención).
2. **Given** el administrador selecciona una plantilla, **When** la previsualiza, **Then** ve el flujo completo con sus pasos y puede editarlo antes de activarlo.
3. **Given** el administrador activa una plantilla, **When** la confirma, **Then** el flujo se crea en estado "borrador" para revisión final.

---

### Edge Cases

- ¿Qué pasa cuando un suscriptor tiene opt-out activo y un flujo intenta enviarle un mensaje? → El flujo debe saltar ese paso y registrar "skipped - opt-out".
- ¿Qué pasa cuando el chatbot IA no puede acceder a los datos del suscriptor (error de BD)? → Responde con un mensaje genérico y transfiere a agente.
- ¿Qué pasa cuando un flujo tiene un bucle infinito (ej. "esperar 1 hora → verificar pago → si no pagó, esperar 1 hora")? → Límite máximo de 10 iteraciones por ejecución.
- ¿Qué pasa cuando dos flujos se disparan simultáneamente para el mismo suscriptor? → Se ejecutan ambos pero respetan rate limiting de WhatsApp.
- ¿Qué pasa cuando el chatbot recibe un mensaje con imagen/archivo en vez de texto? → Responde que solo procesa mensajes de texto y pide que escriba su consulta.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow creating automation workflows with trigger → action → condition → action chains
- **FR-002**: System MUST support triggers: "Nuevo Suscriptor", "Pago Registrado", "Pago Vencido", "Ticket Creado", "Ticket Cerrado", "Fecha Específica"
- **FR-003**: System MUST support actions: "Enviar Mensaje WhatsApp", "Esperar (minutos/horas/días)", "Actualizar Campo", "Notificar a Agente", "Marcar/Desmarcar Etiqueta"
- **FR-004**: System MUST support conditions: "Si plan = X", "Si saldo > Y", "Si tiene tag = Z", "Si estado = activo/inactivo"
- **FR-005**: System MUST limit maximum iterations per workflow execution to 10 to prevent infinite loops
- **FR-006**: System MUST skip actions for subscribers with active opt-out and log the reason
- **FR-007**: System MUST provide execution logs with: timestamp, subscriber, workflow, step reached, status, error message if applicable
- **FR-008**: System MUST allow filtering logs by workflow, status (success/failure/pending), date range
- **FR-009**: System MUST implement AI chatbot that responds to common ISP questions using subscriber data
- **FR-010**: System MUST allow chatbot to query subscriber data (balance, due date, plan) within tenant scope
- **FR-011**: System MUST transfer chat to human agent when confidence is low or subscriber requests it
- **FR-012**: System MUST implement lead qualification flow: collect name, zone, usage needs
- **FR-013**: System MUST mark qualified leads in CRM and notify sales team
- **FR-014**: System MUST provide at least 5 pre-built workflow templates for common ISP scenarios
- **FR-015**: System MUST respect WhatsApp rate limits when executing automated messages
- **FR-016**: System MUST comply with WhatsApp UTILITY category for all automated cobranza messages
- **FR-017**: System MUST scope all data queries to organization_id (multi-tenant)
- **FR-018**: System MUST store AI chatbot configuration encrypted per tenant

### Key Entities

- **Workflow**: A automation sequence belonging to an ISP (organization_id). Contains name, trigger type, steps (ordered list), status (active/draft/paused), created/updated timestamps.
- **WorkflowStep**: Individual step in a workflow. Can be: trigger, action, condition, or delay. Contains configuration JSON specific to step type.
- **WorkflowExecution**: Record of a workflow running for a specific subscriber. Tracks: workflow_id, subscriber_id, current_step, status (running/completed/failed/skipped), started_at, completed_at.
- **WorkflowExecutionLog**: Detailed log of each step execution within a workflow execution. Contains: step_id, status, error_message, metadata.
- **ChatbotConfig**: AI chatbot configuration per tenant. Contains: system prompt, transfer rules, qualification questions, confidence threshold.
- **ChatbotConversation**: Record of a chatbot conversation with a subscriber. Contains: subscriber_id, messages array, status (active/transferred/closed), qualification_score.
- **Lead**: Qualified prospect from chatbot interaction. Contains: subscriber_id (if exists), name, zone, needs, score, status (new/qualified/contacted/converted), assigned_to.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can create and activate a workflow in under 5 minutes using a template
- **SC-002**: Automated messages are delivered within 30 seconds of trigger activation
- **SC-003**: Chatbot resolves 60% of common questions without human transfer
- **SC-004**: Lead qualification flow captures complete data for 80% of new prospects
- **SC-005**: Workflow execution logs are searchable and load in under 2 seconds
- **SC-006**: System handles 100+ concurrent workflow executions without degradation
- **SC-007**: Chatbot response time is under 3 seconds for standard queries
- **SC-008**: 90% of automated messages are delivered successfully (respecting opt-outs)

## Assumptions

- Los ISPs tienen plantillas de mensajes de WhatsApp aprobadas por Meta para envío de utilidad
- El chatbot IA utilizará el servicio de IA existente (OpenAI/Anthropic) con las credenciales del tenant
- Los suscriptores tienen opt-in para recibir mensajes automatizados (configurado en etapa de registro)
- El ISP tiene al menos un agente humano disponible para recibir transferencias del chatbot
- La información de suscriptor (saldo, fecha de corte) está disponible en las tablas existentes
- Los flujos de automatización se ejecutan de forma asíncrona (no bloquean la UI)
- El chatbot opera dentro de la ventana de conversación de 24h de Meta cuando responde a mensajes entrantes
