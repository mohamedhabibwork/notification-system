import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { KeycloakUserStrategy } from './strategies/keycloak-user.strategy';
import { KeycloakServiceStrategy } from './strategies/keycloak-service.strategy';
import { KeycloakAuthGuard } from './guards/keycloak-auth.guard';
import { ServiceAuthGuard } from './guards/service-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: ['keycloak-user', 'keycloak-service'],
      session: false,
    }),
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [
    KeycloakUserStrategy,
    KeycloakServiceStrategy,
    KeycloakAuthGuard,
    ServiceAuthGuard,
    AuthService,
  ],
  exports: [PassportModule, KeycloakAuthGuard, ServiceAuthGuard, AuthService],
})
export class AuthModule {}
