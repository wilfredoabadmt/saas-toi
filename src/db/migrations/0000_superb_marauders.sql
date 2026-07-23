CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_org_unique" UNIQUE("email","organization_id")
);
--> statement-breakpoint
CREATE TABLE "service_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"speed_down" text,
	"speed_up" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_plans_name_org_unique" UNIQUE("name","organization_id")
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"service_plan_id" uuid,
	"monthly_amount" numeric(10, 2) NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"payment_status" text DEFAULT 'current' NOT NULL,
	"address" text,
	"notes" text,
	"opted_out_whatsapp" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_phone_org_unique" UNIQUE("phone","organization_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_plans" ADD CONSTRAINT "service_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_service_plan_id_service_plans_id_fk" FOREIGN KEY ("service_plan_id") REFERENCES "public"."service_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_org_id_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "service_plans_org_id_idx" ON "service_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscribers_org_id_idx" ON "subscribers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscribers_org_payment_status_idx" ON "subscribers" USING btree ("organization_id","payment_status");--> statement-breakpoint
CREATE INDEX "subscribers_org_due_date_idx" ON "subscribers" USING btree ("organization_id","due_date");