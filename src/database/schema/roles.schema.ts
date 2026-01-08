import { pgRole } from 'drizzle-orm/pg-core';

/**
 * PostgreSQL Roles for Row-Level Security (RLS)
 *
 * These roles are used to control access to data at the row level.
 * - authenticatedRole: Used for requests from authenticated users (with JWT)
 * - serviceRole: Used for internal backend operations that need full access
 * - anonRole: Used for unauthenticated/public access (if needed)
 */

export const authenticatedRole = pgRole('authenticated');
export const serviceRole = pgRole('service_role');
export const anonRole = pgRole('anon');
