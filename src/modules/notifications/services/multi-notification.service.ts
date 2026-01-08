import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  SendMultiDto,
  SendMultiResultDto,
  UserChannelResult,
  ProviderChainDto,
} from '../dto/send-multi.dto';
import { ChannelResult } from '../dto/broadcast-notification.dto';
import {
  SendNotificationDto,
  NotificationChannel,
} from '../dto/send-notification.dto';
import { NotificationValidatorService } from './notification-validator.service';
import { UserEnrichmentService } from './user-enrichment.service';
import { TimezoneService } from './timezone.service';
import { ProviderFallbackService } from './provider-fallback.service';
import { NotificationProcessorService } from './notification-processor.service';
import { EventProducerService } from '../../events/event-producer.service';
import { NotificationEventType } from '../../events/dto/outgoing-events.dto';
import { DRIZZLE_ORM } from '../../../database/drizzle.module';
import type { DrizzleDB } from '../../../database/drizzle.module';
import { notifications, Notification } from '../../../database/schema';

@Injectable()
export class MultiNotificationService {
  private readonly logger = new Logger(MultiNotificationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly validator: NotificationValidatorService,
    private readonly enrichment: UserEnrichmentService,
    private readonly timezoneService: TimezoneService,
    private readonly providerFallback: ProviderFallbackService,
    private readonly processor: NotificationProcessorService,
    private readonly eventProducer: EventProducerService,
  ) {}

  /**
   * Send notifications to multiple users across multiple channels
   */
  async sendMulti(
    dto: SendMultiDto,
    createdBy: string,
  ): Promise<SendMultiResultDto> {
    const timestamp = new Date();
    const multiNotificationId = `multi-${timestamp.getTime()}`;

    this.logger.log(
      `Processing multi-notification for ${dto.recipients.length} users across ${dto.channels.length} channels`,
    );

    // Step 1: Validate request
    this.validateMultiRequest(dto);

    // Step 2: Enrich all users in parallel
    const enrichedRecipients = await this.enrichment.enrichMultipleRecipients(
      dto.recipients,
      dto.tenantId,
    );

    // Step 3: Resolve timezones for each user (if scheduled)
    let timezoneMap: Map<string, string> | undefined;
    if (dto.scheduledAt && dto.options?.timezoneOptions) {
      const userIds = enrichedRecipients
        .map((r) => r.recipientUserId)
        .filter((id): id is string => !!id);

      timezoneMap = await this.timezoneService.resolveMultipleUserTimezones(
        userIds,
        dto.tenantId,
        dto.options.timezoneOptions,
      );
    }

    // Step 4: Process users (parallel or sequential)
    const userResults: UserChannelResult[] = [];

    if (dto.options?.parallelUsers !== false) {
      // Parallel processing (default)
      const userPromises = enrichedRecipients.map((recipient) =>
        this.processUserNotifications(
          recipient,
          dto,
          createdBy,
          timezoneMap,
          multiNotificationId,
        ),
      );

      const results = await Promise.allSettled(userPromises);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          userResults.push(result.value);
        } else {
          this.logger.error(
            `Failed to process user notifications:`,
            result.reason,
          );
          // Create error result for failed user
          userResults.push({
            userId: 'unknown',
            channels: [],
            successCount: 0,
            failureCount: dto.channels.length,
          });
        }
      }
    } else {
      // Sequential processing
      for (const recipient of enrichedRecipients) {
        try {
          const result = await this.processUserNotifications(
            recipient,
            dto,
            createdBy,
            timezoneMap,
            multiNotificationId,
          );
          userResults.push(result);
        } catch (error) {
          this.logger.error(
            `Failed to process user ${recipient.recipientUserId}:`,
            error,
          );
          userResults.push({
            userId: recipient.recipientUserId || 'unknown',
            channels: [],
            successCount: 0,
            failureCount: dto.channels.length,
          });
        }
      }
    }

    // Step 5: Calculate overall success
    const overallSuccess = userResults.some((ur) => ur.successCount > 0);

    return {
      success: overallSuccess,
      totalUsers: dto.recipients.length,
      totalChannels: dto.channels.length,
      userResults,
      timestamp,
      metadata: {
        multiNotificationId,
        tenantId: dto.tenantId,
        ...dto.metadata,
      },
    };
  }

  /**
   * Process notifications for a single user across multiple channels
   */
  private async processUserNotifications(
    recipient: any,
    dto: SendMultiDto,
    createdBy: string,
    timezoneMap?: Map<string, string>,
    multiNotificationId?: string,
  ): Promise<UserChannelResult> {
    const userId = recipient.recipientUserId || 'unknown';
    const channelResults: ChannelResult[] = [];

    // Resolve timezone for this user
    let timezone: string | undefined;
    let scheduledAt: Date | undefined;

    if (dto.scheduledAt && timezoneMap && userId !== 'unknown') {
      timezone = timezoneMap.get(userId);
      if (timezone) {
        scheduledAt = this.timezoneService.calculateScheduledTime(
          dto.scheduledAt,
          timezone,
        );
      }
    }

    // Process each channel
    const channelPromises = dto.channels.map(async (channel) => {
      return await this.processSingleChannelForUser(
        recipient,
        channel,
        dto,
        createdBy,
        scheduledAt,
        multiNotificationId,
      );
    });

    // Execute channels based on options
    if (dto.options?.stopOnFirstChannelSuccess) {
      // Race mode: stop after first success
      try {
        const firstSuccess = await Promise.race(channelPromises);
        channelResults.push(firstSuccess);
      } catch (error) {
        // If all fail, collect all results
        const settledResults = await Promise.allSettled(channelPromises);
        channelResults.push(
          ...settledResults
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value),
        );
      }
    } else {
      // Parallel mode: send to all channels
      const settledResults = await Promise.allSettled(channelPromises);
      channelResults.push(
        ...settledResults
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value),
      );
    }

    // Calculate success/failure counts
    const successCount = channelResults.filter((r) => r.success).length;
    const failureCount = channelResults.filter((r) => !r.success).length;

    // Check requireAllChannelsSuccess option
    if (dto.options?.requireAllChannelsSuccess && failureCount > 0) {
      this.logger.warn(
        `User ${userId}: ${failureCount} out of ${channelResults.length} channels failed (requireAllChannelsSuccess is true)`,
      );
    }

    return {
      userId,
      channels: channelResults,
      successCount,
      failureCount,
      timezone,
      scheduledAt,
    };
  }

  /**
   * Process a single channel for a single user
   */
  private async processSingleChannelForUser(
    recipient: any,
    channel: NotificationChannel,
    dto: SendMultiDto,
    createdBy: string,
    scheduledAt?: Date,
    multiNotificationId?: string,
  ): Promise<ChannelResult> {
    const timestamp = new Date();

    try {
      // Build notification DTO for this channel
      const notificationDto: SendNotificationDto = {
        tenantId: dto.tenantId,
        channel,
        recipient,
        templateId: dto.templateId,
        templateCode: dto.templateCode,
        templateVariables: dto.templateVariables,
        directContent: dto.directContent,
        scheduledAt: scheduledAt?.toISOString() || dto.scheduledAt,
        metadata: {
          ...dto.metadata,
          multiNotificationId,
        },
      };

      // Validate channel-specific request
      this.validator.validateNotificationRequest(notificationDto);

      // Process notification for this channel
      const notification = await this.processor.processSingleNotification(
        notificationDto,
        createdBy,
      );

      // If provider chain is specified, handle fallback
      let providerUsed = 'default';
      if (dto.options?.providerChains?.[channel]) {
        const providerChain = dto.options.providerChains[channel];
        // Note: Provider fallback happens in the worker, not here
        // We just store the provider chain info in metadata
        await this.updateNotificationWithProviderChain(
          notification.id,
          providerChain,
        );
        providerUsed = providerChain.primary;
      }

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
        channel,
        success: true,
        messageId: notification.id.toString(),
        provider: providerUsed,
        timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Error processing channel ${channel} for user ${recipient.recipientUserId}:`,
        error,
      );

      return {
        channel,
        success: false,
        error: {
          code: (error as Error).name || 'CHANNEL_ERROR',
          message: (error as Error).message || 'Unknown error',
        },
        timestamp,
      };
    }
  }

  /**
   * Update notification with provider chain information
   */
  private async updateNotificationWithProviderChain(
    notificationId: number,
    providerChain: ProviderChainDto,
  ): Promise<void> {
    try {
      const metadata = {
        providerChain: {
          primary: providerChain.primary,
          fallbacks: providerChain.fallbacks || [],
        },
      };

      // Note: This would require a metadata field update
      // For now, we'll skip this or implement if database schema is updated
      this.logger.debug(
        `Would update notification ${notificationId} with provider chain`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating notification with provider chain:`,
        error,
      );
    }
  }

  /**
   * Validate multi-notification request
   */
  private validateMultiRequest(dto: SendMultiDto): void {
    // Ensure at least one recipient
    if (!dto.recipients || dto.recipients.length === 0) {
      throw new Error('At least one recipient must be specified');
    }

    // Ensure at least one channel
    if (!dto.channels || dto.channels.length === 0) {
      throw new Error('At least one channel must be specified');
    }

    // Validate timezone options if provided
    if (dto.options?.timezoneOptions) {
      const tzOptions = dto.options.timezoneOptions;
      if (tzOptions.mode === 'client' && !tzOptions.timezone) {
        throw new Error('Timezone must be provided when mode is "client"');
      }
    }

    // Validate provider chains if provided
    if (dto.options?.providerChains) {
      for (const [channel, providerChain] of Object.entries(
        dto.options.providerChains,
      )) {
        if (!this.providerFallback.validateProviderChain(providerChain)) {
          throw new Error(`Invalid provider chain for channel ${channel}`);
        }
      }
    }

    // Validate conflicting options
    if (
      dto.options?.stopOnFirstChannelSuccess &&
      dto.options?.requireAllChannelsSuccess
    ) {
      throw new Error(
        'stopOnFirstChannelSuccess and requireAllChannelsSuccess cannot both be true',
      );
    }
  }
}
