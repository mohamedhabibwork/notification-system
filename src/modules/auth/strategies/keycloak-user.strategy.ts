import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { UserContext } from '../decorators/current-user.decorator';

@Injectable()
export class KeycloakUserStrategy extends PassportStrategy(
  Strategy,
  'keycloak-user',
) {
  private readonly logger = new Logger(KeycloakUserStrategy.name);
  private jwksClientInstance: jwksClient.JwksClient;
  private readonly serverUrl: string;
  private readonly realm: string;
  private readonly clientId: string;

  constructor(private configService: ConfigService) {
    const serverUrl = configService.get<string>('keycloak.serverUrl');
    const realm = configService.get<string>('keycloak.realm');
    const clientId = configService.get<string>('keycloak.userClientId');

    if (!serverUrl) {
      throw new Error(
        'Keycloak server URL is required. Set keycloak.serverUrl in configuration.',
      );
    }
    if (!realm) {
      throw new Error(
        'Keycloak realm is required. Set keycloak.realm in configuration.',
      );
    }
    if (!clientId) {
      throw new Error(
        'Keycloak user client ID is required. Set keycloak.userClientId in configuration.',
      );
    }

    const jwksUri = `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'jwks-handled',
      issuer: `${serverUrl}/realms/${realm}`,
      audience: clientId,
      algorithms: ['RS256'],
    });

    this.serverUrl = serverUrl;
    this.realm = realm;
    this.clientId = clientId;

    this.jwksClientInstance = jwksClient({
      jwksUri,
      requestHeaders: {},
      timeout: 30000,
      cache: true,
      cacheMaxAge: 86400000,
    });

    this.logger.log(`Keycloak User Strategy initialized for realm: ${realm}`);
  }

  async validate(payload: any): Promise<UserContext> {
    this.logger.debug(`Validating user token for subject: ${payload.sub}`);

    // Extract user context from JWT payload
    const userContext: UserContext = {
      sub: payload.sub,
      email: payload.email,
      preferred_username: payload.preferred_username,
      realm_access: payload.realm_access,
      resource_access: payload.resource_access,
      tenant_id: payload.tenant_id,
      user_type: payload.user_type,
      aud: payload.aud,
      exp: payload.exp,
      iat: payload.iat,
    };

    return userContext;
  }

  // Override authenticate to manually verify with JWKS
  async authenticate(req: any, options?: any): Promise<any> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!token) {
      return this.fail(new UnauthorizedException('No token provided'), 401);
    }

    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        return this.fail(new UnauthorizedException('Invalid token'), 401);
      }

      const key = await this.jwksClientInstance.getSigningKey(
        decoded.header.kid,
      );
      const publicKey = key.getPublicKey();

      const verified = jwt.verify(token, publicKey, {
        issuer: `${this.serverUrl}/realms/${this.realm}`,
        audience: this.clientId,
        algorithms: ['RS256'],
      }) as any;

      const user = await this.validate(verified);
      this.success(user);
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      return this.fail(new UnauthorizedException('Invalid token'), 401);
    }
  }
}
