CREATE TABLE "processed_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"organization_id" uuid,
	"payload_hash" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "processed_webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "payment_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"message_log_id" uuid,
	"wamid" text NOT NULL,
	"file_type" text NOT NULL,
	"mime_type" text NOT NULL,
	"s3_key" text NOT NULL,
	"file_size_bytes" integer,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_proofs_wamid_unique" UNIQUE("wamid")
);
--> statement-breakpoint
ALTER TABLE "processed_webhook_events" ADD CONSTRAINT "processed_webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_message_log_id_message_logs_id_fk" FOREIGN KEY ("message_log_id") REFERENCES "public"."message_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "processed_events_received_at_idx" ON "processed_webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "payment_proofs_org_id_idx" ON "payment_proofs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payment_proofs_subscriber_id_idx" ON "payment_proofs" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "payment_proofs_review_status_idx" ON "payment_proofs" USING btree ("organization_id","review_status");