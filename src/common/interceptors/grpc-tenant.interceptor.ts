import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import {
  setTenantContext,
  setSessionRole,
} from '../../database/tenant-context';

/**
 * gRPC Tenant Context Interceptor
 * 
 * Extracts tenant information from gRPC metadata and sets PostgreSQL
 * session variables for Row-Level Security (RLS).
 */
@Injectable()
export class GrpcTenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GrpcTenantInterceptor.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const type = context.getType();

    if (type === 'rpc') {
      await this.handleGrpcContext(context);
    }

    return next.handle();
  }

  private async handleGrpcContext(context: ExecutionContext): Promise<void> {
    try {
      const metadata = context.getArgByIndex(1);
      
      if (!metadata) {
        return;
      }

      // Extract tenant ID from metadata
      const tenantIdMetadata = metadata.get('x-tenant-id');
      let tenantId: number | undefined;

      if (tenantIdMetadata && tenantIdMetadata.length > 0) {
        tenantId = parseInt(String(tenantIdMetadata[0]), 10);
      }

      // Check if service request
      const serviceTokenMetadata = metadata.get('x-service-token');
      const isServiceRequest =
        serviceTokenMetadata && serviceTokenMetadata.length > 0;

      if (tenantId && !isNaN(tenantId)) {
        this.logger.debug(`Setting tenant context for gRPC: ${tenantId}`);

        // Set PostgreSQL session variable for RLS
        await setTenantContext(this.db, tenantId);

        // Set database role
        if (isServiceRequest) {
          await setSessionRole(this.db, 'service_role');
        } else {
          await setSessionRole(this.db, 'authenticated');
        }

        // Store in gRPC data for controller access
        const data = context.switchToRpc().getData();
        data.tenantId = tenantId;
      } else if (isServiceRequest) {
        // Service requests without tenant = full access
        await setSessionRole(this.db, 'service_role');
      }
    } catch (error) {
      this.logger.error(
        `Failed to set gRPC tenant context: ${error.message}`,
        error.stack,
      );
    }
  }
}
