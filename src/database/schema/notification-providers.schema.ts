import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.schema';
import { authenticatedRole, serviceRole } from './roles.schema';

export const notificationProviders = pgTable(
  'notification_providers',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: uuid('uuid').defaultRandom().unique().notNull(),
    tenantId: bigserial('tenant_id', { mode: 'number' })
      .notNull()
      .references(() => tenants.id),
    channel: varchar('channel', { length: 50 }).notNull(), // email, sms, fcm, whatsapp
    providerName: varchar('provider_name', { length: 100 }).notNull(), // twilio, sendgrid, etc
    credentials: jsonb('credentials').$type<Record<string, any>>().notNull(), // encrypted
    configuration: jsonb('configuration').$type<Record<string, any>>(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    priority: integer('priority').default(0).notNull(), // for fallback
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
    // Authenticated users: tenant isolation (critical for credential security)
    pgPolicy('notification_providers_tenant_isolation_policy', {
      for: 'all',
      to: authenticatedRole,
      using: sql`tenant_id = current_setting('app.current_tenant_id', true)::bigint`,
    }),
    // Service role: full access
    pgPolicy('notification_providers_service_full_access_policy', {
      for: 'all',
      to: serviceRole,
      using: sql`true`,
    }),
  ],
);

export type NotificationProvider = typeof notificationProviders.$inferSelect;
export type NewNotificationProvider = typeof notificationProviders.$inferInsert;
