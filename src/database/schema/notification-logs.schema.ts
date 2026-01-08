import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { notifications } from './notifications.schema';
import { tenants } from './tenants.schema';
import { authenticatedRole, serviceRole } from './roles.schema';

export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: uuid('uuid').defaultRandom().unique().notNull(),
    notificationId: bigserial('notification_id', { mode: 'number' })
      .notNull()
      .references(() => notifications.id),
    tenantId: bigserial('tenant_id', { mode: 'number' })
      .notNull()
      .references(() => tenants.id),
    eventType: varchar('event_type', { length: 50 }).notNull(), // queued, sent, delivered, failed
    providerName: varchar('provider_name', { length: 100 }),
    providerMessageId: varchar('provider_message_id', { length: 255 }),
    providerResponse: jsonb('provider_response').$type<Record<string, any>>(),
    statusCode: varchar('status_code', { length: 50 }),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').$type<Record<string, any>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    // Authenticated users: tenant isolation
    pgPolicy('notification_logs_tenant_isolation_policy', {
      for: 'all',
      to: authenticatedRole,
      using: sql`tenant_id = current_setting('app.current_tenant_id', true)::bigint`,
    }),
    // Service role: full access
    pgPolicy('notification_logs_service_full_access_policy', {
      for: 'all',
      to: serviceRole,
      using: sql`true`,
    }),
  ],
);

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type NewNotificationLog = typeof notificationLogs.$inferInsert;
