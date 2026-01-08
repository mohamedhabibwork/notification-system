# Database Schema Fixes - BigSerial Issues

**Date:** January 8, 2026  
**Status:** ✅ Completed

## Problem

The database migration was failing with the error:
```
error: multiple default values specified for column "sort_order" of table "template_categories"
```

and similar errors for `timeout_ms` in webhook_configurations.

### Root Cause

The issue occurred because `bigserial` was being used incorrectly in two scenarios:

1. **Foreign Key Fields**: Using `bigserial` (auto-incrementing) instead of `bigint` for foreign key references
2. **Regular Integer Fields**: Using `bigserial` with explicit `.default()` values (e.g., `sortOrder`, `timeoutMs`)

**Important:** `bigserial` is an auto-incrementing type (equivalent to `SERIAL` in PostgreSQL) and should **only** be used for primary key IDs, not for foreign keys or regular integer fields.

## Files Fixed

### Critical Issues (bigserial with explicit defaults)

1. **`template-categories.schema.ts`**
   - ❌ `sortOrder: bigserial('sort_order', { mode: 'number' }).default(0)`
   - ✅ `sortOrder: integer('sort_order').default(0).notNull()`

2. **`webhook-configurations.schema.ts`**
   - ❌ `timeoutMs: bigserial('timeout_ms', { mode: 'number' }).default(10000)`
   - ✅ `timeoutMs: integer('timeout_ms').default(10000).notNull()`

### Foreign Key Fixes (bigserial → bigint)

All foreign key references were changed from `bigserial` to `bigint`:

3. **`notifications.schema.ts`**
   - ❌ `tenantId: bigserial('tenant_id', { mode: 'number' })`
   - ✅ `tenantId: bigint('tenant_id', { mode: 'number' })`
   - ❌ `templateId: bigserial('template_id', { mode: 'number' })`
   - ✅ `templateId: bigint('template_id', { mode: 'number' })`
   - ❌ `batchId: bigserial('batch_id', { mode: 'number' })`
   - ✅ `batchId: bigint('batch_id', { mode: 'number' })`
   - ❌ `statusId: bigserial('status_id', { mode: 'number' })`
   - ✅ `statusId: bigint('status_id', { mode: 'number' })`
   - ❌ `priorityId: bigserial('priority_id', { mode: 'number' })`
   - ✅ `priorityId: bigint('priority_id', { mode: 'number' })`
   - ❌ `bulkJobId: bigserial('bulk_job_id', { mode: 'number' })`
   - ✅ `bulkJobId: bigint('bulk_job_id', { mode: 'number' })`

4. **`notification-templates.schema.ts`**
   - ❌ `tenantId: bigserial`
   - ✅ `tenantId: bigint`
   - ❌ `templateTypeId: bigserial`
   - ✅ `templateTypeId: bigint`
   - ❌ `categoryId: bigserial`
   - ✅ `categoryId: bigint`
   - ❌ `parentTemplateId: bigserial`
   - ✅ `parentTemplateId: bigint`

5. **`notification-batches.schema.ts`**
   - ❌ `tenantId: bigserial`
   - ✅ `tenantId: bigint`
   - ❌ `statusId: bigserial`
   - ✅ `statusId: bigint`

6. **`notification-logs.schema.ts`**
   - ❌ `notificationId: bigserial`
   - ✅ `notificationId: bigint`
   - ❌ `tenantId: bigserial`
   - ✅ `tenantId: bigint`

7. **`notification-providers.schema.ts`**
   - ❌ `tenantId: bigserial`
   - ✅ `tenantId: bigint`

8. **`notification-preferences.schema.ts`**
   - ❌ `tenantId: bigserial`
   - ✅ `tenantId: bigint`

9. **`bulk-notification-jobs.schema.ts`**
   - ❌ `tenantId: bigserial`
   - ✅ `tenantId: bigint`

10. **`bulk-notification-items.schema.ts`**
    - ❌ `bulkJobId: bigserial`
    - ✅ `bulkJobId: bigint`
    - ❌ `notificationId: bigserial`
    - ✅ `notificationId: bigint`

11. **`template-versions.schema.ts`**
    - ❌ `templateId: bigserial`
    - ✅ `templateId: bigint`

12. **`template-localizations.schema.ts`**
    - ❌ `templateId: bigserial`
    - ✅ `templateId: bigint`

13. **`webhook-delivery-logs.schema.ts`**
    - ❌ `webhookConfigId: bigserial`
    - ✅ `webhookConfigId: bigint`
    - ❌ `notificationId: bigserial`
    - ✅ `notificationId: bigint`

14. **`lookups.schema.ts`**
    - ❌ `lookupTypeId: bigserial`
    - ✅ `lookupTypeId: bigint`

15. **`feature-flags.schema.ts`**
    - ❌ `tenantId: bigserial`
    - ✅ `tenantId: bigint`

16. **`template-categories.schema.ts`** (also foreign key fix)
    - ❌ `tenantId: bigserial`
    - ✅ `tenantId: bigint`

17. **`webhook-configurations.schema.ts`** (also foreign key fix)
    - ❌ `tenantId: bigserial`
    - ✅ `tenantId: bigint`

## Migration Process

1. **Fixed all schema files** - Changed `bigserial` to appropriate types
2. **Deleted old migrations** - Removed incorrect migration files
3. **Generated fresh migration** - Created new migration from corrected schemas
4. **Fixed role creation** - Updated migration to handle existing database roles
5. **Applied migration successfully** - Migration completed without errors

## Migration File Changes

### Role Creation Fix

Changed from:
```sql
CREATE ROLE "anon";
CREATE ROLE "authenticated";
CREATE ROLE "service_role";
```

To:
```sql
DO $$ BEGIN
  CREATE ROLE "anon";
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
-- (repeated for each role)
```

This allows the migration to run even if roles already exist in the database.

## Verification

✅ **Build Status**: Successful (no TypeScript errors)  
✅ **Migration Status**: Applied successfully  
✅ **Linting**: No errors  
✅ **Database Schema**: All tables created correctly

## Key Takeaways

### When to use each type:

- **`bigserial`**: ONLY for auto-incrementing primary keys
  ```typescript
  id: bigserial('id', { mode: 'number' }).primaryKey()
  ```

- **`bigint`**: For foreign key references to bigserial primary keys
  ```typescript
  tenantId: bigint('tenant_id', { mode: 'number' })
    .notNull()
    .references(() => tenants.id)
  ```

- **`integer`**: For regular integer fields (sort order, timeouts, counts, etc.)
  ```typescript
  sortOrder: integer('sort_order').default(0).notNull()
  timeoutMs: integer('timeout_ms').default(10000).notNull()
  retryCount: integer('retry_count').default(0).notNull()
  ```

### Why this matters:

- `bigserial` creates a sequence in PostgreSQL
- Sequences already have an implicit "next value" behavior
- Adding `.default(0)` conflicts with the sequence's auto-increment
- Foreign keys should reference the value, not create new sequences

## Impact

- **0 breaking changes** to existing data
- **0 API changes** required
- **All relationships preserved**
- **Database integrity maintained**

## Next Steps

The database schema is now correct and all migrations can be applied cleanly. No further action required for this issue.
