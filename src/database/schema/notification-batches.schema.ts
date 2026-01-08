import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  integer,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.schema';
import { lookups } from './lookups.schema';
import { authenticatedRole, serviceRole } from './roles.schema';

export const notificationBatches = pgTable(
  'notification_batches',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: uuid('uuid').defaultRandom().unique().notNull(),
    batchId: uuid('batch_id').defaultRandom().unique().notNull(),
    batchToken: varchar('batch_token', { length: 255 }).notNull(), // for authentication
    tenantId: bigserial('tenant_id', { mode: 'number' })
      .notNull()
      .references(() => tenants.id),
    totalExpected: integer('total_expected'), // nullable, updated as chunks arrive
    totalSent: integer('total_sent').default(0).notNull(),
    totalDelivered: integer('total_delivered').default(0).notNull(),
    totalFailed: integer('total_failed').default(0).notNull(),
    statusId: bigserial('status_id', { mode: 'number' }).references(
      () => lookups.id,
    ), // batch_status
    createdBy: varchar('created_by', { length: 255 }).notNull(), // service name
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    // Authenticated users: tenant isolation
    pgPolicy('notification_batches_tenant_isolation_policy', {
      for: 'all',
      to: authenticatedRole,
      using: sql`tenant_id = current_setting('app.current_tenant_id', true)::bigint`,
    }),
    // Service role: full access
    pgPolicy('notification_batches_service_full_access_policy', {
      for: 'all',
      to: serviceRole,
      using: sql`true`,
    }),
  ],
);

export type NotificationBatch = typeof notificationBatches.$inferSelect;
export type NewNotificationBatch = typeof notificationBatches.$inferInsert;
