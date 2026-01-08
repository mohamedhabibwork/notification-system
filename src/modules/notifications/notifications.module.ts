import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  NotificationsController,
  AdminNotificationsController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationValidatorService } from './services/notification-validator.service';
import { UserEnrichmentService } from './services/user-enrichment.service';
import { NotificationProcessorService } from './services/notification-processor.service';
import { TemplatesModule } from '../templates/templates.module';
import { UserServiceModule } from '../user-service/user-service.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'sms' },
      { name: 'fcm' },
      { name: 'whatsapp' },
      { name: 'database' },
    ),
    TemplatesModule,
    UserServiceModule,
    EventsModule,
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [
    NotificationsService,
    NotificationValidatorService,
    UserEnrichmentService,
    NotificationProcessorService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
