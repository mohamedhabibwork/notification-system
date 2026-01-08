import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base error response structure for all error responses
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp when the error occurred',
    example: '2026-01-08T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path that caused the error',
    example: '/api/v1/notifications',
  })
  path: string;

  @ApiProperty({
    description: 'HTTP method used',
    example: 'POST',
  })
  method: string;

  @ApiProperty({
    description: 'Error message',
    example: 'Bad Request',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Bad Request',
  })
  error: string;
}

/**
 * Validation error response structure with field-grouped errors
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description:
      'Validation errors grouped by field name with arrays of error messages',
    example: {
      name: ['name must be a string', 'name should not be empty'],
      'recipient.email': ['recipient.email must be an email address'],
      priority: ['priority must be a valid enum value'],
    },
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  })
  errors: Record<string, string[]>;
}

/**
 * Unauthorized error response
 */
export class UnauthorizedErrorResponseDto extends ErrorResponseDto {}

/**
 * Forbidden error response
 */
export class ForbiddenErrorResponseDto extends ErrorResponseDto {}

/**
 * Not found error response
 */
export class NotFoundErrorResponseDto extends ErrorResponseDto {}

/**
 * Internal server error response
 */
export class InternalServerErrorResponseDto extends ErrorResponseDto {
  @ApiPropertyOptional({
    description: 'Stack trace (only in development)',
    example: 'Error: Something went wrong\n    at ...',
  })
  stack?: string;
}
