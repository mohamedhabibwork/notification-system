import { sql } from 'drizzle-orm';
import type { DrizzleDB } from './drizzle.module';

/**
 * Tenant Context Helper for Row-Level Security (RLS)
 *
 * These functions manage the PostgreSQL session variable `app.current_tenant_id`
 * which is used by RLS policies to enforce tenant isolation.
 */

/**
 * Set the current tenant context for the database session
 * This sets the PostgreSQL session variable that RLS policies use
 * 
 * WARNING: This function should ONLY be used within transactions via withTenantContext()
 * Do NOT use in middleware or outside transactions - it will contaminate the connection pool
 * 
 * @param db - Database instance (should be a transaction instance)
 * @param tenantId - Tenant ID to set
 */
export async function setTenantContext(
  db: DrizzleDB,
  tenantId: number,
): Promise<void> {
  try {
    // Use SET LOCAL within transactions for isolation
    // This setting is automatically cleared when the transaction ends
    await db.execute(
      sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`),
    );
  } catch (error) {
    // Fallback to set_config with is_local=true for transaction-scoped setting
    // Third parameter (true) makes this transaction-local
    try {
      await db.execute(
        sql.raw(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`),
      );
    } catch (fallbackError) {
      console.warn(`Failed to set tenant context (fallback also failed): ${error.message}`);
      // Don't throw - allow queries to proceed without RLS
    }
  }
}

/**
 * Clear the tenant context (sets to empty string)
 * 
 * Note: This is typically not needed as SET LOCAL automatically clears at transaction end
 * Kept for backward compatibility
 */
export async function clearTenantContext(db: DrizzleDB): Promise<void> {
  try {
    await db.execute(sql.raw(`SET LOCAL app.current_tenant_id = ''`));
  } catch (error) {
    // Fallback to set_config with is_local=true
    try {
      await db.execute(
        sql.raw(`SELECT set_config('app.current_tenant_id', '', true)`),
      );
    } catch (fallbackError) {
      // Ignore errors - transaction end will clear the setting anyway
    }
  }
}

/**
 * Execute a function within a tenant context
 * Automatically sets and clears the tenant context
 * 
 * Note: Within transactions, we use SET LOCAL for better isolation
 *
 * @example
 * await withTenantContext(db, tenantId, async (db) => {
 *   return await db.select().from(notifications);
 * });
 */
export async function withTenantContext<T>(
  db: DrizzleDB,
  tenantId: number,
  fn: (db: DrizzleDB) => Promise<T>,
): Promise<T> {
  return await db.transaction(async (tx) => {
    // Within transaction, we can use SET LOCAL for better isolation
    try {
      await (tx as any).execute(
        sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`),
      );
    } catch (error) {
      // Fallback to set_config with is_local=true for transaction-scoped setting
      await (tx as any).execute(
        sql.raw(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`),
      );
    }
    
    try {
      return await fn(tx as any);
    } finally {
      try {
        await (tx as any).execute(sql.raw(`SET LOCAL app.current_tenant_id = ''`));
      } catch (error) {
        await (tx as any).execute(
          sql.raw(`SELECT set_config('app.current_tenant_id', '', true)`),
        );
      }
    }
  });
}

/**
 * Get the current tenant ID from the session variable
 * Returns null if not set
 */
export async function getCurrentTenantId(
  db: DrizzleDB,
): Promise<number | null> {
  const result = (await db.execute(
    sql`SELECT current_setting('app.current_tenant_id', true) as tenant_id`,
  )) as any;

  const tenantId = result[0]?.tenant_id;
  return tenantId ? parseInt(tenantId, 10) : null;
}

/**
 * Set the database role for the current transaction
 * Used to switch between authenticated and service roles
 * 
 * WARNING: Should only be used within transactions
 * Do NOT use in middleware - it will contaminate the connection pool
 */
export async function setSessionRole(
  db: DrizzleDB,
  role: 'authenticated' | 'service_role' | 'anon',
): Promise<void> {
  try {
    // Use SET LOCAL ROLE for transaction-level role change
    await db.execute(sql.raw(`SET LOCAL ROLE ${role}`));
  } catch (error) {
    console.warn(`Failed to set transaction role to ${role}: ${error.message}`);
    // Continue - role setting is optional for most operations
  }
}

/**
 * Reset the transaction role to default
 * 
 * Note: This is typically not needed as SET LOCAL automatically resets at transaction end
 */
export async function resetSessionRole(db: DrizzleDB): Promise<void> {
  try {
    await db.execute(sql`RESET ROLE`);
  } catch (error) {
    // Ignore - transaction end will reset the role anyway
  }
}
