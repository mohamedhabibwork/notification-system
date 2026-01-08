import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  integer,
  text,
  jsonb,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.schema';
import { authenticatedRole, serviceRole } from './roles.schema';

export const bulkNotificationJobs = pgTable(
  'bulk_notification_jobs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: uuid('uuid').defaultRandom().unique().notNull(),
    tenantId: bigserial('tenant_id', { mode: 'number' })
      .notNull()
      .references(() => tenants.id),
    jobName: varchar('job_name', { length: 255 }).notNull(),
    sourceType: varchar('source_type', { length: 50 }).notNull(), // csv, api, manual
    filePath: varchar('file_path', { length: 1000 }),
    totalCount: integer('total_count').default(0).notNull(),
    processedCount: integer('processed_count').default(0).notNull(),
    successCount: integer('success_count').default(0).notNull(),
    failedCount: integer('failed_count').default(0).notNull(),
    status: varchar('status', { length: 50 }).notNull(), // pending, processing, completed, failed
    configuration: jsonb('configuration').$type<Record<string, unknown>>(), // channel, template, etc
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: varchar('created_by', { length: 255 }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: varchar('updated_by', { length: 255 }),
  },
  (t) => [
    // Authenticated users: tenant isolation
    pgPolicy('bulk_notification_jobs_tenant_isolation_policy', {
      for: 'all',
      to: authenticatedRole,
      using: sql`tenant_id = current_setting('app.current_tenant_id', true)::bigint`,
    }),
    // Service role: full access
    pgPolicy('bulk_notification_jobs_service_full_access_policy', {
      for: 'all',
      to: serviceRole,
      using: sql`true`,
    }),
  ],
);

export type BulkNotificationJob = typeof bulkNotificationJobs.$inferSelect;
export type NewBulkNotificationJob = typeof bulkNotificationJobs.$inferInsert;
