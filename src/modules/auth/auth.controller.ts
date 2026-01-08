import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentService } from './decorators/current-service.decorator';
import type { UserContext } from './decorators/current-user.decorator';
import type { ServiceContext } from './decorators/current-service.decorator';
import {
  TokenRefreshRequestDto,
  TokenRefreshResponseDto,
} from './dto/token-refresh.dto';
import {
  TokenValidationRequestDto,
  TokenValidationResponseDto,
} from './dto/token-validation.dto';
import { AuthInfoResponseDto } from './dto/auth-info.dto';
import { ApiTenantHeader } from '../../common/decorators/api-tenant-header.decorator';

@ApiTenantHeader()
@ApiTags('Authentication')
@Controller('api')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * OAuth2 redirect handler for Swagger UI
   * This HTML page is used by Swagger UI to complete the OAuth2/OIDC authorization flow
   */
  @Get('oauth2-redirect.html')
  @ApiExcludeEndpoint()
  @Public()
  oauth2Redirect(@Res() res: Response, @Query() query: Record<string, string>) {
    const keycloakConfigured =
      this.configService.get<string>('keycloak.serverUrl') &&
      this.configService.get<string>('keycloak.realm') &&
      this.configService.get<string>('keycloak.userClientId');

    // Log query parameters for debugging
    if (query.error) {
      console.error('OAuth2 Error:', {
        error: query.error,
        error_description: query.error_description,
        error_uri: query.error_uri,
      });
    }

    // This is the standard OAuth2/OIDC redirect HTML that Swagger UI expects
    const html = `<!doctype html>
<html lang="en-US">
<head>
    <meta charset="UTF-8">
    <title>Swagger UI: OAuth2 Redirect</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #fafafa;
        }
        .message {
            max-width: 600px;
            margin: 40px auto;
            padding: 30px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        .error { color: #d32f2f; }
        .success { color: #388e3c; }
        .info { color: #1976d2; }
    </style>
</head>
<body>
    <div id="message" class="message info">
        <h2>Completing authentication...</h2>
        <p>Please wait while we redirect you back to Swagger UI.</p>
    </div>
<script>
    'use strict';
    function run() {
        try {
            // Check if window.opener exists and has the required Swagger UI object
            if (!window.opener) {
                throw new Error('No opener window found. Please ensure this page was opened by Swagger UI.');
            }

            if (!window.opener.swaggerUIRedirectOauth2) {
                throw new Error('Swagger UI redirect object not found. Please try again from the Swagger UI page.');
            }

            var oauth2 = window.opener.swaggerUIRedirectOauth2;
            var sentState = oauth2.state;
            var redirectUrl = oauth2.redirectUrl;
            var isValid, qp, arr;

            // Parse query parameters from hash or search
            if (/code|token|error/.test(window.location.hash)) {
                qp = window.location.hash.substring(1);
            } else {
                qp = location.search.substring(1);
            }

            arr = qp.split("&");
            arr.forEach(function (v, i, _arr) { 
                _arr[i] = '"' + v.replace('=', '":"') + '"';
            });
            
            qp = qp ? JSON.parse('{' + arr.join() + '}',
                function (key, value) {
                    return key === "" ? value : decodeURIComponent(value);
                }
            ) : {};

            isValid = qp.state === sentState;

            // Handle authorization code flow (OIDC/OAuth2)
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
                    
                    document.getElementById('message').innerHTML = 
                        '<h2 class="success">✓ Authentication Successful</h2>' +
                        '<p>You can close this window.</p>';
                } else {
                    let oauthErrorMsg;
                    if (qp.error) {
                        oauthErrorMsg = "[" + qp.error + "]: " +
                            (qp.error_description ? qp.error_description + ". " : "no accessCode received from the server. ") +
                            (qp.error_uri ? "More info: " + qp.error_uri : "");
                    }

                    oauth2.errCb({
                        authId: oauth2.auth.name,
                        source: "auth",
                        level: "error",
                        message: oauthErrorMsg || "[Authorization failed]: no accessCode received from the server"
                    });
                    
                    document.getElementById('message').innerHTML = 
                        '<h2 class="error">✗ Authentication Failed</h2>' +
                        '<p>' + (oauthErrorMsg || 'No access code received') + '</p>';
                }
            } else {
                // Handle implicit flow or token refresh
                oauth2.callback({auth: oauth2.auth, token: qp, isValid: isValid, redirectUrl: redirectUrl});
                
                document.getElementById('message').innerHTML = 
                    '<h2 class="success">✓ Authentication Successful</h2>' +
                    '<p>You can close this window.</p>';
            }
            
            // Auto-close window after successful auth
            setTimeout(function() {
                window.close();
            }, 1000);
            
        } catch (error) {
            console.error('OAuth2 redirect error:', error);
            document.getElementById('message').innerHTML = 
                '<h2 class="error">✗ Authentication Error</h2>' +
                '<p>' + error.message + '</p>' +
                '<p><a href="/api">Return to Swagger UI</a></p>';
        }
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

  @Post('v1/auth/refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: TokenRefreshRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: TokenRefreshResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid refresh token' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshToken(
    @Body() dto: TokenRefreshRequestDto,
  ): Promise<TokenRefreshResponseDto> {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Get('v1/auth/info')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get current authentication information',
    description:
      'Returns user or service authentication context, roles, scopes, and expiration',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication information',
    type: AuthInfoResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAuthInfo(
    @CurrentUser() user?: UserContext,
    @CurrentService() service?: ServiceContext,
  ): AuthInfoResponseDto {
    // Check if user context exists (has 'sub' property)
    if (user && 'sub' in user && user.sub) {
      return this.authService.getAuthInfo(user);
    }

    // Check if service context exists (has 'clientId' property)
    if (service && 'clientId' in service && service.clientId) {
      return this.authService.getAuthInfo(service);
    }

    // This should not happen if guards are working correctly
    // But we throw a proper error just in case
    throw new Error(
      'No authentication context found. Please ensure you are authenticated.',
    );
  }

  @Post('v1/auth/validate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate a token without consuming it',
    description:
      'Useful for debugging and client-side validation. Does not consume the token.',
  })
  @ApiBody({ type: TokenValidationRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
    type: TokenValidationResponseDto,
  })
  async validateToken(
    @Body() dto: TokenValidationRequestDto,
  ): Promise<TokenValidationResponseDto> {
    return await this.authService.validateToken(dto.token);
  }

  @Get('v1/auth/config')
  @Public()
  @ApiOperation({
    summary: 'Get OAuth2 configuration information',
    description:
      'Returns Keycloak endpoints, client IDs, and redirect URIs for client discovery',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth2 configuration',
    schema: {
      type: 'object',
      properties: {
        serverUrl: { type: 'string' },
        realm: { type: 'string' },
        userClientId: { type: 'string' },
        serviceClientId: { type: 'string' },
        authorizationUrl: { type: 'string' },
        tokenUrl: { type: 'string' },
        redirectUrl: { type: 'string' },
        jwksUrl: { type: 'string' },
      },
    },
  })
  getAuthConfig() {
    const serverUrl = this.configService.get<string>('keycloak.serverUrl', '');
    const realm = this.configService.get<string>('keycloak.realm', '');
    const userClientId = this.configService.get<string>(
      'keycloak.userClientId',
      '',
    );
    const serviceClientId = this.configService.get<string>(
      'keycloak.serviceClientId',
      '',
    );
    const port = this.configService.get<number>('app.port', 3000);
    const host = this.configService.get<string>('app.host', 'localhost');
    const appUrl = `http://${host}:${port}`;
    const redirectUrl = `${appUrl}/api/oauth2-redirect.html`;

    return {
      serverUrl,
      realm,
      userClientId,
      serviceClientId,
      authorizationUrl:
        serverUrl && realm
          ? `${serverUrl}/realms/${realm}/protocol/openid-connect/auth`
          : null,
      tokenUrl:
        serverUrl && realm
          ? `${serverUrl}/realms/${realm}/protocol/openid-connect/token`
          : null,
      redirectUrl,
      jwksUrl:
        serverUrl && realm
          ? `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`
          : null,
    };
  }
}
