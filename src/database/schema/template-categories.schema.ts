import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';

export const templateCategories = pgTable('template_categories', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  tenantId: bigserial('tenant_id', { mode: 'number' })
    .notNull()
    .references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  color: varchar('color', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: bigserial('sort_order', { mode: 'number' }).default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: varchar('created_by', { length: 255 }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedBy: varchar('updated_by', { length: 255 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type TemplateCategory = typeof templateCategories.$inferSelect;
export type NewTemplateCategory = typeof templateCategories.$inferInsert;
