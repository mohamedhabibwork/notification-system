import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';

export const webhookConfigurations = pgTable(
  'webhook_configurations',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: uuid('uuid').defaultRandom().unique().notNull(),
    tenantId: bigserial('tenant_id', { mode: 'number' })
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    webhookUrl: varchar('webhook_url', { length: 500 }).notNull(),
    webhookSecret: text('webhook_secret'), // Encrypted
    isActive: boolean('is_active').default(true).notNull(),
    retryConfig: jsonb('retry_config').$type<{
      maxRetries: number;
      initialDelay: number;
      maxDelay: number;
      backoffStrategy: 'exponential' | 'linear' | 'constant';
    }>().default({
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffStrategy: 'exponential',
    }),
    eventOverrides: jsonb('event_overrides').$type<Record<string, string>>().default({}),
    headers: jsonb('headers').$type<Record<string, string>>().default({}),
    enabledEvents: jsonb('enabled_events').$type<string[]>().default([
      'notification.queued',
      'notification.sent',
      'notification.delivered',
      'notification.failed',
      'notification.read',
    ]),
    timeoutMs: bigserial('timeout_ms', { mode: 'number' }).default(10000),
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
  (table) => ({
    tenantNameUnique: unique('webhook_tenant_name_unique').on(
      table.tenantId,
      table.name,
    ),
  }),
);

export type WebhookConfiguration = typeof webhookConfigurations.$inferSelect;
export type NewWebhookConfiguration = typeof webhookConfigurations.$inferInsert;
