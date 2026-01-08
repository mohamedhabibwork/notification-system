import { Injectable, NestMiddleware, Logger, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import {
  setTenantContext,
  setSessionRole,
} from '../../database/tenant-context';

/**
 * Tenant Context Middleware (HTTP/REST only)
 *
 * Extracts tenant information from JWT or headers and sets the PostgreSQL
 * session variable for Row-Level Security (RLS) policies.
 *
 * The middleware:
 * 1. Extracts tenant_id from JWT claims or x-tenant-id header
 * 2. Sets the PostgreSQL session variable app.current_tenant_id
 * 3. Sets the database role (authenticated for users, service_role for internal)
 * 4. Stores tenant context in request for application use
 *
 * Note: This middleware is for HTTP/REST requests only.
 * - gRPC requests: Use GrpcTenantInterceptor
 * - GraphQL requests: Use GraphQL context
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip for non-HTTP requests (this middleware is HTTP-specific)
    if (!req || !res || !next) {
      return;
    }
    let tenantId: number | undefined;
    let isServiceRequest = false;

    // Check if this is a service-to-service request (internal)
    const serviceToken = req.headers['x-service-token'];
    if (serviceToken) {
      isServiceRequest = true;
      this.logger.debug('Service request detected, using service_role');
    }

    // Try to get tenant_id from user context (JWT)
    const user = req['user'] as any;
    if (user?.tenant_id) {
      tenantId = parseInt(user.tenant_id, 10);
    }

    // Try to get from headers
    if (!tenantId && req.headers['x-tenant-id']) {
      tenantId = parseInt(req.headers['x-tenant-id'] as string, 10);
    }

    // Store tenant context in request for application use
    // Don't set database session variables in middleware - causes connection pool issues
    if (tenantId) {
      (req as any).tenantId = tenantId;
      this.logger.debug(`Tenant context stored in request: ${tenantId}`);
    }

    // Note: Database-level tenant context (RLS) is managed per-transaction
    // using the withTenantContext() helper function in services
    // This avoids connection pool contamination issues

    next();
  }
}
