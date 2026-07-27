-- Idempotent Migration 0007_loose_sabretooth.sql
-- Handles both WABA schema updates and safe existence checks for agent_profile/AI tables.

-- 1. Tables created if not existing
CREATE TABLE IF NOT EXISTS "agent_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"name" text DEFAULT 'Asistente' NOT NULL,
	"tone" text,
	"instructions" text,
	"escalation_rules" text,
	"greeting" text,
	"payment_instructions" text,
	"allow_payment_promise" boolean DEFAULT true NOT NULL,
	"allow_ticket_creation" boolean DEFAULT true NOT NULL,
	"allow_receipt_capture" boolean DEFAULT true NOT NULL,
	"max_promise_days" integer DEFAULT 7 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "kb_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"question" text,
	"answer" text,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payment_promise" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"conversation_id" uuid,
	"promised_for" date NOT NULL,
	"amount" numeric(12, 2),
	"status" text DEFAULT 'pendiente' NOT NULL,
	"source" text DEFAULT 'ia' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payment_receipt" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"conversation_id" uuid,
	"message_id" uuid,
	"storage_key" text,
	"declared_amount" numeric(12, 2),
	"reference" text,
	"status" text DEFAULT 'en_revision' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "waba_webhook_deadletter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text NOT NULL,
	"phone_number_id" text,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone
);

-- 2. Add Columns if not existing
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "whatsapp_opt_in" boolean DEFAULT false;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "whatsapp_opt_in_at" timestamp with time zone;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "whatsapp_opt_in_source" text;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "whatsapp_phone_e164" text;

ALTER TABLE "waba_configs" ADD COLUMN IF NOT EXISTS "verified_name" text;
ALTER TABLE "waba_configs" ADD COLUMN IF NOT EXISTS "business_id" text;
ALTER TABLE "waba_configs" ADD COLUMN IF NOT EXISTS "meta_user_id" text;
ALTER TABLE "waba_configs" ADD COLUMN IF NOT EXISTS "token_type" text;
ALTER TABLE "waba_configs" ADD COLUMN IF NOT EXISTS "token_expires_at" timestamp with time zone;
ALTER TABLE "waba_configs" ADD COLUMN IF NOT EXISTS "webhook_verify_token" text;
ALTER TABLE "waba_configs" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "waba_configs" ADD COLUMN IF NOT EXISTS "last_error" text;
ALTER TABLE "waba_configs" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;

ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "waba_config_id" uuid;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "channel" text DEFAULT 'whatsapp' NOT NULL;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "recipient_phone" text;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "template_language" text;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "message_text" text;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "error_code" text;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "error_title" text;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "raw_payload" jsonb;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "last_event_at" timestamp with time zone;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

ALTER TABLE "chatbot_conversations" ADD COLUMN IF NOT EXISTS "ai_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "chatbot_conversations" ADD COLUMN IF NOT EXISTS "handoff_at" timestamp;
ALTER TABLE "chatbot_conversations" ADD COLUMN IF NOT EXISTS "handoff_reason" text;
ALTER TABLE "chatbot_conversations" ADD COLUMN IF NOT EXISTS "is_test" boolean DEFAULT false NOT NULL;
ALTER TABLE "chatbot_conversations" ADD COLUMN IF NOT EXISTS "last_inbound_at" timestamp;

-- 3. Foreign Keys (safe block checks)
DO $$ BEGIN
 ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "kb_entry" ADD CONSTRAINT "kb_entry_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "payment_promise" ADD CONSTRAINT "payment_promise_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "payment_promise" ADD CONSTRAINT "payment_promise_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "payment_promise" ADD CONSTRAINT "payment_promise_conversation_id_chatbot_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chatbot_conversations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_conversation_id_chatbot_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chatbot_conversations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_message_id_chatbot_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chatbot_messages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_waba_config_id_waba_configs_id_fk" FOREIGN KEY ("waba_config_id") REFERENCES "public"."waba_configs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "agent_profile_org_uq" ON "agent_profile" USING btree ("organization_id");
CREATE INDEX IF NOT EXISTS "kb_org_idx" ON "kb_entry" USING btree ("organization_id");
CREATE INDEX IF NOT EXISTS "payment_promise_org_sub_idx" ON "payment_promise" USING btree ("organization_id","subscriber_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_promise_active_uq" ON "payment_promise" USING btree ("organization_id","subscriber_id") WHERE "payment_promise"."status" = 'pendiente';
CREATE INDEX IF NOT EXISTS "payment_receipt_org_status_idx" ON "payment_receipt" USING btree ("organization_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_receipt_message_uq" ON "payment_receipt" USING btree ("message_id");
CREATE INDEX IF NOT EXISTS "waba_webhook_deadletter_pending_idx" ON "waba_webhook_deadletter" USING btree ("received_at");
CREATE INDEX IF NOT EXISTS "subscribers_whatsapp_phone_idx" ON "subscribers" USING btree ("whatsapp_phone_e164");
CREATE UNIQUE INDEX IF NOT EXISTS "waba_configs_org_waba_phone_uq" ON "waba_configs" USING btree ("organization_id","waba_id","phone_number_id");
CREATE INDEX IF NOT EXISTS "waba_configs_org_active_idx" ON "waba_configs" USING btree ("organization_id","is_active");
CREATE INDEX IF NOT EXISTS "waba_configs_meta_user_id_idx" ON "waba_configs" USING btree ("meta_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "message_logs_wamid_uq" ON "message_logs" USING btree ("wamid") WHERE "message_logs"."wamid" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "message_logs_org_created_idx" ON "message_logs" USING btree ("organization_id","created_at");
CREATE INDEX IF NOT EXISTS "message_logs_org_config_event_idx" ON "message_logs" USING btree ("organization_id","waba_config_id","last_event_at");
CREATE INDEX IF NOT EXISTS "message_logs_org_recipient_idx" ON "message_logs" USING btree ("organization_id","recipient_phone");