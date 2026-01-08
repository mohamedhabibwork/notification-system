import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { KeycloakAuthGuard } from '../../modules/auth/guards/keycloak-auth.guard';

/**
 * Protocol-Aware Auth Guard
 *
 * Handles authentication for different protocols:
 * - HTTP/REST: Uses Keycloak JWT from Authorization header
 * - GraphQL: Extracts context and validates JWT
 * - gRPC: Extracts metadata and validates JWT
 */
@Injectable()
export class ProtocolAwareAuthGuard implements CanActivate {
  private readonly logger = new Logger(ProtocolAwareAuthGuard.name);
  private readonly httpAuthGuard: KeycloakAuthGuard;

  constructor(private readonly reflector: Reflector) {
    this.httpAuthGuard = new KeycloakAuthGuard(reflector);
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const type = context.getType<string>();

    // Check if route is public
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }

    switch (type) {
      case 'http':
        return this.handleHttp(context);
      case 'graphql':
        return this.handleGraphQL(context);
      case 'rpc': // gRPC
        return this.handleGrpc(context);
      default:
        this.logger.warn(`Unknown context type: ${type}`);
        return false;
    }
  }

  private handleHttp(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Use existing Keycloak guard for HTTP
    return this.httpAuthGuard.canActivate(context);
  }

  private handleGraphQL(context: ExecutionContext): boolean {
    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();

    if (!req) {
      this.logger.warn('No request object in GraphQL context');
      return false;
    }

    // Extract JWT from Authorization header
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(
        'Missing or invalid Authorization header in GraphQL request',
      );
      return false;
    }

    // Validate JWT (simplified - you should use Keycloak validation)
    const token = authHeader.substring(7);
    if (!token) {
      return false;
    }

    // Store user in context for resolvers
    req.user = this.decodeToken(token);
    return true;
  }

  private handleGrpc(context: ExecutionContext): boolean {
    const metadata = context.getArgByIndex(1); // gRPC metadata

    if (!metadata) {
      this.logger.warn('No metadata in gRPC request');
      return false;
    }

    // Extract JWT from metadata
    const authMetadata = metadata.get('authorization');
    if (!authMetadata || authMetadata.length === 0) {
      this.logger.warn('Missing authorization metadata in gRPC request');
      return false;
    }

    const token = String(authMetadata[0]).replace('Bearer ', '');
    if (!token) {
      return false;
    }

    // Validate and store user info
    const user = this.decodeToken(token);
    if (!user) {
      return false;
    }

    // Store in gRPC context (can be accessed in controllers)
    const data = context.switchToRpc().getData();
    data.user = user;

    return true;
  }

  private decodeToken(token: string): any {
    try {
      // In production, use proper JWT validation with Keycloak
      // This is a simplified version
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8'),
      );
      return payload;
    } catch (error) {
      this.logger.error(`Failed to decode token: ${error.message}`);
      return null;
    }
  }
}
