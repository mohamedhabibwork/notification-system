import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { UserServiceClient } from './user-service.client';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>('userService.baseUrl'),
        timeout: configService.get<number>('userService.timeout'),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    }),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const cacheTtl = configService.get<number>('userService.cacheTtl');
        return {
          ttl: (cacheTtl ?? 3600) * 1000,
          max: 1000, // Maximum number of items in cache
        };
      },
    }),
  ],
  providers: [UserServiceClient],
  exports: [UserServiceClient],
})
export class UserServiceModule {}
