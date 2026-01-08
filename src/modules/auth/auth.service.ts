import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { TokenRefreshResponseDto } from './dto/token-refresh.dto';
import { TokenValidationResponseDto } from './dto/token-validation.dto';
import {
  AuthInfoResponseDto,
  UserAuthInfoDto,
  ServiceAuthInfoDto,
} from './dto/auth-info.dto';
import { UserContext } from './decorators/current-user.decorator';
import { ServiceContext } from './decorators/current-service.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly serverUrl: string;
  private readonly realm: string;
  private readonly userClientId: string;
  private readonly serviceClientId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serverUrl = this.configService.get<string>('keycloak.serverUrl') || '';
    this.realm = this.configService.get<string>('keycloak.realm') || '';
    this.userClientId =
      this.configService.get<string>('keycloak.userClientId') || '';
    this.serviceClientId =
      this.configService.get<string>('keycloak.serviceClientId') || '';

    if (!this.serverUrl || !this.realm) {
      this.logger.warn(
        'Keycloak configuration incomplete. Some auth features may not work.',
      );
    }
  }

  /**
   * Get Keycloak token endpoint URL
   */
  getKeycloakTokenEndpoint(): string {
    return `${this.serverUrl}/realms/${this.realm}/protocol/openid-connect/token`;
  }

  /**
   * Get Keycloak authorization endpoint URL
   */
  getKeycloakAuthEndpoint(): string {
    return `${this.serverUrl}/realms/${this.realm}/protocol/openid-connect/auth`;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResponseDto> {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const tokenUrl = this.getKeycloakTokenEndpoint();

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          tokenUrl,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: this.userClientId,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || refreshToken,
        token_type: response.data.token_type || 'Bearer',
        expires_in: response.data.expires_in,
        refresh_expires_in: response.data.refresh_expires_in,
        scope: response.data.scope,
      };
    } catch (error: any) {
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);

      if (error.response?.status === 400) {
        throw new BadRequestException(
          error.response?.data?.error_description || 'Invalid refresh token',
        );
      }

      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  /**
   * Validate a token without consuming it
   */
  async validateToken(token: string): Promise<TokenValidationResponseDto> {
    if (!token) {
      return {
        valid: false,
        error: 'Token is required',
      };
    }

    try {
      // Decode token without verification first to get basic info
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded || typeof decoded === 'string') {
        return {
          valid: false,
          error: 'Invalid token format',
        };
      }

      const payload = decoded.payload as any;
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp || 0;
      const expired = exp > 0 && exp < now;

      // Determine token type
      let tokenType: 'user' | 'service' | undefined;
      if (payload.azp || payload.clientId) {
        tokenType = 'service';
      } else if (payload.sub && !payload.azp) {
        tokenType = 'user';
      }

      const expiresIn = exp > 0 ? Math.max(0, exp - now) : undefined;

      return {
        valid: !expired,
        expired,
        payload: {
          sub: payload.sub,
          email: payload.email,
          preferred_username: payload.preferred_username,
          clientId: payload.clientId || payload.azp,
          azp: payload.azp,
          scope: payload.scope,
          tenant_id: payload.tenant_id,
          user_type: payload.user_type,
          realm_access: payload.realm_access,
          resource_access: payload.resource_access,
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat,
          iss: payload.iss,
        },
        expiresAt: exp > 0 ? exp : undefined,
        expiresIn,
        tokenType,
      };
    } catch (error: any) {
      this.logger.error(`Token validation failed: ${error.message}`);
      return {
        valid: false,
        error: error.message || 'Token validation failed',
      };
    }
  }

  /**
   * Extract auth info from user or service context
   */
  getAuthInfo(user: UserContext | ServiceContext): AuthInfoResponseDto {
    const now = Math.floor(Date.now() / 1000);

    if ('sub' in user) {
      // User context
      const userContext = user;
      const exp = userContext.exp || 0;
      const expiresIn = exp > 0 ? Math.max(0, exp - now) : 0;

      // Extract roles
      const realmRoles = userContext.realm_access?.roles || [];
      const resourceRoles: Record<string, string[]> = {};

      if (userContext.resource_access) {
        Object.keys(userContext.resource_access).forEach((resource) => {
          const resourceAccess = userContext.resource_access?.[resource];
          resourceRoles[resource] = resourceAccess?.roles || [];
        });
      }

      const userInfo: UserAuthInfoDto = {
        sub: userContext.sub,
        email: userContext.email,
        preferred_username: userContext.preferred_username,
        tenant_id: userContext.tenant_id,
        user_type: userContext.user_type,
        realm_roles: realmRoles,
        resource_roles: resourceRoles,
        exp: userContext.exp || 0,
        iat: userContext.iat || 0,
      };

      return {
        type: 'user',
        user: userInfo,
        expiresAt: exp,
        expiresIn,
      };
    } else {
      // Service context
      const serviceContext = user;
      const exp = serviceContext.exp || 0;
      const expiresIn = exp > 0 ? Math.max(0, exp - now) : 0;

      const resourceRoles: Record<string, string[]> = {};

      if (serviceContext.resource_access) {
        Object.keys(serviceContext.resource_access).forEach((resource) => {
          const resourceAccess = serviceContext.resource_access?.[resource];
          resourceRoles[resource] = resourceAccess?.roles || [];
        });
      }

      const serviceInfo: ServiceAuthInfoDto = {
        clientId: serviceContext.clientId,
        serviceName: serviceContext.serviceName,
        azp: serviceContext.azp,
        scope: serviceContext.scope,
        resource_roles: resourceRoles,
        exp: serviceContext.exp || 0,
        iat: serviceContext.iat || 0,
      };

      return {
        type: 'service',
        service: serviceInfo,
        expiresAt: exp,
        expiresIn,
      };
    }
  }
}
