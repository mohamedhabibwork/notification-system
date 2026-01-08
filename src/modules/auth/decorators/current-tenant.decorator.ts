import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

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

    return undefined;
  },
);
