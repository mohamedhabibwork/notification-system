# User Notifications Authentication Fix

**Date:** January 8, 2026  
**Status:** ✅ Fixed

## Problem

User notifications endpoints were failing with the error:
```
Failed query: select ... from "notifications" where ("notifications"."recipient_user_id" = $1 and "notifications"."tenant_id" = $2 ...)
params: ,,50
```

The query parameters were empty, causing database queries to fail.

## Root Cause

Two related issues:

1. **JWT Authentication Failure**: The JWT token had an invalid audience (`expected: notification-client`)
2. **Missing Parameter Validation**: When authentication failed, the `userId` and `tenantId` parameters were `undefined`, but the service didn't validate them before executing database queries

## Changes Made

### 1. Enhanced Parameter Validation in Service

Added validation to all methods in `user-notifications.service.ts`:

```typescript
// Validate required parameters
if (!userId) {
  throw new ForbiddenException('User ID is required. Please ensure you are authenticated.');
}
if (!tenantId) {
  throw new ForbiddenException('Tenant ID is required. Please provide x-tenant-id header or ensure your JWT contains tenant_id.');
}
```

**Methods Updated:**
- `findUserNotifications()`
- `findOneUserNotification()`
- `bulkDelete()`
- `getUnreadCount()`
- `markAllAsRead()`

### 2. Improved `@CurrentTenant()` Decorator

Enhanced the decorator to:
- Add NaN validation for parsed integers
- Support additional fallback sources (query params)
- Better error handling

**File:** `src/modules/auth/decorators/current-tenant.decorator.ts`

```typescript
// Try to get tenant_id from user context
if (user?.tenant_id) {
  const parsed = parseInt(user.tenant_id, 10);
  if (!isNaN(parsed)) {
    return parsed;
  }
}

// Try to get from request headers
const tenantHeader = request.headers['x-tenant-id'];
if (tenantHeader) {
  const parsed = parseInt(tenantHeader, 10);
  if (!isNaN(parsed)) {
    return parsed;
  }
}

// Try to get from query params (fallback)
const tenantQuery = request.query?.tenantId;
if (tenantQuery) {
  const parsed = parseInt(tenantQuery, 10);
  if (!isNaN(parsed)) {
    return parsed;
  }
}
```

## How to Use the API

### Authentication Requirements

To use user notifications endpoints, you need:

1. **Valid JWT Token**: Include a Bearer token with the correct audience
2. **Tenant Identification**: Provide tenant context via one of:
   - JWT claim: `tenant_id` in the token payload
   - HTTP Header: `x-tenant-id: <tenant-id>`
   - Query param: `?tenantId=<tenant-id>` (fallback)

### Example API Calls

#### Get User Notifications

```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: 1"
```

#### With Query Parameters

```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications?status=unread&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: 1"
```

#### Get Unread Count

```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: 1"
```

#### Mark Notification as Read

```bash
curl -X PATCH "http://localhost:3000/api/v1/users/me/notifications/123/read" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: 1"
```

#### Mark All as Read

```bash
curl -X POST "http://localhost:3000/api/v1/users/me/notifications/mark-all-read" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: 1"
```

#### Delete Notification

```bash
curl -X DELETE "http://localhost:3000/api/v1/users/me/notifications/123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: 1"
```

#### Bulk Delete

```bash
curl -X DELETE "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationIds": ["1", "2", "3"]
  }'
```

### Error Responses

#### Missing User ID (Authentication Failure)

```json
{
  "statusCode": 403,
  "message": "User ID is required. Please ensure you are authenticated.",
  "error": "Forbidden"
}
```

#### Missing Tenant ID

```json
{
  "statusCode": 403,
  "message": "Tenant ID is required. Please provide x-tenant-id header or ensure your JWT contains tenant_id.",
  "error": "Forbidden"
}
```

#### Invalid JWT Audience

```json
{
  "statusCode": 401,
  "message": "jwt audience invalid. expected: notification-client",
  "error": "Unauthorized"
}
```

## JWT Token Configuration

### Required JWT Claims

Your JWT token should include:

```json
{
  "sub": "user-id-123",
  "email": "user@example.com",
  "tenant_id": "1",
  "aud": "notification-client",
  "exp": 1704672000,
  "iat": 1704668400
}
```

### Keycloak Configuration

If using Keycloak, ensure:

1. **Client ID**: Set to `notification-client` (or update `aud` validation)
2. **Mapper for tenant_id**: Add a custom mapper to include `tenant_id` in the token
3. **Valid Audience**: Ensure the audience matches the expected value

#### Add Tenant ID Mapper in Keycloak

1. Go to your client in Keycloak
2. Navigate to **Client Scopes** → **Dedicated Scopes**
3. Add a **User Attribute** mapper:
   - Name: `tenant-id`
   - User Attribute: `tenant_id`
   - Token Claim Name: `tenant_id`
   - Claim JSON Type: `String`
   - Add to ID token: ON
   - Add to access token: ON
   - Add to userinfo: ON

## Benefits of the Fix

1. **Clear Error Messages**: Users now get specific error messages explaining what's missing
2. **Early Validation**: Errors are caught before database queries are attempted
3. **Multiple Tenant Sources**: System checks multiple sources for tenant ID
4. **Better Security**: Invalid requests are rejected with appropriate HTTP status codes
5. **Easier Debugging**: Error messages guide users on how to fix authentication issues

## Testing

### Test Authentication

```bash
# Test without authentication (should fail with 401)
curl -X GET "http://localhost:3000/api/v1/users/me/notifications"

# Test without tenant ID (should fail with 403)
curl -X GET "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test with valid authentication and tenant ID (should succeed)
curl -X GET "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: 1"
```

## Related Endpoints

All endpoints under `/api/v1/users/me/notifications` require:
- Valid JWT authentication
- Tenant identification

**Endpoints:**
- `GET /api/v1/users/me/notifications` - List notifications
- `GET /api/v1/users/me/notifications/unread-count` - Get unread count
- `GET /api/v1/users/me/notifications/:id` - Get single notification
- `PATCH /api/v1/users/me/notifications/:id/read` - Mark as read
- `PATCH /api/v1/users/me/notifications/:id/unread` - Mark as unread
- `DELETE /api/v1/users/me/notifications/:id` - Delete notification
- `DELETE /api/v1/users/me/notifications` - Bulk delete
- `POST /api/v1/users/me/notifications/mark-all-read` - Mark all as read

## Troubleshooting

### Issue: JWT Audience Invalid

**Solution:** Ensure your JWT token has the correct audience claim. Contact your authentication service administrator to configure the client audience.

### Issue: tenant_id Not in JWT

**Solution:** 
1. Add the `x-tenant-id` header to your requests
2. Or configure your authentication service to include `tenant_id` in the JWT payload

### Issue: Still Getting Empty Parameters

**Solution:** 
1. Verify your JWT token is valid using a JWT debugger (jwt.io)
2. Check that the token hasn't expired
3. Ensure the Authorization header is formatted correctly: `Bearer <token>`
4. Verify the tenant ID header is correctly formatted: `x-tenant-id: <number>`

## Build Status

✅ **Build Successful**  
✅ **All Validations Added**  
✅ **Error Handling Improved**  
✅ **Multiple Tenant Sources Supported**

No breaking changes - existing valid requests will continue to work.
