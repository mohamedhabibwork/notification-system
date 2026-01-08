import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

/**
 * Decorator to document the x-tenant-id header in Swagger
 * This header is used for multi-tenant operations
 */
export function ApiTenantHeader() {
  return applyDecorators(
    ApiHeader({
      name: 'x-tenant-id',
      description: 'Tenant identifier for multi-tenant operations',
      required: false,
      schema: { type: 'integer', example: 1 },
    }),
  );
}
