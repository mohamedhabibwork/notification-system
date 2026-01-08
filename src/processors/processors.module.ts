import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './email.processor';
import { SmsProcessor } from './sms.processor';
import { FcmProcessor } from './fcm.processor';
import { WhatsAppProcessor } from './whatsapp.processor';
import { DatabaseProcessor } from './database.processor';
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
  ],
})
export class ProcessorsModule {}
