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

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('api/oauth2-redirect.html')
  @Public()
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'OAuth2 redirect handler for Swagger UI' })
  oauth2Redirect(
    @Res() res: Response,
    @Query() query: Record<string, string | undefined>,
  ) {
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Swagger UI: OAuth2 Redirect</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
        }
        .success {
            color: #28a745;
        }
        .error {
            color: #dc3545;
        }
        .info {
            color: #17a2b8;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="loading">
            <div class="spinner"></div>
            <p class="info">Processing OAuth2 redirect...</p>
        </div>
        <div id="success" style="display: none;">
            <p class="success">✓ Authentication successful! This window will close automatically.</p>
        </div>
        <div id="error" style="display: none;">
            <p class="error" id="error-message"></p>
            <p><small>You can close this window manually.</small></p>
        </div>
    </div>
    <script>
        'use strict';
        function showSuccess() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('success').style.display = 'block';
        }
        function showError(message) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error-message').textContent = message;
        }
        
        
        function run() {
            try {
                // Check if window.opener exists and is accessible
                if (!window.opener || window.opener.closed) {
                    showError('No parent window found. Please initiate OAuth2 flow from Swagger UI.');
                    return;
                }

                // Check if Swagger UI redirect handler exists
                var swaggerHandler = window.opener.swaggerUIRedirectOauth2;
                if (!swaggerHandler) {
                    showError('Swagger UI redirect handler not found. Please try again from Swagger UI.');
                    return;
                }

                var oauth2 = swaggerHandler;
                var sentState = oauth2.state;
                var redirectUrl = oauth2.redirectUrl;
                var isValid, qp, arr;

                // Parse query parameters from hash or search
                if (/code|token|error/.test(window.location.hash)) {
                    qp = window.location.hash.substring(1);
                } else {
                    qp = location.search.substring(1);
                }

                // Parse query string into object
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

                // Handle authorization code flow
                if ((
                    oauth2.auth.schema.get("flow") === "accessCode" ||
                    oauth2.auth.schema.get("flow") === "authorizationCode" ||
                    oauth2.auth.schema.get("flow") === "authorization_code"
                ) && !oauth2.auth.code) {
                    if (!isValid) {
                        try {
                            oauth2.errCb({
                                authId: oauth2.auth.name,
                                source: "auth",
                                level: "warning",
                                message: "Authorization may be unsafe, passed state was changed in server. The passed state wasn't returned from auth server."
                            });
                        } catch (e) {
                            console.warn('Could not send warning to opener:', e);
                        }
                    }

                    if (qp.code) {
                        delete oauth2.state;
                        oauth2.auth.code = qp.code;
                        oauth2.callback({auth: oauth2.auth, redirectUrl: redirectUrl});
                        showSuccess();
                        setTimeout(function() {
                            window.close();
                        }, 1000);
                    } else {
                        var oauthErrorMsg = qp.error ? 
                            "[" + qp.error + "]: " + (qp.error_description || "no accessCode received from the server") :
                            "Authorization failed: no access code received from the server";
                        
                        oauth2.errCb({
                            authId: oauth2.auth.name,
                            source: "auth",
                            level: "error",
                            message: oauthErrorMsg
                        });
                        showError(oauthErrorMsg);
                    }
                } else {
                    // Handle other flows (implicit, etc.)
                    oauth2.callback({auth: oauth2.auth, token: qp, isValid: isValid, redirectUrl: redirectUrl});
                    showSuccess();
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                }
            } catch (error) {
                console.error('OAuth2 redirect error:', error);
                var errorMessage = 'An error occurred during OAuth2 redirect.';
                if (error && error.message) {
                    errorMessage += ' ' + error.message;
                }
                if (error && error.toString) {
                    errorMessage += ' (' + error.toString() + ')';
                }
                showError(errorMessage);
            }
        }

        // Run when DOM is ready
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

  @Post('api/v1/auth/refresh')
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

  @Get('api/v1/auth/info')
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

  @Post('api/v1/auth/validate')
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

  @Get('api/v1/auth/config')
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
