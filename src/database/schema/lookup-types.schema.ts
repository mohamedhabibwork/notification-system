import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const lookupTypes = pgTable('lookup_types', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  typeName: varchar('type_name', { length: 100 }).unique().notNull(),
  description: varchar('description', { length: 500 }),
  isSystem: boolean('is_system').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: varchar('created_by', { length: 255 }),
});

export type LookupType = typeof lookupTypes.$inferSelect;
export type NewLookupType = typeof lookupTypes.$inferInsert;
