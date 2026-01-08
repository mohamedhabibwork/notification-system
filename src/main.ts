import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'path';
import { Request, Response } from 'express';
import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger/logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get configuration
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const host = configService.get<string>('app.host', '0.0.0.0');
  // Use localhost for Swagger/OAuth URLs (0.0.0.0 is not valid in browser)
  const publicHost = host === '0.0.0.0' ? 'localhost' : host;
  const appUrl = `http://${publicHost}:${port}`;
  const environment = configService.get<string>(
    'app.environment',
    'development',
  );
  const keycloakServerUrl = configService.get<string>('keycloak.serverUrl');
  const keycloakRealm = configService.get<string>('keycloak.realm');
  const keycloakUserClientId = configService.get<string>(
    'keycloak.userClientId',
  );

  // Use custom logger
  const logger = await app.resolve(CustomLoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: true, // In production, specify exact origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filters
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Swagger configuration - OAuth2 redirect URL must match the route in auth.controller.ts
  const swaggerRedirectUrl = `${appUrl}/api/oauth2-redirect.html`;
  
  const configBuilder = new DocumentBuilder()
    .setTitle('Multi-Tenant Notification System API')
    .setDescription(
      `
      A production-ready, enterprise-grade notification service supporting multiple delivery channels (Email, SMS, FCM, WhatsApp, Database) 
      with batch chunking, real-time WebSocket updates, and comprehensive monitoring.
      
      ## Authentication
      
      This API uses Bearer token authentication. Include your JWT token in the Authorization header:
      \`\`\`
      Authorization: Bearer <your-token>
      \`\`\`
      
      ### Getting a Token
      
      1. **Via Keycloak (OAuth2)**: Click the "Authorize" button and use OAuth2 flow
      2. **Via Direct Token**: Get token from Keycloak and paste it in the Bearer auth field
      
      ## API Groups
      
      - **User APIs** (/api/v1/users/me/*): User-facing endpoints for managing own notifications
      - **Service APIs** (/api/v1/services/*): Service-to-service endpoints for sending notifications
      - **Admin APIs** (/api/v1/admin/*): Administrative endpoints for managing templates, providers, etc.
      - **Tenant APIs** (/api/v1/tenants/*): Tenant-scoped resource management
      - **Provider APIs** (/api/v1/providers/*): Provider-template integration endpoints
      - **System APIs** (/health, /metrics): Health checks and monitoring
    `,
    )
    .setVersion('1.0.0')
    .setContact(
      'Notification Service',
      'https://github.com',
      'support@notification.local',
    )
    .addServer(appUrl, 'Development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from Keycloak',
        in: 'header',
        name: 'Authorization',
      },
      'bearer',
    )
    .addTag(
      'User - Notifications',
      'User-facing APIs for managing own notifications',
    )
    .addTag('User - Preferences', 'User notification preferences management')
    .addTag('Services - Notifications', 'Service-to-service notification APIs')
    .addTag('Admin - Tenants', 'Tenant management')
    .addTag('Admin - Templates', 'Notification template management')
    .addTag('Admin - Providers', 'Channel provider configuration')
    .addTag('Tenants - Providers', 'Tenant-scoped provider management')
    .addTag('Tenants - Templates', 'Tenant-scoped template management')
    .addTag('Providers - Templates', 'Provider-template integration')
    .addTag('Lookups', 'Lookup values (statuses, priorities, etc.)')
    .addTag('System', 'Health checks and monitoring');

  // Add OAuth2 only if Keycloak is properly configured
  if (keycloakServerUrl && keycloakRealm && keycloakUserClientId) {
    const authorizationUrl = `${keycloakServerUrl}/realms/${keycloakRealm}/protocol/openid-connect/auth`;
    const tokenUrl = `${keycloakServerUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`;
    
    configBuilder.addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl,
            tokenUrl,
            scopes: {
              openid: 'OpenID Connect',
              profile: 'User profile information',
              email: 'User email address',
            },
          },
        },
        description: 'OAuth2 authentication using Keycloak',
      },
      'oauth2',
    );

    // Log OAuth2 configuration for debugging
    logger.log('\n🔐 OAuth2 Configuration:');
    logger.log(`   Authorization URL: ${authorizationUrl}`);
    logger.log(`   Token URL: ${tokenUrl}`);
    logger.log(`   Redirect URI: ${swaggerRedirectUrl}`);
    logger.log(`   Client ID: ${keycloakUserClientId}`);
    logger.log('\n⚠️  KEYCLOAK CLIENT CONFIGURATION REQUIRED:');
    logger.log('   1. Access Type: MUST be "public" (NOT confidential)');
    logger.log('   2. Standard Flow Enabled: MUST be ON');
    logger.log(`   3. Valid Redirect URIs: MUST include "${swaggerRedirectUrl}"`);
    logger.log(`   4. Web Origins: MUST include "${appUrl}" or "*"`);
    logger.log('   5. PKCE: Should be enabled (default for public clients)');
  }

  const config = configBuilder.build();
  const document = SwaggerModule.createDocument(app, config);

  // Swagger UI setup options
  const swaggerOptions: any = {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: false,
      filter: true,
      tryItOutEnabled: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
      docExpansion: 'none',
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
    },
    customSiteTitle: 'Notification Service API',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin-top: 20px }
      .swagger-ui .scheme-container { margin: 20px 0; }
      .swagger-ui .auth-wrapper { margin-top: 20px; }
    `,
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui-standalone-preset.min.js',
    ],
  };

  // Only add OAuth2 redirect if Keycloak is configured
  if (keycloakServerUrl && keycloakRealm && keycloakUserClientId) {
    swaggerOptions.swaggerOptions.oauth2RedirectUrl = swaggerRedirectUrl;
    swaggerOptions.swaggerOptions.initOAuth = {
      clientId: keycloakUserClientId,
      appName: 'Notification Service',
      scopeSeparator: ' ',
      scopes: 'openid profile email',
      additionalQueryStringParams: {},
      useBasicAuthenticationWithAccessCodeGrant: false,
      usePkceWithAuthorizationCodeGrant: true,
    };
  }

  SwaggerModule.setup('api', app, document, swaggerOptions);

  // Global prefix
  app.setGlobalPrefix('');

  // Enable gRPC microservice if configured
  const grpcEnabled = configService.get<boolean>('grpc.enabled', false);
  const grpcPort = configService.get<number>('grpc.port', 5001);

  if (grpcEnabled) {
    const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.GRPC,
        options: {
          package: ['notification', 'template', 'tenant'],
          protoPath: [
            join(process.cwd(), 'proto/notification.proto'),
            join(process.cwd(), 'proto/template.proto'),
            join(process.cwd(), 'proto/tenant.proto'),
          ],
          url: `0.0.0.0:${grpcPort}`,
          channelOptions: {
            'grpc.max_receive_message_length': 1024 * 1024 * 10, // 10MB
            'grpc.max_send_message_length': 1024 * 1024 * 10, // 10MB
          },
        },
      },
    );

    await grpcApp.listen();
    logger.log(`🔌 gRPC microservice started on port ${grpcPort}`);
  }

  await app.listen(port);

  logger.log(`🚀 Notification Service started on port ${port}`);
  logger.log(`📝 Environment: ${environment}`);
  logger.log(`📚 Swagger UI: ${appUrl}/api`);
  logger.log(`📚 GraphQL Playground: ${appUrl}/graphql`);
  logger.log(`🔗 Health check: ${appUrl}/health`);
  logger.log(`📊 Metrics: ${appUrl}/metrics`);

  if (grpcEnabled) {
    logger.log(`🔌 gRPC endpoint: ${appUrl}:${grpcPort}`);
  }
}

bootstrap();
