# User Notifications - Role-Based Access Control

**Date:** January 8, 2026  
**Status:** ✅ Implemented

## Overview

User notifications endpoints now support role-based access control (RBAC). Admin users can view and manage all notifications across the tenant, while regular users can only access their own notifications.

## Role Hierarchy

- **Admin Roles**: `admin`, `system-admin`
- **Regular Users**: All other users

## Features

### Regular Users
- ✅ Can only see their own notifications
- ✅ Can mark their own notifications as read/unread
- ✅ Can delete their own notifications
- ✅ Get count of their unread notifications
- ✅ Mark all their notifications as read
- ❌ Cannot access other users' notifications

### Admin Users
- ✅ Can see all notifications in the tenant
- ✅ Can filter notifications by `userId` or `userType`
- ✅ Can mark any notification as read/unread
- ✅ Can delete any notification
- ✅ Get count of unread notifications (all or filtered)
- ✅ Mark all notifications as read (all or filtered)

## API Changes

### Query Parameters for Admins

All `GET` endpoints now accept optional filter parameters:

- `userId` - Filter by specific user ID
- `userType` - Filter by user type (e.g., "admin", "customer", "vendor")

### Updated Endpoints

#### 1. GET /api/v1/users/me/notifications

**Regular User:**
```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "x-tenant-id: 1"
```
Returns only the authenticated user's notifications.

**Admin - View All:**
```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```
Returns all notifications in the tenant.

**Admin - Filter by User:**
```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications?userId=user-123" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```
Returns notifications for specific user.

**Admin - Filter by User Type:**
```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications?userType=customer" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```
Returns notifications for all users of specified type.

**Admin - Combined Filters:**
```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications?userType=customer&status=unread&channel=email" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```

#### 2. GET /api/v1/users/me/notifications/:id

**Regular User:**
- Can only view their own notification
- Returns 404 if notification belongs to another user

**Admin:**
- Can view any notification in the tenant

```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications/123" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```

#### 3. GET /api/v1/users/me/notifications/unread-count

**Regular User:**
```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications/unread-count" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "x-tenant-id: 1"
```
Returns unread count for authenticated user only.

**Admin - All Users:**
```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications/unread-count" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```
Returns total unread count for all users.

**Admin - Specific User:**
```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications/unread-count?userId=user-123" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```

**Admin - By User Type:**
```bash
curl -X GET "http://localhost:3000/api/v1/users/me/notifications/unread-count?userType=customer" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```

#### 4. PATCH /api/v1/users/me/notifications/:id/read

**Regular User:**
- Can only mark their own notifications as read

**Admin:**
- Can mark any notification as read

```bash
curl -X PATCH "http://localhost:3000/api/v1/users/me/notifications/123/read" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```

#### 5. PATCH /api/v1/users/me/notifications/:id/unread

**Regular User:**
- Can only mark their own notifications as unread

**Admin:**
- Can mark any notification as unread

```bash
curl -X PATCH "http://localhost:3000/api/v1/users/me/notifications/123/unread" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```

#### 6. POST /api/v1/users/me/notifications/mark-all-read

**Regular User:**
```bash
curl -X POST "http://localhost:3000/api/v1/users/me/notifications/mark-all-read" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "x-tenant-id: 1"
```
Marks only the user's own notifications as read.

**Admin - All Users:**
```bash
curl -X POST "http://localhost:3000/api/v1/users/me/notifications/mark-all-read" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```
Marks all notifications in tenant as read.

**Admin - Specific User:**
```bash
curl -X POST "http://localhost:3000/api/v1/users/me/notifications/mark-all-read?userId=user-123" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```

**Admin - By User Type:**
```bash
curl -X POST "http://localhost:3000/api/v1/users/me/notifications/mark-all-read?userType=customer" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```

#### 7. DELETE /api/v1/users/me/notifications/:id

**Regular User:**
- Can only delete their own notifications

**Admin:**
- Can delete any notification

```bash
curl -X DELETE "http://localhost:3000/api/v1/users/me/notifications/123" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1"
```

#### 8. DELETE /api/v1/users/me/notifications (Bulk Delete)

**Regular User:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "x-tenant-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationIds": ["1", "2", "3"]
  }'
```
Deletes only the user's own notifications.

**Admin - Delete by User:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "olderThan": "2026-01-01T00:00:00Z"
  }'
```

**Admin - Delete by User Type:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "x-tenant-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "customer",
    "status": "delivered",
    "olderThan": "2025-12-01T00:00:00Z"
  }'
```

## JWT Token Requirements

### User Token Example
```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "tenant_id": "1",
  "realm_access": {
    "roles": ["user"]
  },
  "aud": "notification-client"
}
```

### Admin Token Example
```json
{
  "sub": "admin-456",
  "email": "admin@example.com",
  "tenant_id": "1",
  "realm_access": {
    "roles": ["admin"]
  },
  "aud": "notification-client"
}
```

## Security Considerations

### Data Isolation

1. **Tenant Isolation**: All queries are scoped to the tenant from the JWT or header
2. **User Isolation**: Non-admin users can only access their own data
3. **Role Verification**: Roles are extracted from JWT claims on every request

### Role Extraction

Roles are extracted from multiple sources in the JWT:
- `realm_access.roles[]` - Realm-level roles
- `resource_access[client].roles[]` - Client-specific roles

Admin check:
```typescript
const isAdmin = roles.includes('admin') || roles.includes('system-admin');
```

### Error Responses

#### Non-Admin Accessing Without Authentication
```json
{
  "statusCode": 403,
  "message": "User ID is required. Please ensure you are authenticated.",
  "error": "Forbidden"
}
```

#### Non-Admin Trying to Access Another User's Notification
```json
{
  "statusCode": 404,
  "message": "Notification with ID 123 not found",
  "error": "Not Found"
}
```

## Implementation Details

### Service Layer

All service methods now accept `userRoles` parameter:
```typescript
async findUserNotifications(
  userId: string | undefined,
  tenantId: number,
  query: UserNotificationQueryDto,
  userRoles: string[] = [],
)
```

### Controller Layer

Roles are extracted in controllers before calling service:
```typescript
const roles = [
  ...(user?.realm_access?.roles || []),
  ...(Object.values(user?.resource_access || {})
    .flatMap((resource: any) => resource.roles || [])),
];
```

### Database Queries

**Admin Query (No User Filter):**
```sql
SELECT * FROM notifications 
WHERE tenant_id = $1 
AND deleted_at IS NULL
ORDER BY created_at DESC;
```

**Admin Query (With userId Filter):**
```sql
SELECT * FROM notifications 
WHERE tenant_id = $1 
AND recipient_user_id = $2
AND deleted_at IS NULL
ORDER BY created_at DESC;
```

**Regular User Query:**
```sql
SELECT * FROM notifications 
WHERE tenant_id = $1 
AND recipient_user_id = $2
AND deleted_at IS NULL
ORDER BY created_at DESC;
```

## Testing

### Test as Regular User

```bash
# Set user token
export USER_TOKEN="your-user-jwt-token"
export TENANT_ID="1"

# List my notifications
curl -X GET "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "x-tenant-id: $TENANT_ID"

# Try to access another user's notification (should fail)
curl -X GET "http://localhost:3000/api/v1/users/me/notifications/999" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "x-tenant-id: $TENANT_ID"
```

### Test as Admin

```bash
# Set admin token
export ADMIN_TOKEN="your-admin-jwt-token"
export TENANT_ID="1"

# List all notifications
curl -X GET "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID"

# List notifications for specific user
curl -X GET "http://localhost:3000/api/v1/users/me/notifications?userId=user-123" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID"

# List notifications for user type
curl -X GET "http://localhost:3000/api/v1/users/me/notifications?userType=customer" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID"

# Mark all customer notifications as read
curl -X POST "http://localhost:3000/api/v1/users/me/notifications/mark-all-read?userType=customer" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID"
```

## Benefits

1. **Security**: Users cannot access other users' notifications
2. **Admin Flexibility**: Admins can manage notifications across all users
3. **Operational Efficiency**: Admins can perform bulk operations filtered by user type
4. **Audit Capability**: Admins can view notification status for any user
5. **Backward Compatible**: Existing user endpoints continue to work

## Files Modified

- ✅ `src/modules/user-notifications/dto/user-notification-query.dto.ts` - Added userId/userType filters
- ✅ `src/modules/user-notifications/user-notifications.service.ts` - Role-based logic
- ✅ `src/modules/user-notifications/user-notifications.controller.ts` - Role extraction
- ✅ Build successful - No errors

## Migration Notes

No database changes required. This is a pure application-level RBAC implementation.

Existing API calls will continue to work:
- Regular users see their own data (no change)
- Admins now have additional filtering capabilities
