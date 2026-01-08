import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'path';
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

  // Swagger configuration
  const authorizationUrl = `${keycloakServerUrl}/realms/${keycloakRealm}/protocol/openid-connect/auth`;
  const tokenUrl = `${keycloakServerUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`;
  const swaggerRedirectUrl = `http://localhost:${port}/api/oauth2-redirect.html`;

  const config = new DocumentBuilder()
    .setTitle('Multi-Tenant Notification System API')
    .setDescription(
      `
      A production-ready, enterprise-grade notification service supporting multiple delivery channels (Email, SMS, FCM, WhatsApp, Database) 
      with batch chunking, real-time WebSocket updates, and comprehensive monitoring.
      
      ## Authentication
      
      This API supports dual authentication:
      - **User Authentication**: OAuth2/OIDC for user-facing APIs (manage own notifications)
      - **Service Authentication**: Client credentials flow for service-to-service calls
      
      ## API Groups
      
      - **User APIs** (/api/v1/users/me/*): User-facing endpoints for managing own notifications
      - **Service APIs** (/api/v1/services/*): Service-to-service endpoints for sending notifications
      - **Admin APIs** (/api/v1/admin/*): Administrative endpoints for managing templates, providers, etc.
      - **System APIs** (/health, /metrics): Health checks and monitoring
    `,
    )
    .setVersion('1.0.0')
    .setContact(
      'Notification Service',
      'https://github.com',
      'support@notification.local',
    )
    .addServer(`http://localhost:${port}`, 'Development')
    .addOAuth2(
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
          clientCredentials: {
            tokenUrl,
            scopes: {
              'notification:send': 'Send notifications',
              'notification:manage': 'Manage notifications',
            },
          },
        },
        description: 'OAuth2 authentication using Keycloak',
      },
      'oauth2',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token for user or service authentication',
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
    .addTag('Lookups', 'Lookup values (statuses, priorities, etc.)')
    .addTag('System', 'Health checks and monitoring')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      oauth2RedirectUrl: swaggerRedirectUrl,
      initOAuth: {
        clientId: keycloakUserClientId,
        realm: keycloakRealm,
        appName: 'Notification Service',
        scopeSeparator: ' ',
        additionalQueryStringParams: {},
        useBasicAuthenticationWithAccessCodeGrant: false,
        usePkceWithAuthorizationCodeGrant: true,
      },
    },
    customSiteTitle: 'Notification Service API',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin-top: 20px }
    `,
  });

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
  logger.log(`📚 Swagger UI: http://localhost:${port}/api`);
  logger.log(`📚 GraphQL Playground: http://localhost:${port}/graphql`);
  logger.log(`🔗 Health check: http://localhost:${port}/health`);
  logger.log(`📊 Metrics: http://localhost:${port}/metrics`);

  if (grpcEnabled) {
    logger.log(`🔌 gRPC endpoint: localhost:${grpcPort}`);
  }
}

bootstrap();
