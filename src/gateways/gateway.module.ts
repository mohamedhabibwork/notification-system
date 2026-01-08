import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('keycloak.secret') || 'development-secret',
        signOptions: {
          expiresIn: '1h',
        },
      }),
    }),
  ],
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class GatewayModule {}
