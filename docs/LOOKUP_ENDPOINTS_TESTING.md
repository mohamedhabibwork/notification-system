# Lookup and Lookup Types Endpoints Testing Guide

This document provides comprehensive testing examples for all lookup and lookup type endpoints.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

Most endpoints require Bearer token authentication. Get your token from Keycloak:

```bash
# Set your token
export TOKEN="your-bearer-token-here"
```

## Lookup Types Endpoints

### 1. List All Lookup Types

**Endpoint:** `GET /lookup-types`  
**Auth:** Public

```bash
curl -X GET http://localhost:3000/api/v1/lookup-types
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "typeName": "notification_status",
    "description": "Status values for notifications",
    "isSystem": true,
    "createdAt": "2026-01-08T00:00:00Z",
    "createdBy": "system"
  },
  {
    "id": 2,
    "uuid": "223e4567-e89b-12d3-a456-426614174001",
    "typeName": "notification_priority",
    "description": "Priority levels for notifications",
    "isSystem": true,
    "createdAt": "2026-01-08T00:00:00Z",
    "createdBy": "system"
  }
]
```

### 2. Get All Lookup Types with Values

**Endpoint:** `GET /lookup-types/all/with-values`  
**Auth:** Public

```bash
curl -X GET http://localhost:3000/api/v1/lookup-types/all/with-values
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "typeName": "notification_status",
    "description": "Status values for notifications",
    "isSystem": true,
    "createdAt": "2026-01-08T00:00:00Z",
    "createdBy": "system",
    "values": [
      {
        "id": 1,
        "code": "pending",
        "displayName": "Pending",
        "description": "Notification is pending",
        "sortOrder": 1,
        "isActive": true,
        "metadata": { "color": "yellow", "icon": "clock" }
      },
      {
        "id": 2,
        "code": "sent",
        "displayName": "Sent",
        "description": "Notification has been sent",
        "sortOrder": 2,
        "isActive": true,
        "metadata": { "color": "blue", "icon": "send" }
      }
    ]
  }
]
```

### 3. Get Lookup Type by ID

**Endpoint:** `GET /lookup-types/:id`  
**Auth:** Public

```bash
curl -X GET http://localhost:3000/api/v1/lookup-types/1
```

**Expected Response:**
```json
{
  "id": 1,
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "typeName": "notification_status",
  "description": "Status values for notifications",
  "isSystem": true,
  "createdAt": "2026-01-08T00:00:00Z",
  "createdBy": "system"
}
```

### 4. Get Lookup Type with Values by Type Name

**Endpoint:** `GET /lookup-types/:typeName/with-values`  
**Auth:** Public

```bash
curl -X GET http://localhost:3000/api/v1/lookup-types/notification_status/with-values
```

**Expected Response:**
```json
{
  "id": 1,
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "typeName": "notification_status",
  "description": "Status values for notifications",
  "isSystem": true,
  "createdAt": "2026-01-08T00:00:00Z",
  "createdBy": "system",
  "values": [
    {
      "id": 1,
      "code": "pending",
      "displayName": "Pending",
      "sortOrder": 1,
      "isActive": true
    }
  ]
}
```

### 5. Create Lookup Type

**Endpoint:** `POST /lookup-types`  
**Auth:** Required (Admin)

```bash
curl -X POST http://localhost:3000/api/v1/lookup-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "typeName": "order_status",
    "description": "Status values for orders",
    "isSystem": false
  }'
```

**Expected Response:**
```json
{
  "id": 10,
  "uuid": "323e4567-e89b-12d3-a456-426614174010",
  "typeName": "order_status",
  "description": "Status values for orders",
  "isSystem": false,
  "createdAt": "2026-01-08T12:00:00Z",
  "createdBy": "user-123"
}
```

### 6. Update Lookup Type

**Endpoint:** `PUT /lookup-types/:id`  
**Auth:** Required (Admin)

```bash
curl -X PUT http://localhost:3000/api/v1/lookup-types/10 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description for order status",
    "isSystem": false
  }'
```

**Expected Response:**
```json
{
  "id": 10,
  "uuid": "323e4567-e89b-12d3-a456-426614174010",
  "typeName": "order_status",
  "description": "Updated description for order status",
  "isSystem": false,
  "createdAt": "2026-01-08T12:00:00Z",
  "createdBy": "user-123"
}
```

### 7. Delete Lookup Type

**Endpoint:** `DELETE /lookup-types/:id`  
**Auth:** Required (Admin)

```bash
curl -X DELETE http://localhost:3000/api/v1/lookup-types/10 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "message": "Lookup type deleted successfully",
  "type": {
    "id": 10,
    "typeName": "order_status"
  }
}
```

## Lookup Endpoints

### 1. List All Lookups with Filters

**Endpoint:** `GET /lookups?lookupTypeId=1&isActive=true&search=pending&page=1&limit=20`  
**Auth:** Public

```bash
# List all lookups
curl -X GET http://localhost:3000/api/v1/lookups

# Filter by type ID
curl -X GET "http://localhost:3000/api/v1/lookups?lookupTypeId=1"

# Filter by active status
curl -X GET "http://localhost:3000/api/v1/lookups?isActive=true"

# Search by code or display name
curl -X GET "http://localhost:3000/api/v1/lookups?search=pending"

# Combined filters with pagination
curl -X GET "http://localhost:3000/api/v1/lookups?lookupTypeId=1&isActive=true&search=pend&page=1&limit=10"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": 1,
      "uuid": "123e4567-e89b-12d3-a456-426614174000",
      "lookupTypeId": 1,
      "code": "pending",
      "displayName": "Pending",
      "description": "Notification is pending",
      "sortOrder": 1,
      "isActive": true,
      "metadata": { "color": "yellow" },
      "createdAt": "2026-01-08T00:00:00Z",
      "createdBy": "system",
      "updatedAt": "2026-01-08T00:00:00Z",
      "updatedBy": "system"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### 2. Get Lookup by ID

**Endpoint:** `GET /lookups/by-id/:id`  
**Auth:** Public

```bash
curl -X GET http://localhost:3000/api/v1/lookups/by-id/1
```

**Expected Response:**
```json
{
  "id": 1,
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "lookupTypeId": 1,
  "code": "pending",
  "displayName": "Pending",
  "description": "Notification is pending",
  "sortOrder": 1,
  "isActive": true,
  "metadata": { "color": "yellow" }
}
```

### 3. Get Lookups by Type Name

**Endpoint:** `GET /lookups/:typeName`  
**Auth:** Public

```bash
curl -X GET http://localhost:3000/api/v1/lookups/notification_status
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "code": "pending",
    "displayName": "Pending",
    "sortOrder": 1
  },
  {
    "id": 2,
    "code": "sent",
    "displayName": "Sent",
    "sortOrder": 2
  }
]
```

### 4. Validate Lookup Code

**Endpoint:** `GET /lookups/:typeName/validate/:code`  
**Auth:** Public

```bash
# Validate existing code
curl -X GET http://localhost:3000/api/v1/lookups/notification_status/validate/pending

# Validate non-existing code
curl -X GET http://localhost:3000/api/v1/lookups/notification_status/validate/invalid_code
```

**Expected Response (exists):**
```json
{
  "exists": true,
  "lookup": {
    "id": 1,
    "code": "pending",
    "displayName": "Pending",
    "isActive": true
  }
}
```

**Expected Response (doesn't exist):**
```json
{
  "exists": false,
  "lookup": null
}
```

### 5. Create Lookup

**Endpoint:** `POST /lookups`  
**Auth:** Required (Admin)

```bash
curl -X POST http://localhost:3000/api/v1/lookups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lookupTypeId": 1,
    "code": "processing",
    "displayName": "Processing",
    "description": "Notification is being processed",
    "sortOrder": 2,
    "isActive": true,
    "metadata": {
      "color": "blue",
      "icon": "cog"
    }
  }'
```

**Expected Response:**
```json
{
  "id": 50,
  "uuid": "423e4567-e89b-12d3-a456-426614174050",
  "lookupTypeId": 1,
  "code": "processing",
  "displayName": "Processing",
  "description": "Notification is being processed",
  "sortOrder": 2,
  "isActive": true,
  "metadata": { "color": "blue", "icon": "cog" },
  "createdAt": "2026-01-08T12:30:00Z",
  "createdBy": "user-123",
  "updatedAt": "2026-01-08T12:30:00Z",
  "updatedBy": "user-123"
}
```

### 6. Bulk Create Lookups

**Endpoint:** `POST /lookups/bulk`  
**Auth:** Required (Admin)

```bash
curl -X POST http://localhost:3000/api/v1/lookups/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lookups": [
      {
        "lookupTypeId": 10,
        "code": "new",
        "displayName": "New Order",
        "sortOrder": 1,
        "isActive": true
      },
      {
        "lookupTypeId": 10,
        "code": "confirmed",
        "displayName": "Confirmed",
        "sortOrder": 2,
        "isActive": true
      },
      {
        "lookupTypeId": 10,
        "code": "shipped",
        "displayName": "Shipped",
        "sortOrder": 3,
        "isActive": true
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": 3,
  "failed": 0,
  "results": [
    {
      "id": 51,
      "code": "new",
      "displayName": "New Order"
    },
    {
      "id": 52,
      "code": "confirmed",
      "displayName": "Confirmed"
    },
    {
      "id": 53,
      "code": "shipped",
      "displayName": "Shipped"
    }
  ],
  "errors": []
}
```

### 7. Update Lookup

**Endpoint:** `PUT /lookups/:id`  
**Auth:** Required (Admin)

```bash
curl -X PUT http://localhost:3000/api/v1/lookups/50 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Processing Notification",
    "description": "Updated description",
    "sortOrder": 3,
    "metadata": {
      "color": "purple",
      "icon": "spinner"
    }
  }'
```

**Expected Response:**
```json
{
  "id": 50,
  "uuid": "423e4567-e89b-12d3-a456-426614174050",
  "lookupTypeId": 1,
  "code": "processing",
  "displayName": "Processing Notification",
  "description": "Updated description",
  "sortOrder": 3,
  "isActive": true,
  "metadata": { "color": "purple", "icon": "spinner" },
  "updatedAt": "2026-01-08T13:00:00Z",
  "updatedBy": "user-123"
}
```

### 8. Bulk Update Lookups

**Endpoint:** `PUT /lookups/bulk`  
**Auth:** Required (Admin)

```bash
curl -X PUT http://localhost:3000/api/v1/lookups/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lookups": [
      {
        "id": 51,
        "displayName": "New Order (Updated)",
        "sortOrder": 1
      },
      {
        "id": 52,
        "displayName": "Order Confirmed",
        "sortOrder": 2
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": 2,
  "failed": 0,
  "results": [
    {
      "id": 51,
      "code": "new",
      "displayName": "New Order (Updated)"
    },
    {
      "id": 52,
      "code": "confirmed",
      "displayName": "Order Confirmed"
    }
  ],
  "errors": []
}
```

### 9. Delete Lookup (Soft Delete)

**Endpoint:** `DELETE /lookups/:id`  
**Auth:** Required (Admin)

```bash
curl -X DELETE http://localhost:3000/api/v1/lookups/50 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "message": "Lookup deleted successfully",
  "lookup": {
    "id": 50,
    "code": "processing",
    "displayName": "Processing Notification",
    "isActive": false
  }
}
```

## Testing Workflow

### Complete End-to-End Test Scenario

```bash
# 1. List all existing lookup types
curl -X GET http://localhost:3000/api/v1/lookup-types

# 2. Get all types with their values
curl -X GET http://localhost:3000/api/v1/lookup-types/all/with-values

# 3. Create a new lookup type (requires auth)
curl -X POST http://localhost:3000/api/v1/lookup-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "typeName": "delivery_status",
    "description": "Delivery status values",
    "isSystem": false
  }'

# 4. Bulk create lookup values for the new type
curl -X POST http://localhost:3000/api/v1/lookups/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lookups": [
      {
        "lookupTypeId": 11,
        "code": "in_transit",
        "displayName": "In Transit",
        "sortOrder": 1,
        "isActive": true,
        "metadata": {"color": "blue"}
      },
      {
        "lookupTypeId": 11,
        "code": "delivered",
        "displayName": "Delivered",
        "sortOrder": 2,
        "isActive": true,
        "metadata": {"color": "green"}
      }
    ]
  }'

# 5. List lookups with filters
curl -X GET "http://localhost:3000/api/v1/lookups?lookupTypeId=11&isActive=true"

# 6. Validate a lookup code
curl -X GET http://localhost:3000/api/v1/lookups/delivery_status/validate/in_transit

# 7. Update a lookup
curl -X PUT http://localhost:3000/api/v1/lookups/54 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "In Transit - Updated",
    "metadata": {"color": "cyan", "icon": "truck"}
  }'

# 8. Soft delete a lookup
curl -X DELETE http://localhost:3000/api/v1/lookups/54 \
  -H "Authorization: Bearer $TOKEN"

# 9. Verify lookup is soft deleted
curl -X GET "http://localhost:3000/api/v1/lookups?lookupTypeId=11&isActive=false"

# 10. Get type with values to see final state
curl -X GET http://localhost:3000/api/v1/lookup-types/delivery_status/with-values
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["typeName must be a string", "typeName should not be empty"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Lookup type notification_invalid not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Lookup type with name notification_status already exists",
  "error": "Conflict"
}
```

## Swagger Documentation

All endpoints are documented in Swagger UI. Access it at:

```
http://localhost:3000/api
```

The Swagger UI provides:
- Interactive API testing
- Complete request/response schemas
- Authentication configuration
- Example values for all endpoints

## Notes

1. **Caching**: All lookup queries are cached for 1 hour to improve performance
2. **Soft Deletes**: Deleting a lookup sets `isActive` to `false` rather than removing the record
3. **Pagination**: List endpoints support pagination with default values (page=1, limit=20)
4. **Validation**: All endpoints have comprehensive validation using class-validator decorators
5. **Authorization**: Admin endpoints require valid Bearer token authentication
6. **Type Safety**: All responses are properly typed in the DTOs
