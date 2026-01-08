import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  boolean,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).unique(),
  isActive: boolean('is_active').default(true).notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>(),
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

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
