import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CustomRateLimitGuard extends ThrottlerGuard {
  constructor(
    protected readonly options: any,
    protected readonly storageService: any,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use tenant ID if available for tenant-specific rate limiting
    const tenantId =
      req.tenantId || req.user?.tenant_id || req.headers['x-tenant-id'];
    if (tenantId) {
      return `tenant:${tenantId}:${req.ip}`;
    }

    // Use user ID for authenticated requests
    const userId = req.user?.sub;
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    return req.ip || 'unknown';
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}
