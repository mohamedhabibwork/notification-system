import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ServiceAuthGuard
  extends AuthGuard('keycloak-service')
  implements CanActivate
{
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const result = (await super.canActivate(context)) as boolean;

    if (!result) {
      throw new UnauthorizedException('Service authentication required');
    }

    return result;
  }

  handleRequest(err: any, service: any, info: any) {
    if (err || !service) {
      throw err || new UnauthorizedException('Invalid service token');
    }

    return service;
  }
}
