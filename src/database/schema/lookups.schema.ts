import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { lookupTypes } from './lookup-types.schema';

export const lookups = pgTable('lookups', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  lookupTypeId: bigserial('lookup_type_id', { mode: 'number' })
    .notNull()
    .references(() => lookupTypes.id),
  code: varchar('code', { length: 100 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: varchar('created_by', { length: 255 }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedBy: varchar('updated_by', { length: 255 }),
});

export type Lookup = typeof lookups.$inferSelect;
export type NewLookup = typeof lookups.$inferInsert;
