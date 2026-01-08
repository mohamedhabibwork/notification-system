import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.schema';
import { notificationTemplates } from './notification-templates.schema';
import { notificationBatches } from './notification-batches.schema';
import { lookups } from './lookups.schema';
import { authenticatedRole, serviceRole } from './roles.schema';

export const notifications = pgTable(
  'notifications',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: uuid('uuid').defaultRandom().unique().notNull(),
    tenantId: bigint('tenant_id', { mode: 'number' })
      .notNull()
      .references(() => tenants.id),
    channel: varchar('channel', { length: 50 }).notNull(),
    templateId: bigint('template_id', { mode: 'number' }).references(
      () => notificationTemplates.id,
    ),
    batchId: bigint('batch_id', { mode: 'number' }).references(
      () => notificationBatches.id,
    ), // for batch chunking
    recipientUserId: varchar('recipient_user_id', { length: 255 }).notNull(),
    recipientUserType: varchar('recipient_user_type', { length: 100 }),
    recipientEmail: varchar('recipient_email', { length: 255 }),
    recipientPhone: varchar('recipient_phone', { length: 50 }),
    recipientMetadata:
      jsonb('recipient_metadata').$type<Record<string, unknown>>(),
    subject: varchar('subject', { length: 500 }),
    body: text('body').notNull(),
    htmlBody: text('html_body'),
    templateVariables:
      jsonb('template_variables').$type<Record<string, unknown>>(),
    attachments: jsonb('attachments').$type<any[]>(),
    statusId: bigint('status_id', { mode: 'number' })
      .references(() => lookups.id)
      .notNull(), // notification_status
    priorityId: bigint('priority_id', { mode: 'number' }).references(
      () => lookups.id,
    ), // notification_priority
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: varchar('failure_reason', { length: 1000 }),
    retryCount: integer('retry_count').default(0).notNull(),
    bulkJobId: bigint('bulk_job_id', { mode: 'number' }), // for CSV bulk jobs
    metadata: jsonb('metadata').$type<Record<string, unknown>>(), // campaignId, source, etc
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: varchar('created_by', { length: 255 }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: varchar('updated_by', { length: 255 }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    // Authenticated users: tenant isolation
    pgPolicy('notifications_tenant_isolation_policy', {
      for: 'all',
      to: authenticatedRole,
      using: sql`tenant_id = current_setting('app.current_tenant_id', true)::bigint`,
    }),
    // Service role: full access
    pgPolicy('notifications_service_full_access_policy', {
      for: 'all',
      to: serviceRole,
      using: sql`true`,
    }),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
