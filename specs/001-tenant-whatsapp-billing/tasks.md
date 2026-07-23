# Tasks: Gestión Multi-Tenant de Abonados, Conexión Meta WhatsApp Cloud API y Envío de Recordatorios de Cobranza (Utility)

**Input**: Design documents from `/specs/001-tenant-whatsapp-billing/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included — the spec requires typecheck + lint + build + tests (Constitution Principle V).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)
- Exact file paths included

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Next.js project, install dependencies, configure TypeScript strict mode, linting, and basic project scaffolding.

- [ ] T001 Initialize Next.js 15 project (App Router) with TypeScript in `./` via `npx create-next-app@latest`
- [ ] T002 Configure TypeScript strict mode (`strict: true`, `noUncheckedIndexedAccess: true`) in `tsconfig.json`
- [ ] T003 [P] Install and configure ESLint + Prettier in `.eslintrc.json` and `.prettierrc`
- [ ] T004 [P] Install core dependencies: `drizzle-orm`, `drizzle-kit`, `pg`, `zod`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `papaparse`
- [ ] T005 [P] Install dev dependencies: `vitest`, `@types/pg`, `@types/papaparse`, `dotenv`
- [ ] T006 [P] Configure Vitest in `vitest.config.ts` with path aliases
- [ ] T007 Create base project directory structure per plan.md (`src/db/`, `src/lib/`, `src/services/`, `src/components/`, `tests/`)
- [ ] T008 Configure `.env.example` with all required environment variables documented (per quickstart.md)

**Checkpoint**: Project compiles, lint passes, `pnpm dev` starts without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story. DB connection, tenant schema, auth skeleton, encryption lib, S3 client, shared middleware.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T009 Create DB connection pool and Drizzle client in `src/db/client.ts` (reads `DATABASE_URL` from env)
- [ ] T010 [P] Create `organizations` schema in `src/db/schema/organizations.ts` (id, name, slug, status, timestamps) per data-model.md
- [ ] T011 [P] Create `users` schema in `src/db/schema/users.ts` (id, organization_id FK, email, name, role, password_hash, timestamps) per data-model.md
- [ ] T012 [P] Create `service_plans` schema in `src/db/schema/service-plans.ts` (id, organization_id FK, name, price, speed_down, speed_up, is_active, timestamps)
- [ ] T013 Create schema index barrel file `src/db/schema/index.ts` re-exporting all schemas
- [ ] T014 Configure Drizzle Kit in `drizzle.config.ts` and generate initial migration in `src/db/migrations/`
- [ ] T015 Run initial migration against local PostgreSQL and verify tables created
- [ ] T016 [P] Implement AES-256-GCM encrypt/decrypt utility in `src/lib/crypto.ts` (encrypt, decrypt, using `ENCRYPTION_KEY` env, IV-unique per call, format: `iv:authTag:ciphertext` in base64) per research.md DV-003
- [ ] T017 [P] Implement S3 client + presigned URL helper in `src/lib/s3.ts` (`@aws-sdk/client-s3`, upload, download, generatePresignedUrl with TTL) per research.md DV-007
- [ ] T018 [P] Implement tenant context helper in `src/lib/tenant.ts` (extract `organization_id` from session, throw if missing)
- [ ] T019 [P] Create Zod validation schemas shared across API routes in `src/lib/validators.ts` (phone E.164, uuid, pagination params)
- [ ] T020 Implement basic auth middleware/session check skeleton in `src/lib/auth.ts` (session-based, returns `userId` + `organizationId`)
- [ ] T021 Create API error handler utility in `src/lib/api-errors.ts` (typed errors: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `DUPLICATE`, `VALIDATION_ERROR`, `WABA_NOT_CONNECTED`)
- [ ] T022 Create healthcheck endpoint in `src/app/api/health/route.ts` (returns 200 + DB ping status)
- [ ] T023 [P] Write unit tests for `src/lib/crypto.ts` in `tests/unit/lib/crypto.test.ts` (encrypt→decrypt roundtrip, wrong key fails, different IVs per call)
- [ ] T024 [P] Write unit tests for `src/lib/s3.ts` in `tests/unit/lib/s3.test.ts` (presigned URL generation, key format includes org_id)

**Checkpoint**: Foundation ready — DB connected, schemas migrated, crypto/S3/tenant/auth utilities working with tests green. `pnpm test` + `pnpm build` pass.

---

## Phase 3: User Story 1 — Registro e Importación de Abonados (Priority: P1) 🎯 MVP

**Goal**: Un ISP registrado puede crear abonados manualmente e importar desde CSV, con aislamiento total por tenant.

**Independent Test**: Import a CSV of 50 subscribers, verify they appear in the panel. Login as a different ISP and verify isolation.

### Implementation for User Story 1

- [ ] T025 [P] [US1] Create `subscribers` schema in `src/db/schema/subscribers.ts` (all columns per data-model.md, UNIQUE(phone, organization_id), indexes on organization_id, payment_status, due_date)
- [ ] T026 [US1] Generate and run migration for `subscribers` table
- [ ] T027 [US1] Implement `SubscriberService` in `src/services/subscriber.service.ts` (create, list with pagination/filters, getById, update, softDelete — ALL methods require `organizationId` param, no method without tenant scope)
- [ ] T028 [US1] Implement CSV import logic in `src/lib/csv-parser.ts` (parse with `papaparse`, validate each row with Zod schema, batch insert in groups of 100, ON CONFLICT DO NOTHING for dedup, return `{imported, duplicates, errors}`) per research.md DV-008
- [ ] T029 [US1] Create API route `GET/POST /api/subscribers` in `src/app/api/subscribers/route.ts` (list with pagination/filters, create single subscriber) per contract api-subscribers.md
- [ ] T030 [US1] Create API route `POST /api/subscribers/import` in `src/app/api/subscribers/import/route.ts` (multipart CSV upload, max 5MB, process with csv-parser) per contract api-subscribers.md
- [ ] T031 [US1] Create API route `GET/PATCH/DELETE /api/subscribers/[id]` in `src/app/api/subscribers/[id]/route.ts` (detail, update, soft-delete) per contract api-subscribers.md
- [ ] T032 [P] [US1] Create `SubscriberTable` component in `src/components/domain/subscriber-table.tsx` (list with pagination, status badges, search/filter)
- [ ] T033 [P] [US1] Create `CsvImportForm` component in `src/components/domain/csv-import-form.tsx` (file upload, progress, results summary with errors)
- [ ] T034 [US1] Create subscribers list page in `src/app/(dashboard)/subscribers/page.tsx` (uses SubscriberTable, link to import, link to detail)
- [ ] T035 [US1] Create CSV import page in `src/app/(dashboard)/subscribers/import/page.tsx` (uses CsvImportForm)
- [ ] T036 [US1] Create subscriber detail page in `src/app/(dashboard)/subscribers/[id]/page.tsx` (edit form, payment proofs list, message history)
- [ ] T037 [US1] Create dashboard layout in `src/app/(dashboard)/layout.tsx` (sidebar nav: Abonados, WhatsApp, Mensajería)
- [ ] T038 [P] [US1] Write unit tests for `SubscriberService` in `tests/unit/services/subscriber.service.test.ts` (create, list filtered by org_id, dedup by phone)
- [ ] T039 [P] [US1] Write unit tests for CSV parser in `tests/unit/lib/csv-parser.test.ts` (valid CSV, invalid rows, duplicates, empty file)
- [ ] T040 [US1] Write integration test for subscriber API in `tests/integration/api/subscribers.test.ts` (CRUD, import CSV, tenant isolation — ISP-A can't see ISP-B data)

**Checkpoint**: A registered ISP can import subscribers from CSV, list/search/filter them, edit details, and delete. Another ISP sees only its own data. `pnpm test` green.

---

## Phase 4: User Story 2 — Conexión de WhatsApp Business vía Embedded Signup (Priority: P1)

**Goal**: Un ISP puede conectar su cuenta WABA vía Embedded Signup, y el token se almacena cifrado.

**Independent Test**: Complete Embedded Signup flow, verify "Connected" status in panel. Token never exposed in API responses or logs.

### Implementation for User Story 2

- [ ] T041 [P] [US2] Create `waba_configs` schema in `src/db/schema/waba-configs.ts` (all columns per data-model.md, UNIQUE(organization_id), UNIQUE(phone_number_id), encrypted_token, key_version)
- [ ] T042 [US2] Generate and run migration for `waba_configs` table
- [ ] T043 [US2] Implement WhatsApp Cloud API client in `src/lib/whatsapp/client.ts` (exchange code for token via Graph API, get WABA info, get phone number, subscribe webhook, send template message)
- [ ] T044 [US2] Implement `WabaService` in `src/services/waba.service.ts` (connect: exchange code → encrypt token → store, getStatus, disconnect, getDecryptedToken — internal only, never exposed)
- [ ] T045 [US2] Create API route `GET /api/waba/status` in `src/app/api/waba/status/route.ts` per contract api-waba.md (return connection status, displayPhone, NEVER return token)
- [ ] T046 [US2] Create API route `POST /api/waba/connect` in `src/app/api/waba/connect/route.ts` per contract api-waba.md (receive code from Embedded Signup, call WabaService.connect)
- [ ] T047 [US2] Create API route `POST /api/waba/disconnect` in `src/app/api/waba/disconnect/route.ts` per contract api-waba.md
- [ ] T048 [US2] Create `WabaConnectButton` component in `src/components/domain/waba-connect-button.tsx` (Facebook JS SDK `FB.login` for Embedded Signup, send code to backend)
- [ ] T049 [US2] Create WhatsApp config page in `src/app/(dashboard)/whatsapp/page.tsx` (show connection status, connect/disconnect button)
- [ ] T050 [US2] Add Meta JS SDK script loader in `src/app/layout.tsx` or dedicated component (load `connect.facebook.net/en_US/sdk.js` with app_id)
- [ ] T051 [P] [US2] Write unit tests for `WabaService` in `tests/unit/services/waba.service.test.ts` (connect stores encrypted token, getStatus never returns token, disconnect clears token)
- [ ] T052 [US2] Write integration test for WABA API in `tests/integration/api/waba.test.ts` (connect with mock code, verify token encrypted in DB, verify status response has no token)

**Checkpoint**: ISP can connect/disconnect WABA. Token stored encrypted, never in API responses. `pnpm test` green.

---

## Phase 5: User Story 3 — Envío de Recordatorios de Cobranza (Priority: P1)

**Goal**: Un ISP con WABA conectado puede gatillar el envío de templates Utility de recordatorio de pago a sus abonados.

**Independent Test**: Select overdue subscribers, trigger send, Meta API confirms delivery. Rate limiting works.

**Dependencies**: US1 (subscribers exist), US2 (WABA connected)

### Implementation for User Story 3

- [ ] T053 [P] [US3] Create `message_logs` schema in `src/db/schema/message-logs.ts` (all columns per data-model.md, indexes on organization_id, wamid, subscriber_id, delivery_status)
- [ ] T054 [US3] Generate and run migration for `message_logs` table
- [ ] T055 [US3] Implement rate limiter in `src/lib/rate-limiter.ts` (in-memory sliding window per organization_id, default 80 msg/min, configurable) per research.md DV-010
- [ ] T056 [US3] Implement `MessagingService` in `src/services/messaging.service.ts` (sendTemplateToSubscribers: verify WABA connected, filter opted-out, build template params per subscriber, call WhatsApp client, register message_logs with wamid, respect rate limits, return summary)
- [ ] T057 [US3] Add `sendTemplateMessage` method to WhatsApp client in `src/lib/whatsapp/client.ts` (POST to `/v21.0/{phone_number_id}/messages` with template payload, return wamid)
- [ ] T058 [US3] Create API route `POST /api/messaging/send` in `src/app/api/messaging/send/route.ts` per contract api-messaging.md (validate input, call MessagingService, return summary)
- [ ] T059 [US3] Create API route `GET /api/messaging/logs` in `src/app/api/messaging/logs/route.ts` per contract api-messaging.md (list with pagination/filters)
- [ ] T060 [P] [US3] Create `MessageSendForm` component in `src/components/domain/message-send-form.tsx` (select subscribers by status filter, choose template, send button, show results)
- [ ] T061 [US3] Create messaging page in `src/app/(dashboard)/messaging/page.tsx` (uses MessageSendForm, shows message logs table)
- [ ] T062 [P] [US3] Write unit tests for rate limiter in `tests/unit/lib/rate-limiter.test.ts` (allows under limit, blocks over limit, resets after window)
- [ ] T063 [P] [US3] Write unit tests for `MessagingService` in `tests/unit/services/messaging.service.test.ts` (sends to valid subscribers, skips opted-out, handles Meta API errors, respects rate limit)
- [ ] T064 [US3] Write integration test for messaging API in `tests/integration/api/messaging.test.ts` (send to subscribers, verify message_logs created, verify rate limit 429)

**Checkpoint**: ISP can send payment reminders to selected subscribers. Rate limiting works. Message logs visible. `pnpm test` green.

---

## Phase 6: User Story 4 — Recepción de Comprobantes de Pago (Priority: P1)

**Goal**: El endpoint de webhook recibe mensajes de Meta, verifica firma, deduplica por wamid, descarga media, sube a S3 y asocia comprobantes al abonado.

**Independent Test**: Simulate a webhook POST with valid signature and image payload. Verify deduplication, S3 upload, and payment proof visible in panel.

**Dependencies**: US1 (subscribers exist), US2 (WABA connected, phone_number_id for tenant resolution)

### Implementation for User Story 4

- [ ] T065 [P] [US4] Create `processed_webhook_events` schema in `src/db/schema/processed-events.ts` (event_id UNIQUE, event_type, organization_id nullable FK, received_at, processed_at)
- [ ] T066 [P] [US4] Create `payment_proofs` schema in `src/db/schema/payment-proofs.ts` (all columns per data-model.md, UNIQUE(wamid), indexes on organization_id, subscriber_id, review_status)
- [ ] T067 [US4] Generate and run migration for `processed_webhook_events` and `payment_proofs` tables
- [ ] T068 [US4] Implement webhook signature verification in `src/lib/whatsapp/webhook-verify.ts` (HMAC-SHA256 with `META_APP_SECRET`, `timingSafeEqual`, parse raw body before JSON) per research.md DV-004
- [ ] T069 [US4] Implement `WebhookService` in `src/services/webhook.service.ts` (processEvent: dedup by event_id INSERT ON CONFLICT, resolve org by phone_number_id, resolve subscriber by phone+org, dispatch by event type: message→handleIncomingMessage, status→handleStatusUpdate)
- [ ] T070 [US4] Implement `PaymentProofService` in `src/services/payment-proof.service.ts` (handleMediaMessage: download from Meta via Graph API, upload to S3 `/{org_id}/comprobantes/{subscriber_id}/{ts}_{wamid}.{ext}`, create payment_proof record, create message_log record)
- [ ] T071 [US4] Add `downloadMedia` method to WhatsApp client in `src/lib/whatsapp/client.ts` (GET media URL from Graph API, download binary, return buffer + mime_type)
- [ ] T072 [US4] Create webhook endpoint `GET /api/webhooks/whatsapp` in `src/app/api/webhooks/whatsapp/route.ts` (verification challenge: validate hub.verify_token, return hub.challenge) per contract webhook-whatsapp.md
- [ ] T073 [US4] Create webhook endpoint `POST /api/webhooks/whatsapp` in `src/app/api/webhooks/whatsapp/route.ts` (verify signature via raw body, parse entries, dedup, dispatch to WebhookService, always respond 200 within 5s) per contract webhook-whatsapp.md
- [ ] T074 [US4] Implement status update handler in `WebhookService` (update message_logs delivery_status by wamid for sent/delivered/read/failed)
- [ ] T075 [P] [US4] Create `PaymentProofViewer` component in `src/components/domain/payment-proof-viewer.tsx` (show presigned URL image/PDF, review status badge, approve/reject buttons)
- [ ] T076 [US4] Add payment proofs section to subscriber detail page `src/app/(dashboard)/subscribers/[id]/page.tsx` (list proofs with PaymentProofViewer, approve/reject actions)
- [ ] T077 [US4] Create API route `PATCH /api/subscribers/[id]/proofs/[proofId]` in appropriate route file (update review_status to approved/rejected)
- [ ] T078 [P] [US4] Write unit tests for webhook signature verification in `tests/unit/lib/webhook-verify.test.ts` (valid sig passes, invalid sig rejects, missing sig rejects, timing-safe comparison)
- [ ] T079 [P] [US4] Write unit tests for `WebhookService` in `tests/unit/services/webhook.service.test.ts` (dedup skips second call, resolves org by phone_number_id, handles unknown sender, processes image/document/text correctly)
- [ ] T080 [US4] Write integration test for webhook endpoint in `tests/integration/api/webhook.test.ts` (valid POST with signature → 200 + proof created, duplicate wamid → 200 + no duplicate, invalid signature → 401, GET verification challenge)
- [ ] T081 [US4] Write integration test for tenant isolation in `tests/integration/db/tenant-isolation.test.ts` (ISP-A data never visible to ISP-B across all entities)

**Checkpoint**: Webhook receives and processes Meta events. Signature verified, events deduplicated, media downloaded and stored in S3 by tenant. Proofs visible and reviewable in panel. `pnpm test` green.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories — hardening, cleanup, documentation.

- [ ] T082 [P] Add `payment_status` recalculation logic (cron job or on-read) for subscribers based on due_date vs today
- [ ] T083 [P] Add processed_webhook_events TTL cleanup job (purge events older than 7 days)
- [ ] T084 [P] Sanitize logs to ensure no tokens, secrets, or full webhook bodies are logged (audit `console.log` / logger calls)
- [ ] T085 [P] Add loading states, error toasts, and empty states to all dashboard pages
- [ ] T086 [P] Add responsive design and mobile-friendly layout to dashboard
- [ ] T087 Update `src/db/schema/index.ts` barrel file with all schemas
- [ ] T088 Run `pnpm typecheck` + `pnpm lint` + `pnpm build` and fix all errors
- [ ] T089 Run full test suite `pnpm test` and ensure all tests green
- [ ] T090 Run quickstart.md validation end-to-end (import CSV → connect WABA → send reminder → receive webhook → view proof)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──→ Phase 2: Foundational ──→ Phase 3: US1 (Subscribers) ──→ Phase 5: US3 (Messaging)
                                          ├─→ Phase 4: US2 (WABA Connect)──→ Phase 5: US3 (Messaging)
                                          │                                ├─→ Phase 6: US4 (Webhooks)
                                          └─→ Phase 7: Polish (after all stories)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|-----------|----------------|
| US1 — Subscribers | Foundational (Phase 2) | Phase 2 complete |
| US2 — WABA Connect | Foundational (Phase 2) | Phase 2 complete |
| US3 — Messaging | US1 + US2 | Phase 3 + Phase 4 complete |
| US4 — Webhooks | US1 + US2 | Phase 3 + Phase 4 complete |

### Within Each User Story

- Schema → Migration → Service → API routes → UI components → Pages → Tests

### Parallel Opportunities

- **Phase 1**: T003, T004, T005, T006 can all run in parallel
- **Phase 2**: T010, T011, T012 (schemas), T016, T017, T018, T019 (libs), T023, T024 (tests) in parallel
- **Phase 3+4**: US1 and US2 can run in parallel after Phase 2
- **Phase 5+6**: US3 and US4 can run in parallel after US1+US2 are done
- **Within each story**: Schema + parallel model tasks, then service, then API, then UI

---

## Parallel Example: Phase 2 (Foundational)

```
# Launch all schemas in parallel:
T010: Create organizations schema
T011: Create users schema
T012: Create service_plans schema

# After schemas, launch all libs in parallel:
T016: Implement crypto.ts
T017: Implement s3.ts
T018: Implement tenant.ts
T019: Implement validators.ts

# After libs, launch tests in parallel:
T023: Unit tests crypto.ts
T024: Unit tests s3.ts
```

## Parallel Example: US1 + US2 (after Foundational)

```
# Developer A: US1 (Subscribers)
T025 → T026 → T027 → T028 → T029-T031 → T032-T033 → T034-T037 → T038-T040

# Developer B: US2 (WABA Connect)
T041 → T042 → T043 → T044 → T045-T047 → T048-T050 → T051-T052
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 — Subscribers
4. **STOP and VALIDATE**: Import CSV, verify list, verify tenant isolation
5. Deploy/demo if ready — ISP can manage subscribers

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Subscribers) → Test independently → Deploy (MVP!)
3. US2 (WABA Connect) → Test independently → Deploy
4. US3 (Messaging) → Test independently → Deploy (core value!)
5. US4 (Webhooks + Proofs) → Test independently → Deploy (full cycle!)
6. Polish → Hardening → Final deploy

### Single Developer Strategy (Recommended)

1. Phase 1 + 2: Setup + Foundation (~day 1)
2. Phase 3: US1 Subscribers (~day 2-3)
3. Phase 4: US2 WABA Connect (~day 3-4)
4. Phase 5: US3 Messaging (~day 4-5)
5. Phase 6: US4 Webhooks + Proofs (~day 5-6)
6. Phase 7: Polish (~day 7)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [USn] label maps task to specific user story for traceability
- Each user story should be independently completable and testable at its checkpoint
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- ALL methods in services MUST require `organizationId` parameter (Constitution Principle I)
- NEVER return `encrypted_token` in any API response (Constitution Principle II)
- Webhook endpoint MUST verify signature before parsing body (Constitution Principle III)
