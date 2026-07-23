CREATE TABLE "message_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscriber_id" uuid,
	"wamid" text NOT NULL,
	"direction" text NOT NULL,
	"message_type" text NOT NULL,
	"template_name" text,
	"content_preview" text,
	"delivery_status" text DEFAULT 'sent' NOT NULL,
	"failure_reason" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"status_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_logs_org_id_idx" ON "message_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "message_logs_subscriber_id_idx" ON "message_logs" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "message_logs_wamid_idx" ON "message_logs" USING btree ("wamid");--> statement-breakpoint
CREATE INDEX "message_logs_delivery_status_idx" ON "message_logs" USING btree ("organization_id","delivery_status");