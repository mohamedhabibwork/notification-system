import {
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { notifications, notificationBatches } from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  SendNotificationDto,
  SendBatchDto,
  SendChunkDto,
} from './dto/send-notification.dto';
import { NotificationValidatorService } from './services/notification-validator.service';
import { UserEnrichmentService } from './services/user-enrichment.service';
import { NotificationProcessorService } from './services/notification-processor.service';
import { EventProducerService } from '../events/event-producer.service';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly validator: NotificationValidatorService,
    private readonly enrichment: UserEnrichmentService,
    private readonly processor: NotificationProcessorService,
    private readonly eventProducer: EventProducerService,
  ) {}

  async sendSingle(dto: SendNotificationDto, createdBy: string) {
    // Validate request
    this.validator.validateNotificationRequest(dto);

    // Enrich recipient data from User Service
    const enrichedRecipient = await this.enrichment.enrichRecipient(
      dto.recipient,
      dto.tenantId,
    );
    dto.recipient = enrichedRecipient;

    // Re-validate after enrichment
    this.validator.validateNotificationRequest(dto);

    // Process and queue notification
    const notification = await this.processor.processSingleNotification(
      dto,
      createdBy,
    );

    // Publish event
    await this.eventProducer.publishNotificationEvent({
      eventId: notification.uuid,
      eventType: 'notification.queued' as any,
      timestamp: Date.now(),
      notificationId: notification.id,
      tenantId: dto.tenantId,
      channel: notification.channel,
      recipientUserId: notification.recipientUserId,
    });

    return {
      id: notification.id,
      uuid: notification.uuid,
      status: 'queued',
      message: 'Notification queued successfully',
    };
  }

  async sendBatch(dto: SendBatchDto, createdBy: string) {
    // Create batch
    const batch = await this.processor.createBatch(
      createdBy,
      dto.totalExpected,
    );

    // Process notifications
    const results = [];
    for (const notifDto of dto.notifications) {
      this.validator.validateNotificationRequest(notifDto);
      const enrichedRecipient = await this.enrichment.enrichRecipient(
        notifDto.recipient,
        notifDto.tenantId,
      );
      notifDto.recipient = enrichedRecipient;

      const notification = await this.processor.processSingleNotification(
        notifDto,
        createdBy,
        batch.batchId,
      );
      results.push(notification);
    }

    // Update batch stats
    await this.processor.updateBatchStats(batch.batchId);

    return {
      batchId: batch.batchId,
      batchToken: batch.batchToken,
      chunkProcessed: results.length,
      totalProcessed: results.length,
      message: 'Batch created and first chunk queued',
    };
  }

  async sendChunk(dto: SendChunkDto, createdBy: string) {
    // Verify batch exists and token matches
    const [batch] = await this.db
      .select()
      .from(notificationBatches)
      .where(eq(notificationBatches.batchId, dto.batchId));

    if (!batch) {
      throw new NotFoundException(`Batch ${dto.batchId} not found`);
    }

    if (batch.batchToken !== dto.batchToken) {
      throw new UnauthorizedException('Invalid batch token');
    }

    // Process chunk
    const results = [];
    for (const notifDto of dto.notifications) {
      this.validator.validateNotificationRequest(notifDto);
      const enrichedRecipient = await this.enrichment.enrichRecipient(
        notifDto.recipient,
        notifDto.tenantId,
      );
      notifDto.recipient = enrichedRecipient;

      const notification = await this.processor.processSingleNotification(
        notifDto,
        createdBy,
        batch.id,
      );
      results.push(notification);
    }

    // Update batch stats
    await this.processor.updateBatchStats(dto.batchId);

    return {
      batchId: dto.batchId,
      chunkProcessed: results.length,
      message: 'Chunk processed successfully',
    };
  }

  async getBatchStatus(batchId: string) {
    const [batch] = await this.db
      .select()
      .from(notificationBatches)
      .where(eq(notificationBatches.batchId, batchId as any));

    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    return {
      batchId: batch.batchId,
      statusId: batch.statusId,
      totalExpected: batch.totalExpected,
      totalSent: batch.totalSent,
      totalDelivered: batch.totalDelivered,
      totalFailed: batch.totalFailed,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  }

  async getBatchNotifications(batchId: string, limit = 100, offset = 0) {
    const notifs = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.batchId, parseInt(batchId, 10)))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(notifications.createdAt));

    return notifs;
  }

  async findAll(tenantId?: number, limit = 50, offset = 0) {
    let query = this.db.select().from(notifications);

    if (tenantId) {
      query = query.where(eq(notifications.tenantId, tenantId)) as any;
    }

    const results = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(notifications.createdAt));

    return results;
  }

  async findOne(id: number, tenantId?: number) {
    const conditions = tenantId
      ? and(eq(notifications.id, id), eq(notifications.tenantId, tenantId))
      : eq(notifications.id, id);

    const [notification] = await this.db
      .select()
      .from(notifications)
      .where(conditions);

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }
}
