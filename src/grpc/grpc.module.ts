import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

/**
 * gRPC Module
 * 
 * Configures gRPC microservice clients for inter-service communication
 */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_GRPC_SERVICE',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'notification',
            protoPath: join(process.cwd(), 'proto/notification.proto'),
            url: configService.get<string>(
              'grpc.notificationServiceUrl',
              'localhost:5001',
            ),
            channelOptions: {
              'grpc.max_receive_message_length': 1024 * 1024 * 10, // 10MB
              'grpc.max_send_message_length': 1024 * 1024 * 10, // 10MB
            },
          },
        }),
      },
      {
        name: 'TEMPLATE_GRPC_SERVICE',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'template',
            protoPath: join(process.cwd(), 'proto/template.proto'),
            url: configService.get<string>(
              'grpc.templateServiceUrl',
              'localhost:5002',
            ),
          },
        }),
      },
      {
        name: 'TENANT_GRPC_SERVICE',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'tenant',
            protoPath: join(process.cwd(), 'proto/tenant.proto'),
            url: configService.get<string>(
              'grpc.tenantServiceUrl',
              'localhost:5003',
            ),
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GrpcModule {}
