import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { ServiceContext } from '../decorators/current-service.decorator';

@Injectable()
export class KeycloakServiceStrategy extends PassportStrategy(
  Strategy,
  'keycloak-service',
) {
  private readonly logger = new Logger(KeycloakServiceStrategy.name);
  private jwksClientInstance: jwksClient.JwksClient;
  private readonly serverUrl: string;
  private readonly realm: string;

  constructor(private configService: ConfigService) {
    const serverUrl = configService.get<string>('keycloak.serverUrl');
    const realm = configService.get<string>('keycloak.realm');

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

    const jwksUri = `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'jwks-handled',
      issuer: `${serverUrl}/realms/${realm}`,
      algorithms: ['RS256'],
    });

    this.serverUrl = serverUrl;
    this.realm = realm;

    this.jwksClientInstance = jwksClient({
      jwksUri,
      requestHeaders: {},
      timeout: 30000,
      cache: true,
      cacheMaxAge: 86400000,
    });

    this.logger.log(
      `Keycloak Service Strategy initialized for realm: ${realm}`,
    );
  }

  async validate(payload: any): Promise<ServiceContext> {
    this.logger.debug(
      `Validating service token for client: ${payload.azp || payload.clientId}`,
    );

    // Validate that this is a service account (client credentials grant)
    if (!payload.azp && !payload.clientId) {
      throw new UnauthorizedException('Invalid service token');
    }

    // Extract service context from JWT payload
    const serviceContext: ServiceContext = {
      clientId: payload.clientId || payload.azp,
      serviceName: payload.azp || payload.clientId,
      azp: payload.azp,
      scope: payload.scope,
      resource_access: payload.resource_access,
      aud: payload.aud,
      exp: payload.exp,
      iat: payload.iat,
    };

    return serviceContext;
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
        algorithms: ['RS256'],
      }) as any;

      const service = await this.validate(verified);

      // Store service context in request
      req.service = service;
      this.success(service);
    } catch (error) {
      this.logger.error(`Service token validation failed: ${error.message}`);
      return this.fail(new UnauthorizedException('Invalid service token'), 401);
    }
  }
}
