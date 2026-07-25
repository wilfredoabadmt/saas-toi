# Tasks: 009-workflow-automations-and-ai-chatbot

## Phase 1: Setup (Database Schema & Base Infrastructure)

- [x] T001 Create workflow tables schema in src/db/schema/workflows.ts (workflows, workflow_steps, workflow_executions, workflow_execution_logs)
- [x] T002 Create chatbot tables schema in src/db/schema/chatbot.ts (chatbot_config, chatbot_conversations, chatbot_messages)
- [x] T003 Create leads table schema in src/db/schema/leads.ts (leads)
- [x] T004 Add workflow tables to src/db/schema/index.ts exports
- [ ] T005 Create database migration for new tables in src/db/migrations/
- [x] T006 Create workflow service base in src/services/workflow.service.ts
- [ ] T007 Create chatbot service base in src/services/chatbot.service.ts

## Phase 2: Foundational (Workflow Engine Core)

- [x] T008 Implement workflow trigger evaluator in src/services/workflow.service.ts (detects when triggers fire based on events)
- [x] T009 Implement workflow step executor in src/services/workflow.service.ts (processes actions: send message, wait, condition)
- [x] T010 Implement workflow execution queue in src/services/workflow.service.ts (async execution with iteration limit of 10)
- [x] T011 Implement opt-out check in workflow execution (skip steps for opted-out subscribers)
- [x] T012 Create workflow API endpoints in src/app/api/workflows/route.ts (CRUD for workflows)
- [x] T013 Create workflow execution logs endpoint in src/app/api/workflows/[id]/logs/route.ts

## Phase 3: User Story 1 - Crear y Activar Flujos de Automatización (P1)

- [x] T014 [US1] Create workflow builder UI page in src/app/(dashboard)/settings/automations/page.tsx
- [x] T015 [US1] Implement trigger selection component (Nuevo Suscriptor, Pago Registrado, Pago Vencido, Ticket Creado, Ticket Cerrado, Fecha Específica)
- [x] T016 [US1] Implement action components (Enviar Mensaje WhatsApp, Esperar, Actualizar Campo, Notificar a Agente, Marcar Etiqueta)
- [ ] T017 [US1] Implement condition builder component (Si plan = X, Si saldo > Y, Si tiene tag = Z, Si estado = activo/inactivo)
- [x] T018 [US1] Implement workflow activation/deactivation toggle
- [x] T019 [US1] Connect workflow builder to API endpoints

## Phase 4: User Story 2 - Monitorear Ejecuciones de Flujos (P1)

- [x] T020 [US2] Create workflow logs page in src/app/(dashboard)/settings/automations/logs/page.tsx
- [x] T021 [US2] Implement execution history table with columns: fecha, suscriptor, flujo, paso alcanzado, estado
- [x] T022 [US2] Implement log filtering (by workflow, status, date range)
- [x] T023 [US2] Implement execution detail modal (show error messages for failed executions)

## Phase 5: User Story 3 - Chatbot IA Responde Preguntas Frecuentes (P2)

- [ ] T024 [US3] Create chatbot configuration page in src/app/(dashboard)/settings/chatbot/page.tsx
- [ ] T025 [US3] Implement chatbot system prompt editor per tenant
- [ ] T026 [US3] Implement chatbot confidence threshold configuration
- [ ] T027 [US3] Implement chatbot response handler in src/services/chatbot.service.ts (processes incoming WhatsApp messages)
- [ ] T028 [US3] Implement subscriber data lookup in chatbot (balance, due date, plan info)
- [ ] T029 [US3] Implement human agent transfer logic (when confidence low or subscriber requests)
- [ ] T030 [US3] Create chatbot API endpoint in src/app/api/chatbot/webhook/route.ts

## Phase 6: User Story 4 - Calificación Automática de Leads (P2)

- [ ] T031 [US4] Implement lead qualification flow in chatbot (asks name, zone, usage needs)
- [ ] T032 [US4] Implement lead scoring logic (zone coverage + clear need = qualified)
- [ ] T033 [US4] Implement lead storage in database (leads table)
- [ ] T034 [US4] Implement sales team notification (WhatsApp/email when lead qualified)
- [ ] T035 [US4] Create leads dashboard page in src/app/(dashboard)/leads/page.tsx
- [ ] T036 [US4] Implement lead status management (new/qualified/contacted/converted)

## Phase 7: User Story 5 - Plantillas de Flujos Predefinidos (P3)

- [ ] T037 [US5] Create workflow templates data in src/services/workflow-templates.ts
- [ ] T038 [US5] Implement template library UI in workflow builder
- [ ] T039 [US5] Implement template preview functionality
- [ ] T040 [US5] Implement template-to-workflow conversion (creates draft workflow from template)

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T041 Add WhatsApp rate limiting to automated messages (per tenant and global)
- [ ] T042 Implement workflow execution error handling and retry logic
- [ ] T043 Add workflow analytics dashboard (executions per day, success rate, most used workflows)
- [x] T044 Update CLAUDE.md with active feature 009
- [x] T045 Run typecheck and fix any errors
- [ ] T046 Run lint and fix any errors
- [x] T047 Verify build succeeds

## Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 4 (US2)
                                             ↓
                                       Phase 5 (US3) → Phase 6 (US4)
                                             ↓
                                       Phase 7 (US5)
                                             ↓
                                       Phase 8 (Polish)
```

## Independent Test Criteria

- **US1**: Can create a workflow "Cuando nuevo suscriptor → esperar 1 día → enviar bienvenida" and verify it saves correctly
- **US2**: Can view execution logs filtered by "Solo fallos" and see error details
- **US3**: Can send "¿Cuánto debo?" to WhatsApp and receive balance response
- **US4**: Can complete lead qualification flow and see lead marked as "Calificado" in dashboard
- **US5**: Can select "Recordatorio de Pago" template and have functional workflow in 2 minutes

## MVP Scope

**Recommended MVP**: US1 + US2 (Workflow Automations basic)

This provides immediate value by allowing ISPs to automate follow-ups without requiring AI integration. US3-US4 (Chatbot) can be added incrementally.

## Implementation Strategy

1. **Start with Phase 1-2**: Database schema and workflow engine core
2. **Deliver US1+US2 first**: Basic automation capability
3. **Add US3**: Chatbot with predefined responses
4. **Enhance with US4**: Lead qualification
5. **Polish with US5**: Templates for easy onboarding
