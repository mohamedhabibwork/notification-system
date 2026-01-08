import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { notificationTemplates } from './notification-templates.schema';

export const templateLocalizations = pgTable(
  'template_localizations',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: uuid('uuid').defaultRandom().unique().notNull(),
    templateId: bigserial('template_id', { mode: 'number' })
      .notNull()
      .references(() => notificationTemplates.id),
    language: varchar('language', { length: 10 }).notNull(), // 'en', 'es', 'fr', 'ar', etc.
    subject: varchar('subject', { length: 500 }),
    bodyTemplate: text('body_template').notNull(),
    htmlTemplate: text('html_template'),
    translatedBy: varchar('translated_by', { length: 255 }),
    reviewedBy: varchar('reviewed_by', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    templateLanguageUnique: unique('template_language_unique').on(
      table.templateId,
      table.language,
    ),
  }),
);

export type TemplateLocalization = typeof templateLocalizations.$inferSelect;
export type NewTemplateLocalization = typeof templateLocalizations.$inferInsert;
