CREATE ROLE "anon";--> statement-breakpoint
CREATE ROLE "authenticated";--> statement-breakpoint
CREATE ROLE "service_role";--> statement-breakpoint
CREATE TABLE "bulk_notification_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"bulk_job_id" bigserial NOT NULL,
	"notification_id" bigserial NOT NULL,
	"row_number" integer NOT NULL,
	"csv_data" jsonb,
	"status" varchar(50) NOT NULL,
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bulk_notification_items_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "bulk_notification_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bulk_notification_jobs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" bigserial NOT NULL,
	"job_name" varchar(255) NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"file_path" varchar(1000),
	"total_count" integer DEFAULT 0 NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) NOT NULL,
	"configuration" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	CONSTRAINT "bulk_notification_jobs_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "bulk_notification_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lookup_types" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"type_name" varchar(100) NOT NULL,
	"description" varchar(500),
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	CONSTRAINT "lookup_types_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "lookup_types_type_name_unique" UNIQUE("type_name")
);
--> statement-breakpoint
CREATE TABLE "lookups" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"lookup_type_id" bigserial NOT NULL,
	"code" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" varchar(500),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	CONSTRAINT "lookups_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "lookups_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notification_batches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"batch_token" varchar(255) NOT NULL,
	"tenant_id" bigserial NOT NULL,
	"total_expected" integer,
	"total_sent" integer DEFAULT 0 NOT NULL,
	"total_delivered" integer DEFAULT 0 NOT NULL,
	"total_failed" integer DEFAULT 0 NOT NULL,
	"status_id" bigserial NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "notification_batches_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "notification_batches_batch_id_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
ALTER TABLE "notification_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" bigserial NOT NULL,
	"tenant_id" bigserial NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"provider_name" varchar(100),
	"provider_message_id" varchar(255),
	"provider_response" jsonb,
	"status_code" varchar(50),
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_logs_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "notification_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" bigserial NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"channel" varchar(50) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	CONSTRAINT "notification_preferences_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_providers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" bigserial NOT NULL,
	"channel" varchar(50) NOT NULL,
	"provider_name" varchar(100) NOT NULL,
	"credentials" jsonb NOT NULL,
	"configuration" jsonb,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	CONSTRAINT "notification_providers_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "notification_providers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" bigserial NOT NULL,
	"name" varchar(255) NOT NULL,
	"template_code" varchar(100) NOT NULL,
	"template_type_id" bigserial NOT NULL,
	"channel" varchar(50) NOT NULL,
	"subject" varchar(500),
	"body_template" text NOT NULL,
	"html_template" text,
	"variables" jsonb,
	"language" varchar(10) DEFAULT 'en',
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "notification_templates_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "notification_templates_template_code_unique" UNIQUE("template_code")
);
--> statement-breakpoint
ALTER TABLE "notification_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" bigserial NOT NULL,
	"channel" varchar(50) NOT NULL,
	"template_id" bigserial NOT NULL,
	"batch_id" bigserial NOT NULL,
	"recipient_user_id" varchar(255) NOT NULL,
	"recipient_user_type" varchar(100),
	"recipient_email" varchar(255),
	"recipient_phone" varchar(50),
	"recipient_metadata" jsonb,
	"subject" varchar(500),
	"body" text NOT NULL,
	"html_body" text,
	"template_variables" jsonb,
	"attachments" jsonb,
	"status_id" bigserial NOT NULL,
	"priority_id" bigserial NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" varchar(1000),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"bulk_job_id" bigserial NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "notifications_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tenants_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "tenants_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "bulk_notification_items" ADD CONSTRAINT "bulk_notification_items_bulk_job_id_bulk_notification_jobs_id_fk" FOREIGN KEY ("bulk_job_id") REFERENCES "public"."bulk_notification_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_notification_items" ADD CONSTRAINT "bulk_notification_items_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_notification_jobs" ADD CONSTRAINT "bulk_notification_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lookups" ADD CONSTRAINT "lookups_lookup_type_id_lookup_types_id_fk" FOREIGN KEY ("lookup_type_id") REFERENCES "public"."lookup_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_batches" ADD CONSTRAINT "notification_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_batches" ADD CONSTRAINT "notification_batches_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_providers" ADD CONSTRAINT "notification_providers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_template_type_id_lookups_id_fk" FOREIGN KEY ("template_type_id") REFERENCES "public"."lookups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_batch_id_notification_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."notification_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_priority_id_lookups_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."lookups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "bulk_notification_items_tenant_isolation_policy" ON "bulk_notification_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (
      SELECT 1 FROM bulk_notification_jobs 
      WHERE bulk_notification_jobs.id = bulk_notification_items.bulk_job_id 
      AND bulk_notification_jobs.tenant_id = current_setting('app.current_tenant_id', true)::bigint
    ));--> statement-breakpoint
CREATE POLICY "bulk_notification_items_service_full_access_policy" ON "bulk_notification_items" AS PERMISSIVE FOR ALL TO "service_role" USING (true);--> statement-breakpoint
CREATE POLICY "bulk_notification_jobs_tenant_isolation_policy" ON "bulk_notification_jobs" AS PERMISSIVE FOR ALL TO "authenticated" USING (tenant_id = current_setting('app.current_tenant_id', true)::bigint);--> statement-breakpoint
CREATE POLICY "bulk_notification_jobs_service_full_access_policy" ON "bulk_notification_jobs" AS PERMISSIVE FOR ALL TO "service_role" USING (true);--> statement-breakpoint
CREATE POLICY "notification_batches_tenant_isolation_policy" ON "notification_batches" AS PERMISSIVE FOR ALL TO "authenticated" USING (tenant_id = current_setting('app.current_tenant_id', true)::bigint);--> statement-breakpoint
CREATE POLICY "notification_batches_service_full_access_policy" ON "notification_batches" AS PERMISSIVE FOR ALL TO "service_role" USING (true);--> statement-breakpoint
CREATE POLICY "notification_logs_tenant_isolation_policy" ON "notification_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING (tenant_id = current_setting('app.current_tenant_id', true)::bigint);--> statement-breakpoint
CREATE POLICY "notification_logs_service_full_access_policy" ON "notification_logs" AS PERMISSIVE FOR ALL TO "service_role" USING (true);--> statement-breakpoint
CREATE POLICY "notification_preferences_tenant_isolation_policy" ON "notification_preferences" AS PERMISSIVE FOR ALL TO "authenticated" USING (tenant_id = current_setting('app.current_tenant_id', true)::bigint);--> statement-breakpoint
CREATE POLICY "notification_preferences_service_full_access_policy" ON "notification_preferences" AS PERMISSIVE FOR ALL TO "service_role" USING (true);--> statement-breakpoint
CREATE POLICY "notification_providers_tenant_isolation_policy" ON "notification_providers" AS PERMISSIVE FOR ALL TO "authenticated" USING (tenant_id = current_setting('app.current_tenant_id', true)::bigint);--> statement-breakpoint
CREATE POLICY "notification_providers_service_full_access_policy" ON "notification_providers" AS PERMISSIVE FOR ALL TO "service_role" USING (true);--> statement-breakpoint
CREATE POLICY "notification_templates_tenant_isolation_policy" ON "notification_templates" AS PERMISSIVE FOR ALL TO "authenticated" USING (tenant_id = current_setting('app.current_tenant_id', true)::bigint);--> statement-breakpoint
CREATE POLICY "notification_templates_service_full_access_policy" ON "notification_templates" AS PERMISSIVE FOR ALL TO "service_role" USING (true);--> statement-breakpoint
CREATE POLICY "notifications_tenant_isolation_policy" ON "notifications" AS PERMISSIVE FOR ALL TO "authenticated" USING (tenant_id = current_setting('app.current_tenant_id', true)::bigint);--> statement-breakpoint
CREATE POLICY "notifications_service_full_access_policy" ON "notifications" AS PERMISSIVE FOR ALL TO "service_role" USING (true);