import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  integer,
  varchar,
  text,
  jsonb,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { bulkNotificationJobs } from './bulk-notification-jobs.schema';
import { notifications } from './notifications.schema';
import { authenticatedRole, serviceRole } from './roles.schema';

export const bulkNotificationItems = pgTable(
  'bulk_notification_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: uuid('uuid').defaultRandom().unique().notNull(),
    bulkJobId: bigint('bulk_job_id', { mode: 'number' })
      .notNull()
      .references(() => bulkNotificationJobs.id),
    notificationId: bigint('notification_id', { mode: 'number' }).references(
      () => notifications.id,
    ),
    rowNumber: integer('row_number').notNull(),
    csvData: jsonb('csv_data').$type<Record<string, unknown>>(),
    status: varchar('status', { length: 50 }).notNull(), // pending, processed, failed
    errorMessage: text('error_message'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    // Authenticated users: inherit tenant from parent job
    pgPolicy('bulk_notification_items_tenant_isolation_policy', {
      for: 'all',
      to: authenticatedRole,
      using: sql`EXISTS (
      SELECT 1 FROM bulk_notification_jobs 
      WHERE bulk_notification_jobs.id = bulk_notification_items.bulk_job_id 
      AND bulk_notification_jobs.tenant_id = current_setting('app.current_tenant_id', true)::bigint
    )`,
    }),
    // Service role: full access
    pgPolicy('bulk_notification_items_service_full_access_policy', {
      for: 'all',
      to: serviceRole,
      using: sql`true`,
    }),
  ],
);

export type BulkNotificationItem = typeof bulkNotificationItems.$inferSelect;
export type NewBulkNotificationItem = typeof bulkNotificationItems.$inferInsert;
