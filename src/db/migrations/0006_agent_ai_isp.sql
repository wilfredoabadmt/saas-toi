-- Agente de IA para CRM de cobranza ISP (SaaS TOI).
-- Idempotente: se puede aplicar múltiples veces sin errores.

-- 1. Perfil del agente (uno por organización)
CREATE TABLE IF NOT EXISTS "agent_profile" (
  "id"                     text PRIMARY KEY,
  "organization_id"        uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "enabled"                boolean NOT NULL DEFAULT false,
  "name"                   text NOT NULL DEFAULT 'Asistente',
  "tone"                   text,
  "instructions"           text,
  "escalation_rules"       text,
  "greeting"               text,
  "payment_instructions"   text,
  "allow_payment_promise"  boolean NOT NULL DEFAULT true,
  "allow_ticket_creation"  boolean NOT NULL DEFAULT true,
  "allow_receipt_capture"  boolean NOT NULL DEFAULT true,
  "max_promise_days"       integer NOT NULL DEFAULT 7,
  "created_at"             timestamp NOT NULL DEFAULT now(),
  "updated_at"             timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_profile_org_uq"
  ON "agent_profile" ("organization_id");

-- 2. Knowledge base
CREATE TABLE IF NOT EXISTS "kb_entry" (
  "id"              text PRIMARY KEY,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "kind"            text NOT NULL,
  "question"        text,
  "answer"          text,
  "content"         text,
  "created_at"      timestamp NOT NULL DEFAULT now(),
  "updated_at"      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "kb_org_idx" ON "kb_entry" ("organization_id");

-- 3. Promesas de pago
CREATE TABLE IF NOT EXISTS "payment_promise" (
  "id"              text PRIMARY KEY,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "subscriber_id"   uuid NOT NULL REFERENCES "subscribers"("id") ON DELETE CASCADE,
  "conversation_id" uuid REFERENCES "chatbot_conversations"("id") ON DELETE SET NULL,
  "promised_for"    date NOT NULL,
  "amount"          numeric(12, 2),
  "status"          text NOT NULL DEFAULT 'pendiente',
  "source"          text NOT NULL DEFAULT 'ia',
  "created_at"      timestamp NOT NULL DEFAULT now(),
  "updated_at"      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_promise_org_sub_idx"
  ON "payment_promise" ("organization_id", "subscriber_id");

CREATE UNIQUE INDEX IF NOT EXISTS "payment_promise_active_uq"
  ON "payment_promise" ("organization_id", "subscriber_id")
  WHERE "status" = 'pendiente';

-- 4. Comprobantes de pago (en revisión humana)
CREATE TABLE IF NOT EXISTS "payment_receipt" (
  "id"              text PRIMARY KEY,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "subscriber_id"   uuid NOT NULL REFERENCES "subscribers"("id") ON DELETE CASCADE,
  "conversation_id" uuid REFERENCES "chatbot_conversations"("id") ON DELETE SET NULL,
  "message_id"      uuid REFERENCES "chatbot_messages"("id") ON DELETE SET NULL,
  "storage_key"     text,
  "declared_amount" numeric(12, 2),
  "reference"       text,
  "status"          text NOT NULL DEFAULT 'en_revision',
  "reviewed_by"     text,
  "reviewed_at"     timestamp,
  "created_at"      timestamp NOT NULL DEFAULT now(),
  "updated_at"      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_receipt_org_status_idx"
  ON "payment_receipt" ("organization_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "payment_receipt_message_uq"
  ON "payment_receipt" ("message_id");

-- 5. Nuevas columnas en chatbot_conversations
ALTER TABLE "chatbot_conversations" ADD COLUMN IF NOT EXISTS "ai_enabled"      boolean NOT NULL DEFAULT true;
ALTER TABLE "chatbot_conversations" ADD COLUMN IF NOT EXISTS "handoff_at"      timestamp;
ALTER TABLE "chatbot_conversations" ADD COLUMN IF NOT EXISTS "handoff_reason"  text;
ALTER TABLE "chatbot_conversations" ADD COLUMN IF NOT EXISTS "is_test"         boolean NOT NULL DEFAULT false;
ALTER TABLE "chatbot_conversations" ADD COLUMN IF NOT EXISTS "last_inbound_at" timestamp;

-- 6. Perfil por defecto para organizaciones existentes
INSERT INTO "agent_profile" ("id", "organization_id", "enabled", "name")
SELECT 'agp_' || replace(o."id"::text, '-', ''), o."id", false, 'Asistente'
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "agent_profile" ap WHERE ap."organization_id" = o."id"
);
