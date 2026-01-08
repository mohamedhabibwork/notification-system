/**
 * ProcessorsModule - NestJS-Native Worker Management
 *
 * This module registers all BullMQ processors that handle notification delivery.
 * When the application starts, all processors automatically begin listening to
 * their respective queues and processing jobs concurrently.
 *
 * Architecture:
 * - Each processor is decorated with @Processor(queueName) and registers with BullMQ
 * - All processors run within the main NestJS application process
 * - No separate worker processes needed - NestJS manages everything
 * - Horizontal scaling achieved by running multiple application instances
 *
 * Benefits of NestJS-Native Approach:
 * - Simplified deployment (single application instead of multiple worker processes)
 * - Better resource utilization (shared connection pools, memory)
 * - Easier monitoring and debugging (unified logs and metrics)
 * - Native NestJS dependency injection across all processors
 * - Automatic graceful shutdown handling
 *
 * To scale workers:
 * - Run multiple instances of the application (e.g., in Kubernetes/Docker)
 * - Configure concurrency per processor using BullMQ options
 * - Use Redis Cluster for high-volume scenarios
 */
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './email.processor';
import { SmsProcessor } from './sms.processor';
import { FcmProcessor } from './fcm.processor';
import { WhatsAppProcessor } from './whatsapp.processor';
import { DatabaseProcessor } from './database.processor';
import { PushProcessor } from './push.processor';
import { AlertProcessor } from './alert.processor';
import { IoTProcessor } from './iot.processor';
import { ChatProcessor } from './chat.processor';
import { WebhookProcessor } from './webhook.processor';
import { MessengerProcessor } from './messenger.processor';
import { ProvidersModule } from '../modules/providers/providers.module';
import { GatewayModule } from '../gateways/gateway.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'sms' },
      { name: 'fcm' },
      { name: 'whatsapp' },
      { name: 'database' },
      { name: 'push' },
      { name: 'alert' },
      { name: 'iot' },
      { name: 'chat' },
      { name: 'webhook' },
      { name: 'messenger' },
    ),
    ProvidersModule,
    GatewayModule,
  ],
  providers: [
    EmailProcessor,
    SmsProcessor,
    FcmProcessor,
    WhatsAppProcessor,
    DatabaseProcessor,
    PushProcessor,
    AlertProcessor,
    IoTProcessor,
    ChatProcessor,
    WebhookProcessor,
    MessengerProcessor,
  ],
})
export class ProcessorsModule {}
