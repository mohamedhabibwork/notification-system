import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { webhookConfigurations } from './webhook-configurations.schema';
import { notifications } from './notifications.schema';

export const webhookDeliveryLogs = pgTable('webhook_delivery_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  webhookConfigId: bigserial('webhook_config_id', { mode: 'number' })
    .notNull()
    .references(() => webhookConfigurations.id),
  notificationId: bigserial('notification_id', { mode: 'number' }).references(
    () => notifications.id,
  ),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  webhookUrl: varchar('webhook_url', { length: 500 }).notNull(),
  requestPayload: jsonb('request_payload'),
  requestHeaders: jsonb('request_headers'),
  responseStatusCode: integer('response_status_code'),
  responseBody: text('response_body'),
  responseTime: integer('response_time'), // milliseconds
  attemptNumber: integer('attempt_number').default(1).notNull(),
  success: varchar('success', { length: 20 }).notNull(), // 'success', 'failed', 'pending'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type WebhookDeliveryLog = typeof webhookDeliveryLogs.$inferSelect;
export type NewWebhookDeliveryLog = typeof webhookDeliveryLogs.$inferInsert;
