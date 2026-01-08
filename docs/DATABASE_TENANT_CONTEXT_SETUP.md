# Database Tenant Context Setup

## Overview

This application uses PostgreSQL custom configuration parameters for Row-Level Security (RLS) to enforce tenant isolation. The parameter `app.current_tenant_id` is set per session to filter data by tenant.

## Problem: "Failed query: SET LOCAL app.current_tenant_id"

If you encounter this error, it means the custom configuration parameter isn't properly set up in PostgreSQL.

## Solution 1: Run the Migration (Recommended)

Apply the migration that sets up the custom parameter:

```bash
# Generate and run migrations
npm run db:migrate
```

Or manually run the SQL migration:

```bash
psql -U notification -d notification_db -f src/database/migrations/0001_add_tenant_context_config.sql
```

## Solution 2: Manual PostgreSQL Configuration

### Option A: Database-Level Configuration

Connect to your PostgreSQL database and run:

```sql
-- Set the custom parameter for your database
ALTER DATABASE notification_db SET app.current_tenant_id = '';

-- Create helper functions (optional but recommended)
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id_value TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_tenant_context()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION set_tenant_context(TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_tenant_context() TO PUBLIC;
```

### Option B: Server-Level Configuration (postgresql.conf)

For server-wide configuration, add to `postgresql.conf`:

```conf
# Custom configuration parameters
app.current_tenant_id = ''
```

Then reload PostgreSQL:

```bash
# On Linux/Mac
sudo systemctl reload postgresql

# Or
pg_ctl reload

# On Docker
docker exec -it postgres-container pg_ctl reload
```

## Solution 3: Code Already Handles It (Default)

The application code has been updated to use PostgreSQL's `set_config()` function as a fallback, which works without special configuration:

```typescript
// Automatic fallback in tenant-context.ts
await db.execute(
  sql.raw(`SELECT set_config('app.current_tenant_id', '${tenantId}', false)`)
);
```

This means the application should work out-of-the-box without any special PostgreSQL configuration.

## Verification

Test that tenant context is working:

```sql
-- Set a tenant context
SELECT set_config('app.current_tenant_id', '1', false);

-- Verify it's set
SELECT current_setting('app.current_tenant_id', true);
-- Should return: '1'

-- Or use the helper function (if migration was run)
SELECT get_tenant_context();
-- Should return: '1'
```

## How It Works

### Session-Level vs Transaction-Level

- **`SET parameter = value`**: Session-level, persists for the entire database session
- **`SET LOCAL parameter = value`**: Transaction-level, only valid within a transaction
- **`set_config(parameter, value, is_local)`**: Function-based, works anywhere
  - `is_local = false`: Session-level
  - `is_local = true`: Transaction-level

### Usage in Application

1. **HTTP Requests (Middleware)**:
   - Uses session-level settings (`SET` or `set_config(..., false)`)
   - Applied to each HTTP request via `TenantContextMiddleware`

2. **Transactions**:
   - Uses transaction-level settings (`SET LOCAL` or `set_config(..., true)`)
   - Applied via `withTenantContext()` helper function

### Row-Level Security (RLS) Policies

The tenant context is used in RLS policies:

```sql
-- Example RLS policy
CREATE POLICY tenant_isolation ON notifications
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));
```

This ensures users can only access data for their tenant.

## Troubleshooting

### Error: "unrecognized configuration parameter"

- **Cause**: PostgreSQL doesn't recognize the custom parameter
- **Solution**: Use the fallback method (already implemented) or configure the parameter

### Error: "SET LOCAL can only be used in transaction blocks"

- **Cause**: Using `SET LOCAL` outside a transaction
- **Solution**: Code has been updated to use `SET` for session-level operations

### Error: "permission denied to set parameter"

- **Cause**: Database user doesn't have permission
- **Solution**: Grant necessary permissions or use the helper functions

## Best Practices

1. **Use Migrations**: Always apply the provided migration for proper setup
2. **Test Locally**: Verify tenant context works before deploying
3. **Monitor Logs**: Check for tenant context warnings in application logs
4. **Use Transactions**: For complex operations, use `withTenantContext()` helper
5. **Docker Setup**: Include custom parameter configuration in Docker initialization scripts

## Related Files

- `src/database/tenant-context.ts` - Tenant context helper functions
- `src/common/middleware/tenant-context.middleware.ts` - HTTP middleware
- `src/database/migrations/0001_add_tenant_context_config.sql` - Migration script
- `src/common/interceptors/grpc-tenant.interceptor.ts` - gRPC interceptor
