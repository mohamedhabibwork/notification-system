CREATE TABLE "feature_flags" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"tenant_id" bigserial NOT NULL,
	"configuration" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	CONSTRAINT "feature_flags_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "feature_flags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "template_categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" bigserial NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"color" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" bigserial DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "template_categories_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "template_localizations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"template_id" bigserial NOT NULL,
	"language" varchar(10) NOT NULL,
	"subject" varchar(500),
	"body_template" text NOT NULL,
	"html_template" text,
	"translated_by" varchar(255),
	"reviewed_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_localizations_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "template_language_unique" UNIQUE("template_id","language")
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"template_id" bigserial NOT NULL,
	"version" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(500),
	"body_template" text NOT NULL,
	"html_template" text,
	"variables" jsonb,
	"change_description" text,
	"change_type" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	CONSTRAINT "template_versions_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "webhook_configurations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" bigserial NOT NULL,
	"name" varchar(255) NOT NULL,
	"webhook_url" varchar(500) NOT NULL,
	"webhook_secret" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"retry_config" jsonb DEFAULT '{"maxRetries":3,"initialDelay":1000,"maxDelay":30000,"backoffStrategy":"exponential"}'::jsonb,
	"event_overrides" jsonb DEFAULT '{}'::jsonb,
	"headers" jsonb DEFAULT '{}'::jsonb,
	"enabled_events" jsonb DEFAULT '["notification.queued","notification.sent","notification.delivered","notification.failed","notification.read"]'::jsonb,
	"timeout_ms" bigserial DEFAULT 10000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "webhook_configurations_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "webhook_tenant_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE TABLE "webhook_delivery_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"webhook_config_id" bigserial NOT NULL,
	"notification_id" bigserial NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"webhook_url" varchar(500) NOT NULL,
	"request_payload" jsonb,
	"request_headers" jsonb,
	"response_status_code" integer,
	"response_body" text,
	"response_time" integer,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"success" varchar(20) NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_delivery_logs_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "notification_templates" ADD COLUMN "category_id" bigserial NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD COLUMN "parent_template_id" bigserial NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD COLUMN "tags" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_categories" ADD CONSTRAINT "template_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_localizations" ADD CONSTRAINT "template_localizations_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_configurations" ADD CONSTRAINT "webhook_configurations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery_logs" ADD CONSTRAINT "webhook_delivery_logs_webhook_config_id_webhook_configurations_id_fk" FOREIGN KEY ("webhook_config_id") REFERENCES "public"."webhook_configurations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery_logs" ADD CONSTRAINT "webhook_delivery_logs_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_category_id_template_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."template_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_parent_template_id_notification_templates_id_fk" FOREIGN KEY ("parent_template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;