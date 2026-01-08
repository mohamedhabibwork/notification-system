# Database Connection Pool Best Practices

## Critical Issue: Session Variables and Connection Pools

### The Problem

When using PostgreSQL with connection pooling (like in this application), **session-level variables contaminate the connection pool**. This causes serious issues:

```typescript
// ❌ BAD - DO NOT DO THIS
async function middleware(req, res, next) {
  await db.execute(`SET app.current_tenant_id = '${tenantId}'`);
  next(); // Connection returns to pool WITH the tenant_id set
}

// Next request uses the same connection
// Gets wrong tenant's data! 🐛
```

**What happens:**
1. Request A sets `tenant_id = 1` on connection from pool
2. Connection returns to pool **still set to tenant 1**
3. Request B (for tenant 2) gets the same connection
4. Request B sees tenant 1's data! **SECURITY BREACH**

### The Solution

Use **transaction-local settings** that automatically clear:

```typescript
// ✅ GOOD - Use transaction-local settings
await db.transaction(async (tx) => {
  await tx.execute(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
  // Query within transaction
  return await tx.select().from(table);
  // SET LOCAL automatically clears when transaction ends
});
```

## Implementation in This Application

### Middleware (NO Database Session Variables)

```typescript
// src/common/middleware/tenant-context.middleware.ts
async use(req: Request, res: Response, next: NextFunction) {
  // ✅ Store tenant ID in request object only
  if (tenantId) {
    (req as any).tenantId = tenantId;
  }
  
  // ❌ DO NOT set database session variables here
  // await setTenantContext(this.db, tenantId); // NO!
  
  next();
}
```

### Services (Use Transactions)

```typescript
// ✅ Use withTenantContext for database operations
async findUserData(tenantId: number, userId: string) {
  return await withTenantContext(this.db, tenantId, async (db) => {
    // Within this transaction, tenant_id is set
    // RLS policies enforce tenant isolation
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId));
  });
}
```

## SET vs SET LOCAL

| Command | Scope | Persists After Transaction | Safe for Connection Pools |
|---------|-------|---------------------------|--------------------------|
| `SET parameter = value` | Session | ✅ Yes | ❌ NO - Contaminates pool |
| `SET LOCAL parameter = value` | Transaction | ❌ No (auto-clears) | ✅ YES - Transaction-scoped |
| `set_config(param, value, false)` | Session | ✅ Yes | ❌ NO - Contaminates pool |
| `set_config(param, value, true)` | Transaction | ❌ No (auto-clears) | ✅ YES - Transaction-scoped |

## Row-Level Security (RLS) with Connection Pools

### Option 1: Transaction-Local Settings (Recommended)

```sql
-- In your RLS policy
CREATE POLICY tenant_isolation ON notifications
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));
```

```typescript
// In your service
async getData(tenantId: number) {
  return await db.transaction(async (tx) => {
    // Set transaction-local variable
    await tx.execute(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    
    // RLS policy uses current_setting() to enforce isolation
    return await tx.select().from(notifications);
  });
}
```

### Option 2: Explicit WHERE Clauses (Simpler)

```typescript
// Always include tenant_id in queries
async getData(tenantId: number, userId: string) {
  return await db.select().from(notifications)
    .where(and(
      eq(notifications.tenantId, tenantId), // ✅ Explicit filter
      eq(notifications.userId, userId)
    ));
}
```

**Benefits of Option 2:**
- No RLS complexity
- No session variable issues
- Easier to debug
- Clear and explicit
- Works with any connection pool

**We recommend Option 2 for most applications.**

## Common Mistakes

### ❌ Mistake 1: Setting Session Variables in Middleware

```typescript
// BAD
@Injectable()
class TenantMiddleware {
  async use(req, res, next) {
    await this.db.execute(`SET app.current_tenant_id = '${tenantId}'`);
    next();
  }
}
```

**Why it's bad:** Connection returns to pool with tenant_id set, affecting other requests.

### ❌ Mistake 2: Using SET LOCAL Outside Transactions

```typescript
// BAD
async getData(tenantId) {
  await this.db.execute(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
  return await this.db.select().from(table); // Error: SET LOCAL outside transaction
}
```

**Why it's bad:** `SET LOCAL` only works inside transactions.

### ❌ Mistake 3: Not Using Transactions with SET LOCAL

```typescript
// BAD
async getData(tenantId) {
  await this.db.execute(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
  // No transaction wrapper - won't work!
  return await this.db.select().from(table);
}
```

**Why it's bad:** Must be within a transaction block.

## Best Practices

### ✅ 1. Store Context in Request Object

```typescript
// Middleware: Store in request only
(req as any).tenantId = tenantId;
(req as any).userId = userId;
```

### ✅ 2. Use Explicit WHERE Clauses

```typescript
// Services: Always filter by tenant
.where(eq(table.tenantId, tenantId))
```

### ✅ 3. Use Transactions for Complex Operations

```typescript
// Wrap multi-step operations in transactions
await db.transaction(async (tx) => {
  await tx.insert(table1).values(data1);
  await tx.insert(table2).values(data2);
  // Both operations succeed or both fail
});
```

### ✅ 4. Use Helper Functions

```typescript
// Use withTenantContext helper if you need RLS
async getData(tenantId: number) {
  return await withTenantContext(this.db, tenantId, async (db) => {
    return await db.select().from(table);
  });
}
```

### ✅ 5. Validate Tenant Access

```typescript
// Always validate tenant access at service layer
if (user.tenantId !== requestedTenantId) {
  throw new ForbiddenException('Access denied');
}
```

## Testing Connection Pool Issues

```typescript
// Test: Ensure no tenant contamination
describe('Connection Pool Isolation', () => {
  it('should not leak tenant context between requests', async () => {
    // Request 1: Set tenant 1
    const data1 = await service.getData(1, 'user1');
    
    // Request 2: Set tenant 2
    const data2 = await service.getData(2, 'user2');
    
    // Verify no data from tenant 1 in tenant 2's results
    expect(data2.every(row => row.tenantId === 2)).toBe(true);
  });
});
```

## Debugging

Enable connection pool debugging:

```typescript
const queryClient = postgres(databaseUrl, {
  debug: (connection, query, parameters) => {
    console.log('Query:', query);
    console.log('Params:', parameters);
  },
  onnotice: (notice) => {
    console.log('Notice:', notice);
  },
});
```

Check for leaked session variables:

```sql
-- Check current settings
SELECT * FROM pg_settings WHERE name LIKE 'app.%';

-- Check per-connection settings
SELECT pg_backend_pid(), current_setting('app.current_tenant_id', true);
```

## Summary

| Approach | Connection Pool Safe | Complexity | Recommended |
|----------|---------------------|------------|-------------|
| Session variables in middleware | ❌ NO | Low | ❌ Never |
| Transaction-local variables | ✅ YES | High | ⚠️ If you need RLS |
| Explicit WHERE clauses | ✅ YES | Low | ✅ Always |
| Transactions for multi-step ops | ✅ YES | Medium | ✅ Always |

**Our Recommendation:**
1. Use explicit `WHERE` clauses for tenant filtering
2. Use transactions for multi-step operations
3. Avoid session-level variables entirely
4. Store context in request objects only

This approach is simpler, safer, and easier to maintain.
