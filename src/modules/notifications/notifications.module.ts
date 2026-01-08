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
import { MultiNotificationService } from './services/multi-notification.service';
import { TimezoneService } from './services/timezone.service';
import { ProviderFallbackService } from './services/provider-fallback.service';
import { TemplatesModule } from '../templates/templates.module';
import { UserServiceModule } from '../user-service/user-service.module';
import { EventsModule } from '../events/events.module';
import { ProviderModule } from '../../common/providers/provider.module';

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
    ProviderModule,
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [
    NotificationsService,
    NotificationValidatorService,
    UserEnrichmentService,
    NotificationProcessorService,
    MultiNotificationService,
    TimezoneService,
    ProviderFallbackService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
