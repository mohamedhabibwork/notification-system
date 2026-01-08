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
} from 'drizzle-orm/pg-core';
import { notificationTemplates } from './notification-templates.schema';

export const templateVersions = pgTable('template_versions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  templateId: bigint('template_id', { mode: 'number' })
    .notNull()
    .references(() => notificationTemplates.id),
  version: integer('version').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  bodyTemplate: text('body_template').notNull(),
  htmlTemplate: text('html_template'),
  variables: jsonb('variables').$type<Record<string, unknown>>(),
  changeDescription: text('change_description'),
  changeType: varchar('change_type', { length: 50 }), // 'major', 'minor', 'patch'
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: varchar('created_by', { length: 255 }),
});

export type TemplateVersion = typeof templateVersions.$inferSelect;
export type NewTemplateVersion = typeof templateVersions.$inferInsert;
