import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { DrizzleModule } from './database/drizzle.module';
import { LoggerModule } from './common/logger/logger.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { HealthController } from './common/health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { KeycloakAuthGuard } from './modules/auth/guards/keycloak-auth.guard';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { QueueModule } from './queues/queue.module';
import { UserServiceModule } from './modules/user-service/user-service.module';
import { EventsModule } from './modules/events/events.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LookupsModule } from './modules/lookups/lookups.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProcessorsModule } from './processors/processors.module';
import { UserNotificationsModule } from './modules/user-notifications/user-notifications.module';
import { GatewayModule } from './gateways/gateway.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BulkJobsModule } from './modules/bulk-jobs/bulk-jobs.module';
import { ResilienceModule } from './common/resilience/resilience.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { MetricsInterceptor } from './common/observability/metrics-interceptor';
import { GraphqlConfigModule } from './graphql/graphql.module';
import { GrpcModule } from './grpc/grpc.module';
import { GrpcTenantInterceptor } from './common/interceptors/grpc-tenant.interceptor';
import { ProviderModule } from './common/providers/provider.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('security.rateLimitWindow', 60000),
          limit: config.get<number>('security.rateLimitMax', 100),
        },
      ],
    }),
    DrizzleModule,
    LoggerModule,
    MetricsModule,
    ResilienceModule,
    ObservabilityModule,
    ProviderModule,
    AuthModule,
    QueueModule,
    UserServiceModule,
    EventsModule,
    TenantsModule,
    LookupsModule,
    TemplatesModule,
    ProvidersModule,
    PreferencesModule,
    NotificationsModule,
    ProcessorsModule,
    UserNotificationsModule,
    GatewayModule,
    WebhooksModule,
    BulkJobsModule,
    // GraphQL disabled by default - enable in .env when resolvers are implemented
    // GraphqlConfigModule.forRoot(),
    GrpcModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: KeycloakAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: GrpcTenantInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply HTTP-specific middlewares only to HTTP routes
    // GraphQL uses its own context, gRPC uses interceptors
    consumer
      .apply(TenantContextMiddleware, SecurityMiddleware)
      .exclude(
        '/graphql', // Exclude GraphQL endpoint
        '/graphql/(.*)', // Exclude GraphQL playground/subscriptions
      )
      .forRoutes('*');
  }
}
