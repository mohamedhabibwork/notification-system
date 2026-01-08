# Validation Error Format Update

## Overview

Updated the validation error response format across all API interfaces (REST, GraphQL, gRPC) to provide a consistent, field-grouped error structure with dot notation for nested objects.

## New Error Format

### REST API Response

```json
{
  "statusCode": 400,
  "timestamp": "2026-01-08T10:30:00.000Z",
  "path": "/api/v1/notifications",
  "method": "POST",
  "message": "Validation failed for 2 fields",
  "error": "Bad Request",
  "errors": {
    "name": ["name must be a string", "name should not be empty"],
    "recipient.email": ["recipient.email must be an email address"],
    "priority": ["priority must be a valid enum value"]
  }
}
```

### GraphQL Response

GraphQL validation errors are included in the `extensions.validationErrors` field:

```json
{
  "errors": [
    {
      "message": "Validation failed for 2 fields",
      "code": "BAD_REQUEST",
      "path": ["mutation", "createNotification"],
      "extensions": {
        "validationErrors": {
          "name": ["name must be a string"],
          "recipient.email": ["recipient.email must be an email address"]
        }
      }
    }
  ]
}
```

### gRPC Response

gRPC validation errors are included in the error details as JSON:

```
code: INVALID_ARGUMENT
message: "Validation failed for 2 fields"
details: "{\"name\":[\"name must be a string\"],\"recipient.email\":[\"must be an email\"]}"
```

## Implementation Details

### 1. Files Created

#### `src/common/utils/validation-error.util.ts`
- **`flattenValidationErrors()`**: Transforms class-validator ValidationError[] to field-grouped format
- **`formatValidationErrors()`**: Helper function for consistent API responses
- Supports nested objects with dot notation (e.g., `recipient.email`, `system.theme`)
- Recursive handling for deeply nested objects

#### `src/common/dto/error-response.dto.ts`
- **`ErrorResponseDto`**: Base error response structure
- **`ValidationErrorResponseDto`**: Validation-specific response with errors field
- **`UnauthorizedErrorResponseDto`**: 401 error response
- **`ForbiddenErrorResponseDto`**: 403 error response
- **`NotFoundErrorResponseDto`**: 404 error response
- **`InternalServerErrorResponseDto`**: 500 error response
- All DTOs include Swagger/OpenAPI annotations for documentation

#### `src/common/filters/grpc-exception.filter.ts`
- **`GrpcExceptionFilter`**: Transforms validation errors to gRPC format
- Maps HTTP status codes to gRPC status codes
- Includes validation errors in gRPC error details

### 2. Files Modified

#### `src/main.ts`
- Added custom `exceptionFactory` to ValidationPipe configuration
- Imports validation utility and BadRequestException
- Added ValidationError from class-validator
- Added error response schemas to Swagger document components
- Integrated GrpcExceptionFilter for gRPC microservice
- Fixed all TypeScript and ESLint errors

#### `src/common/filters/http-exception.filter.ts`
- Updated to preserve `errors` field in exception responses
- Maintains backward compatibility for non-validation errors
- Properly typed error response object

#### `src/graphql/graphql.module.ts`
- Enhanced `formatError` function to include validation errors
- Validation errors included in `extensions.validationErrors`
- Maintains existing error format structure

## Key Features

### 1. Field Grouping
Errors are grouped by field name, making it easy for clients to display errors next to the relevant form fields.

### 2. Dot Notation for Nested Objects
Nested object validation uses dot notation:
- `recipient.email` for nested properties
- `system.theme` for deeply nested settings
- `items.0.name` for array elements (if applicable)

### 3. Multiple Errors Per Field
Each field can have multiple validation error messages in an array:
```json
{
  "name": [
    "name must be a string",
    "name should not be empty",
    "name must be longer than 3 characters"
  ]
}
```

### 4. Cross-Protocol Support
- **REST API**: Full error details in response body
- **GraphQL**: Validation errors in extensions
- **gRPC**: Errors serialized in details metadata

### 5. Swagger Documentation
- Error response schemas added to Swagger components
- `ValidationErrorResponse` schema with examples
- Generic `ErrorResponse` schema for other errors
- Can be referenced in controller `@ApiResponse` decorators

## Usage Examples

### In Controllers

Controllers automatically benefit from the new validation error format. To document validation errors in Swagger:

```typescript
@Post()
@ApiResponse({ 
  status: 201, 
  description: 'Notification created successfully',
  type: NotificationResponseDto 
})
@ApiResponse({ 
  status: 400, 
  description: 'Validation error',
  schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
})
async create(@Body() dto: CreateNotificationDto) {
  return this.service.create(dto);
}
```

### Client-Side Handling

```typescript
// TypeScript client example
interface ValidationErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error: string;
  errors: Record<string, string[]>;
}

try {
  await api.createNotification(data);
} catch (error) {
  if (error.statusCode === 400 && error.errors) {
    // Display field-specific errors
    Object.entries(error.errors).forEach(([field, messages]) => {
      console.log(`Field: ${field}`);
      messages.forEach(msg => console.log(`  - ${msg}`));
    });
  }
}
```

### React Form Integration

```typescript
const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

const handleSubmit = async (data) => {
  try {
    await api.createNotification(data);
    setFieldErrors({});
  } catch (error) {
    if (error.errors) {
      setFieldErrors(error.errors);
    }
  }
};

// In form fields:
{fieldErrors['recipient.email']?.map(msg => (
  <div className="error">{msg}</div>
))}
```

## Testing

To test the new validation error format:

### 1. REST API Test
```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "invalid",
    "channel": "invalid_channel"
  }'
```

Expected response:
```json
{
  "statusCode": 400,
  "timestamp": "2026-01-08T10:30:00.000Z",
  "path": "/api/v1/notifications",
  "method": "POST",
  "message": "Validation failed for 2 fields",
  "error": "Bad Request",
  "errors": {
    "tenantId": ["tenantId must be a number"],
    "channel": ["channel must be a valid enum value"]
  }
}
```

### 2. Nested Object Validation Test
```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "channel": "email",
    "recipient": {
      "email": "invalid-email"
    }
  }'
```

Expected response includes:
```json
{
  "errors": {
    "recipient.email": ["recipient.email must be an email address"]
  }
}
```

### 3. Multiple Errors on Same Field
Test with a DTO that has multiple validators:
```bash
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": ""
  }'
```

Expected response:
```json
{
  "errors": {
    "name": [
      "name should not be empty",
      "name must be a string"
    ]
  }
}
```

## Migration Guide

### For API Consumers

The new format is backward compatible at the HTTP level (still returns 400 status), but the response body structure has changed:

**Before:**
```json
{
  "statusCode": 400,
  "message": ["name must be a string", "email must be an email"],
  "error": "Bad Request"
}
```

**After:**
```json
{
  "statusCode": 400,
  "message": "Validation failed for 2 fields",
  "error": "Bad Request",
  "errors": {
    "name": ["name must be a string"],
    "email": ["email must be an email"]
  }
}
```

**Action Required:**
- Update client-side error handling to read from `errors` object
- Update form field error display logic to use field-specific errors
- Update error message displays to show the structured errors

### For Internal Services

No changes required. The ValidationPipe configuration is global and applies automatically to all endpoints using DTO validation.

## Benefits

1. **Better UX**: Field-specific errors make it easy to show errors next to form fields
2. **Type Safety**: Structured errors are easier to type and consume
3. **Consistency**: Same format across REST, GraphQL, and gRPC
4. **Documentation**: Swagger schemas document the error format
5. **Flexibility**: Multiple errors per field supported
6. **Nested Support**: Dot notation handles complex object validation

## Notes

- Error messages come directly from class-validator decorators
- Nested validation works with `@ValidateNested()` and `@Type()` decorators
- Array element validation uses index in path (e.g., `items.0.name`)
- The `message` field provides a summary count of validation failures
- All linter errors have been resolved with proper type safety
