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
 */
export async function setTenantContext(
  db: DrizzleDB,
  tenantId: number,
): Promise<void> {
  await db.execute(
    sql`SET LOCAL app.current_tenant_id = ${tenantId.toString()}`,
  );
}

/**
 * Clear the tenant context (sets to null)
 */
export async function clearTenantContext(db: DrizzleDB): Promise<void> {
  await db.execute(sql`SET LOCAL app.current_tenant_id = NULL`);
}

/**
 * Execute a function within a tenant context
 * Automatically sets and clears the tenant context
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
    await setTenantContext(tx as any, tenantId);
    try {
      return await fn(tx as any);
    } finally {
      await clearTenantContext(tx as any);
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
 * Set the database role for the current session
 * Used to switch between authenticated and service roles
 */
export async function setSessionRole(
  db: DrizzleDB,
  role: 'authenticated' | 'service_role' | 'anon',
): Promise<void> {
  await db.execute(sql.raw(`SET LOCAL ROLE ${role}`));
}

/**
 * Reset the session role to default
 */
export async function resetSessionRole(db: DrizzleDB): Promise<void> {
  await db.execute(sql`RESET ROLE`);
}
