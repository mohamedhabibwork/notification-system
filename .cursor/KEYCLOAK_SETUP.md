# Keycloak Setup Guide for NestJS with Swagger

This guide will walk you through setting up Keycloak authentication with OAuth2 OIDC for a new NestJS project, including Swagger/OpenAPI integration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Keycloak Installation](#keycloak-installation)
- [Keycloak Configuration](#keycloak-configuration)
- [NestJS Application Setup](#nestjs-application-setup)
- [Swagger Configuration](#swagger-configuration)
- [Testing the Setup](#testing-the-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for local Keycloak setup)
- Basic understanding of OAuth2/OIDC flows
- NestJS project initialized

## Keycloak Installation

### Option 1: Docker Compose (Recommended for Development)

Add Keycloak to your `docker-compose.yml`:

```yaml
version: '3.8'

services:
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    container_name: keycloak
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak
      KC_HOSTNAME: localhost
      KC_HOSTNAME_PORT: 8080
      KC_HTTP_ENABLED: 'true'
    ports:
      - "8080:8080"
    command: start-dev
    depends_on:
      - postgres
    networks:
      - app-network

  postgres:
    image: postgres:15
    container_name: keycloak-postgres
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloak
    volumes:
      - keycloak-db-data:/var/lib/postgresql/data
    networks:
      - app-network

volumes:
  keycloak-db-data:

networks:
  app-network:
    driver: bridge
```

Start Keycloak:

```bash
docker compose up -d keycloak
```

### Option 2: Standalone Installation

Download Keycloak from [https://www.keycloak.org/downloads](https://www.keycloak.org/downloads) and follow the installation guide for your platform.

## Keycloak Configuration

### Step 1: Access Keycloak Admin Console

1. Open your browser and navigate to: `http://localhost:8080`
2. Click **Administration Console**
3. Login with:
   - Username: `admin`
   - Password: `admin` (or your configured password)

### Step 2: Create a Realm

1. Hover over the realm dropdown (top-left, shows "master")
2. Click **Create Realm**
3. Enter realm name: `your-app-realm` (e.g., `file-management`)
4. Click **Create**

### Step 3: Create a Client

1. In the left sidebar, navigate to **Clients**
2. Click **Create client**
3. Fill in the form:
   - **Client type**: `OpenID Connect`
   - **Client ID**: `your-app-client` (e.g., `file-management-api`)
   - Click **Next**

4. **Capability config**:
   - ✅ **Client authentication**: OFF (for public clients)
   - ✅ **Authorization**: OFF (unless you need fine-grained permissions)
   - ✅ **Standard flow**: ON (required for Swagger OAuth2)
   - ✅ **Direct access grants**: ON (optional, for direct token requests)
   - ✅ **Implicit flow**: OFF (deprecated)
   - ✅ **OAuth 2.0 Device Authorization Grant**: OFF
   - Click **Next**

5. **Login settings**:
   - **Root URL**: `http://localhost:3000` (your NestJS app URL)
   - **Home URL**: `http://localhost:3000`
   - **Valid redirect URIs**: 
     ```
     http://localhost:3000/api/oauth2-redirect.html
     http://localhost:3000/*
     ```
   - **Valid post logout redirect URIs**: `http://localhost:3000/*`
   - **Web origins**: 
     ```
     http://localhost:3000
     *
     ```
   - Click **Save**

6. **Important Settings** (verify after saving):
   - Go to the **Settings** tab
   - **Access Type**: Must be `public` (NOT `confidential`)
   - **Standard Flow Enabled**: Must be `ON`
   - **Valid Redirect URIs**: Must include your exact redirect URL
   - **Web Origins**: Must include your app URL or `*`

### Step 4: Create a User (Optional, for Testing)

1. Navigate to **Users** in the left sidebar
2. Click **Create new user**
3. Fill in:
   - **Username**: `test-user`
   - **Email**: `test@example.com`
   - **Email verified**: ON
   - Click **Create**

4. Set password:
   - Go to **Credentials** tab
   - Click **Set password**
   - Enter password (e.g., `test123`)
   - **Temporary**: OFF
   - Click **Save**

### Step 5: Get Realm Public Key (Optional)

If you want to use a static public key instead of JWKS:

1. Navigate to **Realm settings** → **Keys** tab
2. Find the **RS256** key
3. Click on the key to view details
4. Copy the **Public key** (PEM format)
5. Save it for your environment variables

## NestJS Application Setup

### Step 1: Install Required Dependencies

```bash
npm install @nestjs/passport @nestjs/config passport passport-jwt
npm install --save-dev @types/passport-jwt
npm install jsonwebtoken jwks-rsa
npm install --save-dev @types/jsonwebtoken
npm install @nestjs/swagger
```

### Step 2: Create Configuration Module

Create `src/config/configuration.ts`:

```typescript
export default () => ({
  app: {
    port: parseInt(process.env.PORT || '3000', 10) || 3000,
    host: process.env.HOST || 'localhost',
  },
  keycloak: {
    realm: process.env.KEYCLOAK_REALM || '',
    serverUrl: process.env.KEYCLOAK_SERVER_URL || '',
    clientId: process.env.KEYCLOAK_CLIENT_ID || '',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
    publicKey: process.env.KEYCLOAK_PUBLIC_KEY || '', // Optional: for static key
    redirectUri: process.env.KEYCLOAK_REDIRECT_URI || '',
  },
});
```

### Step 3: Set Up Environment Variables

Create or update `.env`:

```env
# Application
PORT=3000
HOST=localhost

# Keycloak Configuration
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=your-app-realm
KEYCLOAK_CLIENT_ID=your-app-client
KEYCLOAK_PUBLIC_KEY=  # Optional: Leave empty to use JWKS
```

### Step 4: Create Keycloak Strategy

Create `src/modules/auth/strategies/keycloak.strategy.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface JwtPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
  tenant_id?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
}

@Injectable()
export class KeycloakStrategy
  extends PassportStrategy(Strategy, 'keycloak')
  implements OnModuleInit
{
  private readonly logger: Logger;
  private jwksClientInstance: jwksClient.JwksClient | null = null;
  private publicKey: string | null = null;
  private readonly serverUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly jwksUri: string;
  private useJwks: boolean = false;

  constructor(configService: ConfigService) {
    const serverUrl = configService.get<string>('keycloak.serverUrl') || '';
    const realm = configService.get<string>('keycloak.realm') || '';
    const clientId = configService.get<string>('keycloak.clientId') || '';
    const publicKey = configService.get<string>('keycloak.publicKey') || '';
    const jwksUri = `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`;

    let formattedKey: string | null = null;
    let useJwks = false;

    if (publicKey && publicKey.trim() !== '') {
      formattedKey = publicKey.trim();
      if (!formattedKey.includes('BEGIN')) {
        const keyContent = formattedKey.replace(/\s/g, '');
        const formattedContent =
          keyContent.match(/.{1,64}/g)?.join('\n') || keyContent;
        formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedContent}\n-----END PUBLIC KEY-----`;
      }
      useJwks = false;
    } else {
      useJwks = true;
    }

    if (formattedKey) {
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: formattedKey,
        issuer: `${serverUrl}/realms/${realm}`,
        audience: clientId,
        algorithms: ['RS256'],
      });
    } else {
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: 'jwks-handled',
        issuer: `${serverUrl}/realms/${realm}`,
        audience: clientId,
        algorithms: ['RS256'],
      });
    }

    this.logger = new Logger(KeycloakStrategy.name);
    this.serverUrl = serverUrl;
    this.realm = realm;
    this.clientId = clientId;
    this.jwksUri = jwksUri;
    this.publicKey = formattedKey;
    this.useJwks = useJwks;

    if (useJwks) {
      this.jwksClientInstance = jwksClient({
        jwksUri: this.jwksUri,
        requestHeaders: {},
        timeout: 30000,
        cache: true,
        cacheMaxAge: 86400000,
      });
    }
  }

  async onModuleInit() {
    if (!this.serverUrl || !this.realm) {
      this.logger.warn('Keycloak configuration incomplete');
      return;
    }

    this.logger.log(`Keycloak Strategy initialized for realm: ${this.realm}`);
    this.logger.log(`Using ${this.useJwks ? 'JWKS' : 'static public key'} for token validation`);
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return payload;
  }
}
```

### Step 5: Create Auth Guard

Create `src/modules/auth/guards/keycloak-auth.guard.ts`:

```typescript
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

@Injectable()
export class KeycloakAuthGuard extends AuthGuard('keycloak') {
  private readonly logger = new Logger(KeycloakAuthGuard.name);
  private jwksClientInstance: jwksClient.JwksClient | null = null;
  private readonly useJwks: boolean;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
    const publicKey = this.configService.get<string>('keycloak.publicKey');
    this.useJwks = !publicKey || publicKey.trim() === '';

    if (this.useJwks) {
      const serverUrl = this.configService.get<string>('keycloak.serverUrl');
      const realm = this.configService.get<string>('keycloak.realm');
      const jwksUri = `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`;

      this.jwksClientInstance = jwksClient({
        jwksUri,
        requestHeaders: {},
        timeout: 30000,
        cache: true,
        cacheMaxAge: 86400000,
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    if (this.useJwks && this.jwksClientInstance) {
      try {
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
          throw new UnauthorizedException('Invalid token');
        }

        const key = await this.jwksClientInstance.getSigningKey(decoded.header.kid);
        const publicKey = key.getPublicKey();

        const serverUrl = this.configService.get<string>('keycloak.serverUrl');
        const realm = this.configService.get<string>('keycloak.realm');
        const clientId = this.configService.get<string>('keycloak.clientId');

        jwt.verify(token, publicKey, {
          issuer: `${serverUrl}/realms/${realm}`,
          audience: clientId,
          algorithms: ['RS256'],
        });
      } catch (error) {
        this.logger.error('Token validation failed', error);
        throw new UnauthorizedException('Invalid token');
      }
    }

    return super.canActivate(context) as Promise<boolean>;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### Step 6: Create Public Decorator

Create `src/modules/auth/decorators/public.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### Step 7: Create Auth Module

Create `src/modules/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { KeycloakStrategy } from './strategies/keycloak.strategy';
import { KeycloakAuthGuard } from './guards/keycloak-auth.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'keycloak' })],
  providers: [KeycloakStrategy, KeycloakAuthGuard],
  exports: [PassportModule, KeycloakAuthGuard],
})
export class AuthModule {}
```

### Step 8: Create Swagger OAuth2 Controller

Create `src/modules/auth/swagger-oauth2.controller.ts`:

```typescript
import { Controller, Get, Res, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from './decorators/public.decorator';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller('api')
@Public()
export class SwaggerOAuth2Controller {
  constructor(private configService: ConfigService) {}

  @Get('oauth2-redirect.html')
  @ApiExcludeEndpoint()
  @Public()
  oauth2Redirect(@Res() res: any, @Query() query: any) {
    if (query.error) {
      console.error('OAuth2 Error:', {
        error: query.error,
        error_description: query.error_description,
        error_uri: query.error_uri,
      });
    }

    const html = `<!doctype html>
<html lang="en-US">
<head>
    <title>Swagger UI: OAuth2 Redirect</title>
</head>
<body>
<script>
    'use strict';
    function run () {
        var oauth2 = window.opener.swaggerUIRedirectOauth2;
        var sentState = oauth2.state;
        var redirectUrl = oauth2.redirectUrl;
        var isValid, qp, arr;

        if (/code|token|error/.test(window.location.hash)) {
            qp = window.location.hash.substring(1);
        } else {
            qp = location.search.substring(1);
        }

        arr = qp.split("&");
        arr.forEach(function (v,i,_arr) { _arr[i] = '"' + v.replace('=', '":"') + '"';});
        qp = qp ? JSON.parse('{' + arr.join() + '}',
                function (key, value) {
                    return key === "" ? value : decodeURIComponent(value);
                }
        ) : {};

        isValid = qp.state === sentState;

        if ((
          oauth2.auth.schema.get("flow") === "accessCode" ||
          oauth2.auth.schema.get("flow") === "authorizationCode" ||
          oauth2.auth.schema.get("flow") === "authorization_code"
        ) && !oauth2.auth.code) {
            if (!isValid) {
                oauth2.errCb({
                    authId: oauth2.auth.name,
                    source: "auth",
                    level: "warning",
                    message: "Authorization may be unsafe, passed state was changed in server. The passed state wasn't returned from auth server."
                });
            }

            if (qp.code) {
                delete oauth2.state;
                oauth2.auth.code = qp.code;
                oauth2.callback({auth: oauth2.auth, redirectUrl: redirectUrl});
            } else {
                let oauthErrorMsg;
                if (qp.error) {
                    oauthErrorMsg = "["+qp.error+"]: " +
                        (qp.error_description ? qp.error_description + ". " : "no accessCode received from the server. ") +
                        (qp.error_uri ? "More info: "+qp.error_uri : "");
                }

                oauth2.errCb({
                    authId: oauth2.auth.name,
                    source: "auth",
                    level: "error",
                    message: oauthErrorMsg || "[Authorization failed]: no accessCode received from the server"
                });
            }
        } else {
            oauth2.callback({auth: oauth2.auth, token: qp, isValid: isValid, redirectUrl: redirectUrl});
        }
        window.close();
    }

    if (document.readyState !== 'loading') {
        run();
    } else {
        document.addEventListener('DOMContentLoaded', run);
    }
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Get('oauth2-old-redirect.html')
  @ApiExcludeEndpoint()
  @Public()
  oauth2Redirect(@Res() res: any, @Query() query: any) {
    if (query.error) {
      console.error('OAuth2 Error:', {
        error: query.error,
        error_description: query.error_description,
        error_uri: query.error_uri,
      });
    }

    const html = `<!doctype html>
<html lang="en-US">
<head>
    <title>Swagger UI: OAuth2 Redirect</title>
</head>
<body>
<script>
    'use strict';
    function run () {
        var oauth2 = window.opener.swaggerUIRedirectOauth2;
        var sentState = oauth2.state;
        var redirectUrl = oauth2.redirectUrl;
        var isValid, qp, arr;

        if (/code|token|error/.test(window.location.hash)) {
            qp = window.location.hash.substring(1);
        } else {
            qp = location.search.substring(1);
        }

        arr = qp.split("&");
        arr.forEach(function (v,i,_arr) { _arr[i] = '"' + v.replace('=', '":"') + '"';});
        qp = qp ? JSON.parse('{' + arr.join() + '}',
                function (key, value) {
                    return key === "" ? value : decodeURIComponent(value);
                }
        ) : {};

        isValid = qp.state === sentState;

        if ((
          oauth2.auth.schema.get("flow") === "accessCode" ||
          oauth2.auth.schema.get("flow") === "authorizationCode" ||
          oauth2.auth.schema.get("flow") === "authorization_code"
        ) && !oauth2.auth.code) {
            if (!isValid) {
                oauth2.errCb({
                    authId: oauth2.auth.name,
                    source: "auth",
                    level: "warning",
                    message: "Authorization may be unsafe, passed state was changed in server. The passed state wasn't returned from auth server."
                });
            }

            if (qp.code) {
                delete oauth2.state;
                oauth2.auth.code = qp.code;
                oauth2.callback({auth: oauth2.auth, redirectUrl: redirectUrl});
            } else {
                let oauthErrorMsg;
                if (qp.error) {
                    oauthErrorMsg = "["+qp.error+"]: " +
                        (qp.error_description ? qp.error_description + ". " : "no accessCode received from the server. ") +
                        (qp.error_uri ? "More info: "+qp.error_uri : "");
                }

                oauth2.errCb({
                    authId: oauth2.auth.name,
                    source: "auth",
                    level: "error",
                    message: oauthErrorMsg || "[Authorization failed]: no accessCode received from the server"
                });
            }
        } else {
            oauth2.callback({auth: oauth2.auth, token: qp, isValid: isValid, redirectUrl: redirectUrl});
        }
        window.close();
    }

    if (document.readyState !== 'loading') {
        run();
    } else {
        document.addEventListener('DOMContentLoaded', run);
    }
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Get('oauth2-config')
  @Public()
  getOAuth2Config() {
    const serverUrl = this.configService.get<string>('keycloak.serverUrl', '');
    const realm = this.configService.get<string>('keycloak.realm', '');
    const clientId = this.configService.get<string>('keycloak.clientId', '');
    const port = this.configService.get('app.port', 3000);
    const host = this.configService.get('app.host', 'localhost');
    const appUrl = `http://${host}:${port}`;
    const redirectUrl = `${appUrl}/api/oauth2-redirect.html`;

    return {
      configuration: {
        serverUrl,
        realm,
        clientId,
        redirectUrl,
        authorizationUrl: serverUrl && realm
          ? `${serverUrl}/realms/${realm}/protocol/openid-connect/auth`
          : null,
        tokenUrl: serverUrl && realm
          ? `${serverUrl}/realms/${realm}/protocol/openid-connect/token`
          : null,
      },
      keycloakConfiguration: {
        steps: [
          '1. Log into Keycloak Admin Console',
          '2. Navigate to your realm → Clients → Select your client',
          '3. Go to Settings tab',
          '4. Set Access Type to: public',
          '5. Enable: Standard Flow Enabled',
          `6. Add to Valid Redirect URIs: ${redirectUrl}`,
          `7. Or use wildcard: ${appUrl}/*`,
          `8. Add to Web Origins: ${appUrl} or *`,
        ],
      },
    };
  }
}
```

Update `auth.module.ts` to include the controller:

```typescript
import { SwaggerOAuth2Controller } from './swagger-oauth2.controller';

@Module({
  // ... existing code
  controllers: [SwaggerOAuth2Controller],
  // ... existing code
})
export class AuthModule {}
```

## Swagger Configuration

### Update main.ts

Update your `src/main.ts` to configure Swagger with OAuth2:

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Swagger/OpenAPI setup with OAuth2 OIDC
  const serverUrl = configService.get<string>('keycloak.serverUrl', '');
  const realm = configService.get<string>('keycloak.realm', '');
  const clientId = configService.get<string>('keycloak.clientId', '');
  const port = configService.get<number>('app.port', 3000);
  const host = configService.get<string>('app.host', '0.0.0.0');
  const appUrl = `http://${host}:${port}`;

  // Build Keycloak OAuth2 OIDC endpoints
  const authorizationUrl = serverUrl && realm
    ? `${serverUrl}/realms/${realm}/protocol/openid-connect/auth`
    : '';
  const tokenUrl = serverUrl && realm
    ? `${serverUrl}/realms/${realm}/protocol/openid-connect/token`
    : '';

  // Swagger OAuth2 redirect URL - this MUST match what's configured in Keycloak
  const swaggerRedirectUrl = `${appUrl}/api/oauth2-redirect.html`;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Your API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addServer(appUrl, 'Development server')
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: authorizationUrl,
            tokenUrl: tokenUrl,
            scopes: {
              openid: 'OpenID Connect',
              profile: 'User profile information',
              email: 'User email address',
            },
          },
        },
        description: 'OAuth2 OIDC authentication using Keycloak',
      },
      'oauth2',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Configure Swagger UI with OAuth2
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      oauth2RedirectUrl: swaggerRedirectUrl,
      initOAuth: {
        clientId: clientId,
        realm: realm,
        appName: 'Your API',
        scopeSeparator: ' ',
        additionalQueryStringParams: {},
        useBasicAuthenticationWithAccessCodeGrant: true,
        usePkceWithAuthorizationCodeGrant: true,
      },
    },
    customCss: `
      .swagger-ui .topbar { display: none }
    `,
    customSiteTitle: 'Your API Documentation',
  });

  // Log configuration info
  if (serverUrl && realm && clientId) {
    console.log('\n📋 Swagger OAuth2 Configuration:');
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Realm: ${realm}`);
    console.log(`   Authorization URL: ${authorizationUrl}`);
    console.log(`   Token URL: ${tokenUrl}`);
    console.log(`   Redirect URI: ${swaggerRedirectUrl}`);
    console.log('\n⚠️  KEYCLOAK CONFIGURATION CHECKLIST:');
    console.log('   1. Client Access Type: MUST be "public" (NOT confidential)');
    console.log('   2. Standard Flow Enabled: MUST be ON');
    console.log(`   3. Valid Redirect URIs: MUST include "${swaggerRedirectUrl}"`);
    console.log(`      Or use wildcard: ${appUrl}/*`);
    console.log(`   4. Web Origins: MUST include "${appUrl}" or "*"`);
    console.log('   5. PKCE: Should be enabled (default for public clients)');
  }

  await app.listen(port);
  console.log(`Application is running on: ${appUrl}`);
  console.log(`Swagger UI: ${appUrl}/api`);
}

bootstrap();
```

### Apply Global Auth Guard

Update your `app.module.ts` to apply the guard globally:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { KeycloakAuthGuard } from './modules/auth/guards/keycloak-auth.guard';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // ... other modules
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: KeycloakAuthGuard,
    },
  ],
})
export class AppModule {}
```

### Use Public Decorator for Public Endpoints

For endpoints that don't require authentication, use the `@Public()` decorator:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return { status: 'ok' };
  }
}
```

## Testing the Setup

### Step 1: Start Services

```bash
# Start Keycloak
docker compose up -d keycloak

# Start your NestJS app
npm run start:dev
```

### Step 2: Verify Configuration

1. Visit `http://localhost:3000/api/oauth2-config` to see your OAuth2 configuration
2. Verify all URLs match your Keycloak setup

### Step 3: Test Swagger Authentication

1. Navigate to `http://localhost:3000/api` (Swagger UI)
2. Click the **Authorize** button (lock icon)
3. Click **Authorize** in the OAuth2 dialog
4. You should be redirected to Keycloak login page
5. Login with your test user credentials
6. You should be redirected back to Swagger UI
7. The lock icon should turn green, indicating you're authenticated

### Step 4: Test API Endpoints

1. In Swagger UI, try calling a protected endpoint
2. The request should include the `Authorization: Bearer <token>` header automatically
3. You should receive a successful response

### Step 5: Test with cURL

Get a token manually:

```bash
curl -X POST "http://localhost:8080/realms/your-app-realm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=your-app-client" \
  -d "username=test-user" \
  -d "password=test123" \
  -d "grant_type=password"
```

Use the token:

```bash
curl -X GET "http://localhost:3000/api/your-endpoint" \
  -H "Authorization: Bearer <access_token>"
```

## Troubleshooting

### Common Issues

#### 1. "unauthorized_client" Error

**Symptoms**: Error when trying to authenticate in Swagger UI

**Causes**:
- Redirect URI doesn't match exactly in Keycloak
- Client is configured as "confidential" instead of "public"
- Standard Flow is not enabled

**Solutions**:
- Verify the redirect URI in Keycloak matches exactly: `http://localhost:3000/api/oauth2-redirect.html`
- Set Access Type to "public"
- Enable "Standard Flow Enabled"
- Check that Client ID matches exactly in environment variables

#### 2. "Invalid token" Error

**Symptoms**: API calls return 401 Unauthorized

**Causes**:
- Token expired
- Token not properly formatted
- JWKS endpoint not accessible
- Public key mismatch

**Solutions**:
- Check token expiration
- Verify JWKS endpoint is accessible: `http://localhost:8080/realms/your-realm/protocol/openid-connect/certs`
- If using static public key, verify it's correctly formatted
- Check application logs for detailed error messages

#### 3. Swagger UI Not Showing Authorize Button

**Symptoms**: No OAuth2 option in Swagger UI

**Causes**:
- Swagger configuration incomplete
- OAuth2 not properly added to DocumentBuilder

**Solutions**:
- Verify `.addOAuth2()` is called in DocumentBuilder
- Check that `authorizationUrl` and `tokenUrl` are not empty
- Restart the application

#### 4. CORS Issues

**Symptoms**: CORS errors in browser console

**Solutions**:
- Enable CORS in your NestJS app:
  ```typescript
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });
  ```
- Add your app URL to Keycloak "Web Origins"

### Verification Checklist

- [ ] Keycloak is running and accessible
- [ ] Realm created and configured
- [ ] Client created with correct settings:
  - [ ] Access Type: `public`
  - [ ] Standard Flow Enabled: `ON`
  - [ ] Valid Redirect URIs includes: `http://localhost:3000/api/oauth2-redirect.html`
  - [ ] Web Origins includes: `http://localhost:3000` or `*`
- [ ] Environment variables set correctly
- [ ] NestJS app starts without errors
- [ ] Swagger UI accessible at `/api`
- [ ] OAuth2 configuration endpoint works: `/api/oauth2-config`
- [ ] Can authenticate in Swagger UI
- [ ] Protected endpoints require authentication
- [ ] Public endpoints work without authentication

### Getting Help

1. Check application logs for detailed error messages
2. Visit `/api/oauth2-config` for configuration diagnostics
3. Verify Keycloak client settings match the checklist
4. Test token manually with cURL
5. Check browser console for JavaScript errors
6. Verify network requests in browser DevTools

## Additional Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [NestJS Passport Documentation](https://docs.nestjs.com/security/authentication)
- [Swagger/OpenAPI OAuth2](https://swagger.io/docs/specification/authentication/oauth2/)
- [OAuth2 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)

## Next Steps

After completing this setup, you can:

1. **Add Role-Based Access Control (RBAC)**: Create roles in Keycloak and use `@Roles()` decorator
2. **Add Permissions**: Implement fine-grained permissions
3. **Custom Claims**: Add custom claims to JWT tokens
4. **Token Refresh**: Implement refresh token flow
5. **Multi-Tenancy**: Add tenant context to tokens
6. **GraphQL Integration**: Add Keycloak guards for GraphQL resolvers
7. **gRPC Integration**: Add Keycloak guards for gRPC services

