CREATE TABLE "agent_profile" (
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
--> statement-breakpoint
CREATE TABLE "kb_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"question" text,
	"answer" text,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_promise" (
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
--> statement-breakpoint
CREATE TABLE "payment_receipt" (
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
--> statement-breakpoint
CREATE TABLE "waba_webhook_deadletter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text NOT NULL,
	"phone_number_id" text,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "whatsapp_opt_in" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "whatsapp_opt_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "whatsapp_opt_in_source" text;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "whatsapp_phone_e164" text;--> statement-breakpoint
ALTER TABLE "waba_configs" ADD COLUMN "verified_name" text;--> statement-breakpoint
ALTER TABLE "waba_configs" ADD COLUMN "business_id" text;--> statement-breakpoint
ALTER TABLE "waba_configs" ADD COLUMN "meta_user_id" text;--> statement-breakpoint
ALTER TABLE "waba_configs" ADD COLUMN "token_type" text;--> statement-breakpoint
ALTER TABLE "waba_configs" ADD COLUMN "token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waba_configs" ADD COLUMN "webhook_verify_token" text;--> statement-breakpoint
ALTER TABLE "waba_configs" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "waba_configs" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "waba_configs" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "waba_config_id" uuid;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "channel" text DEFAULT 'whatsapp' NOT NULL;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "recipient_phone" text;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "template_language" text;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "message_text" text;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "error_title" text;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "raw_payload" jsonb;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "last_event_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD COLUMN "ai_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD COLUMN "handoff_at" timestamp;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD COLUMN "handoff_reason" text;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD COLUMN "last_inbound_at" timestamp;--> statement-breakpoint
ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_entry" ADD CONSTRAINT "kb_entry_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_promise" ADD CONSTRAINT "payment_promise_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_promise" ADD CONSTRAINT "payment_promise_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_promise" ADD CONSTRAINT "payment_promise_conversation_id_chatbot_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chatbot_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_conversation_id_chatbot_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chatbot_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_message_id_chatbot_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chatbot_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_profile_org_uq" ON "agent_profile" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "kb_org_idx" ON "kb_entry" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payment_promise_org_sub_idx" ON "payment_promise" USING btree ("organization_id","subscriber_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_promise_active_uq" ON "payment_promise" USING btree ("organization_id","subscriber_id") WHERE "payment_promise"."status" = 'pendiente';--> statement-breakpoint
CREATE INDEX "payment_receipt_org_status_idx" ON "payment_receipt" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_receipt_message_uq" ON "payment_receipt" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "waba_webhook_deadletter_pending_idx" ON "waba_webhook_deadletter" USING btree ("received_at");--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_waba_config_id_waba_configs_id_fk" FOREIGN KEY ("waba_config_id") REFERENCES "public"."waba_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscribers_whatsapp_phone_idx" ON "subscribers" USING btree ("whatsapp_phone_e164");--> statement-breakpoint
CREATE UNIQUE INDEX "waba_configs_org_waba_phone_uq" ON "waba_configs" USING btree ("organization_id","waba_id","phone_number_id");--> statement-breakpoint
CREATE INDEX "waba_configs_org_active_idx" ON "waba_configs" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "waba_configs_meta_user_id_idx" ON "waba_configs" USING btree ("meta_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_logs_wamid_uq" ON "message_logs" USING btree ("wamid") WHERE "message_logs"."wamid" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "message_logs_org_created_idx" ON "message_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "message_logs_org_config_event_idx" ON "message_logs" USING btree ("organization_id","waba_config_id","last_event_at");--> statement-breakpoint
CREATE INDEX "message_logs_org_recipient_idx" ON "message_logs" USING btree ("organization_id","recipient_phone");