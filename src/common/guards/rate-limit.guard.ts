import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  tenantId?: number;
  user?: {
    sub: string;
    tenant_id?: number;
    [key: string]: any;
  };
}

@Injectable()
export class CustomRateLimitGuard extends ThrottlerGuard {
  constructor(
    protected readonly options: any,
    protected readonly storageService: any,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Request): Promise<string> {
    const authReq = req as AuthenticatedRequest;

    // Use tenant ID if available for tenant-specific rate limiting
    const tenantId =
      authReq.tenantId ||
      authReq.user?.tenant_id ||
      authReq.headers['x-tenant-id'];

    if (tenantId) {
      return `tenant:${tenantId}:${authReq.ip || 'unknown-ip'}`;
    }

    // Use user ID for authenticated requests
    const userId = authReq.user?.sub;
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    return authReq.ip || 'unknown';
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}
