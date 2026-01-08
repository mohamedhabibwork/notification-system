import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Try to get tenant_id from user context
    if (user?.tenant_id) {
      return parseInt(user.tenant_id, 10);
    }

    // Try to get from request headers
    const tenantHeader = request.headers['x-tenant-id'];
    if (tenantHeader) {
      return parseInt(tenantHeader, 10);
    }

    return undefined;
  },
);
