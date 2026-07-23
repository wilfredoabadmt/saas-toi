CREATE TABLE "waba_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"waba_id" text NOT NULL,
	"phone_number_id" text NOT NULL,
	"display_phone" text NOT NULL,
	"encrypted_token" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"connection_status" text DEFAULT 'connected' NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"disconnected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waba_configs_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "waba_configs_phone_number_id_unique" UNIQUE("phone_number_id")
);
--> statement-breakpoint
ALTER TABLE "waba_configs" ADD CONSTRAINT "waba_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;