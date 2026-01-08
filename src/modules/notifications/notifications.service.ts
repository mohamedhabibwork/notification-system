import {
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import {
  notifications,
  notificationBatches,
  Notification,
} from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  SendNotificationDto,
  SendBatchDto,
  SendChunkDto,
} from './dto/send-notification.dto';
import {
  BroadcastNotificationDto,
  BroadcastResultDto,
  ChannelResult,
} from './dto/broadcast-notification.dto';
import { SendMultiDto, SendMultiResultDto } from './dto/send-multi.dto';
import { NotificationValidatorService } from './services/notification-validator.service';
import { UserEnrichmentService } from './services/user-enrichment.service';
import { NotificationProcessorService } from './services/notification-processor.service';
import { MultiNotificationService } from './services/multi-notification.service';
import { EventProducerService } from '../events/event-producer.service';
import { NotificationEventType } from '../events/dto/outgoing-events.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly validator: NotificationValidatorService,
    private readonly enrichment: UserEnrichmentService,
    private readonly processor: NotificationProcessorService,
    private readonly multiNotification: MultiNotificationService,
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
    const notification: Notification =
      await this.processor.processSingleNotification(dto, createdBy);

    // Publish event
    await this.eventProducer.publishNotificationEvent({
      eventId: notification.uuid,
      eventType: NotificationEventType.QUEUED,
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

  /**
   * Send notification to multiple channels simultaneously
   */
  async sendBroadcast(
    dto: BroadcastNotificationDto,
    createdBy: string,
  ): Promise<BroadcastResultDto> {
    // Validate at least one channel is specified
    if (!dto.channels || dto.channels.length === 0) {
      throw new Error('At least one channel must be specified for broadcast');
    }

    // Enrich recipient data once (shared across all channels)
    const enrichedRecipient = await this.enrichment.enrichRecipient(
      dto.recipient,
      dto.tenantId,
    );

    const results: ChannelResult[] = [];
    const timestamp = new Date();

    // Create promises for all channels
    const channelPromises = dto.channels.map(async (channel) => {
      // Build notification DTO for this channel
      const notificationDto: SendNotificationDto = {
        tenantId: dto.tenantId,
        channel,
        recipient: enrichedRecipient,
        templateId: dto.templateId,
        templateCode: dto.templateCode,
        templateVariables: dto.templateVariables,
        directContent: dto.directContent,
        metadata: {
          ...dto.metadata,
          broadcastId: timestamp.getTime().toString(),
          provider: dto.options?.providers?.[channel],
        },
      };

      try {
        // Validate channel-specific request
        this.validator.validateNotificationRequest(notificationDto);

        // Process notification for this channel
        const notification = await this.processor.processSingleNotification(
          notificationDto,
          createdBy,
        );

        // Publish event
        await this.eventProducer.publishNotificationEvent({
          eventId: notification.uuid,
          eventType: NotificationEventType.QUEUED,
          timestamp: Date.now(),
          notificationId: notification.id,
          tenantId: dto.tenantId,
          channel: notification.channel,
          recipientUserId: notification.recipientUserId,
        });

        const channelResult: ChannelResult = {
          channel,
          success: true,
          messageId: notification.id.toString(),
          provider: (dto.metadata?.provider as string) || 'default',
          timestamp,
        };

        return channelResult;
      } catch (error) {
        const channelResult: ChannelResult = {
          channel,
          success: false,
          error: {
            code: (error as Error).name || 'BROADCAST_ERROR',
            message: (error as Error).message || 'Unknown error',
          },
          timestamp,
        };

        return channelResult;
      }
    });

    // Execute all channel sends
    if (dto.options?.stopOnFirstSuccess) {
      // Race mode: stop after first success
      try {
        const firstSuccess = await Promise.race(channelPromises);
        results.push(firstSuccess);
      } catch (error) {
        // If all fail, collect all results
        const settledResults = await Promise.allSettled(channelPromises);
        results.push(
          ...settledResults
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value),
        );
      }
    } else {
      // Parallel mode: send to all channels
      const settledResults = await Promise.allSettled(channelPromises);
      results.push(
        ...settledResults
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value),
      );
    }

    // Calculate statistics
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const overallSuccess = successCount > 0;

    // Check if requireAllSuccess option is set
    if (dto.options?.requireAllSuccess && failureCount > 0) {
      throw new Error(
        `Broadcast failed: ${failureCount} out of ${results.length} channels failed. Required all channels to succeed.`,
      );
    }

    return {
      success: overallSuccess,
      totalChannels: dto.channels.length,
      successCount,
      failureCount,
      results,
      timestamp,
      metadata: {
        broadcastId: timestamp.getTime().toString(),
        tenantId: dto.tenantId,
        recipientUserId: enrichedRecipient.recipientUserId,
      },
    };
  }

  /**
   * Send notifications to multiple users across multiple channels
   */
  async sendMulti(
    dto: SendMultiDto,
    createdBy: string,
  ): Promise<SendMultiResultDto> {
    return this.multiNotification.sendMulti(dto, createdBy);
  }
}
