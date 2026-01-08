import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.schema';
import { lookups } from './lookups.schema';
import { authenticatedRole, serviceRole } from './roles.schema';
import { templateCategories } from './template-categories.schema';

export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: uuid('uuid').defaultRandom().unique().notNull(),
    tenantId: bigserial('tenant_id', { mode: 'number' })
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    templateCode: varchar('template_code', { length: 100 }).unique().notNull(),
    templateTypeId: bigserial('template_type_id', {
      mode: 'number',
    }).references(() => lookups.id),
    categoryId: bigserial('category_id', { mode: 'number' }).references(
      () => templateCategories.id,
    ),
    parentTemplateId: bigserial('parent_template_id', { mode: 'number' }),
    channel: varchar('channel', { length: 50 }).notNull(), // email, sms, fcm, whatsapp
    subject: varchar('subject', { length: 500 }),
    bodyTemplate: text('body_template').notNull(),
    htmlTemplate: text('html_template'),
    variables: jsonb('variables').$type<Record<string, any>>(),
    tags: jsonb('tags').$type<string[]>().default(sql`'[]'`),
    language: varchar('language', { length: 10 }).default('en'),
    version: integer('version').default(1).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
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
    pgPolicy('notification_templates_tenant_isolation_policy', {
      for: 'all',
      to: authenticatedRole,
      using: sql`tenant_id = current_setting('app.current_tenant_id', true)::bigint`,
    }),
    // Service role: full access
    pgPolicy('notification_templates_service_full_access_policy', {
      for: 'all',
      to: serviceRole,
      using: sql`true`,
    }),
  ],
);

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert;
