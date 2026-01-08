import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const QUEUE_NAMES = {
  EMAIL: 'email-notifications',
  SMS: 'sms-notifications',
  FCM: 'fcm-notifications',
  WHATSAPP: 'whatsapp-notifications',
  DATABASE: 'database-notifications',
} as const;

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password') || undefined,
          db: configService.get<number>('redis.db'),
          keyPrefix: configService.get<string>('redis.keyPrefix'),
        },
        defaultJobOptions: {
          attempts: configService.get<number>('queue.retry.attempts'),
          backoff: {
            type: 'exponential',
            delay: configService.get<number>('queue.retry.backoff.delay'),
          },
          removeOnComplete: {
            age: configService.get<number>('queue.removeOnComplete.age'),
            count: configService.get<number>('queue.removeOnComplete.count'),
          },
          removeOnFail: {
            age: configService.get<number>('queue.removeOnFail.age'),
          },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.SMS },
      { name: QUEUE_NAMES.FCM },
      { name: QUEUE_NAMES.WHATSAPP },
      { name: QUEUE_NAMES.DATABASE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
