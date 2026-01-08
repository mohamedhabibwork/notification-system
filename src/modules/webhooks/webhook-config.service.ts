import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import {
  webhookConfigurations,
  webhookDeliveryLogs,
} from '../../database/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import {
  CreateWebhookConfigDto,
  UpdateWebhookConfigDto,
} from './dto/webhook-config.dto';
import { EncryptionService } from '../../common/services/encryption.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookConfigService {
  private readonly logger = new Logger(WebhookConfigService.name);
  private configCache = new Map<number, any>();

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(
    createDto: CreateWebhookConfigDto,
    createdBy: string,
  ): Promise<any> {
    // Validate webhook URL
    await this.validateWebhookUrl(createDto.webhookUrl);

    // Encrypt webhook secret if provided
    let encryptedSecret: string | undefined;
    if (createDto.webhookSecret) {
      encryptedSecret = this.encryptionService.encrypt(createDto.webhookSecret);
    } else {
      // Generate a secure random secret
      const generatedSecret = this.generateWebhookSecret();
      encryptedSecret = this.encryptionService.encrypt(generatedSecret);
    }

    const [config] = await this.db
      .insert(webhookConfigurations)
      .values({
        ...createDto,
        webhookSecret: encryptedSecret,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    // Clear cache for this tenant
    this.invalidateCache(createDto.tenantId);

    return this.mapToResponse(config);
  }

  async findByTenant(tenantId: number): Promise<any[]> {
    const configs = await this.db
      .select()
      .from(webhookConfigurations)
      .where(
        and(
          eq(webhookConfigurations.tenantId, tenantId),
          isNull(webhookConfigurations.deletedAt),
        ),
      );

    return configs.map((config) => this.mapToResponse(config));
  }

  async findOne(id: number, tenantId: number): Promise<any> {
    const [config] = await this.db
      .select()
      .from(webhookConfigurations)
      .where(
        and(
          eq(webhookConfigurations.id, id),
          eq(webhookConfigurations.tenantId, tenantId),
          isNull(webhookConfigurations.deletedAt),
        ),
      );

    if (!config) {
      throw new NotFoundException(
        `Webhook configuration with ID ${id} not found`,
      );
    }

    return this.mapToResponse(config);
  }

  async findActiveByTenant(tenantId: number): Promise<any | null> {
    // Check cache first
    if (this.configCache.has(tenantId)) {
      return this.configCache.get(tenantId);
    }

    const [config] = await this.db
      .select()
      .from(webhookConfigurations)
      .where(
        and(
          eq(webhookConfigurations.tenantId, tenantId),
          eq(webhookConfigurations.isActive, true),
          isNull(webhookConfigurations.deletedAt),
        ),
      )
      .limit(1);

    if (config) {
      const decryptedConfig = this.mapToResponse(config, true);
      this.configCache.set(tenantId, decryptedConfig);
      return decryptedConfig;
    }

    return null;
  }

  async update(
    id: number,
    updateDto: UpdateWebhookConfigDto,
    updatedBy: string,
    tenantId: number,
  ): Promise<any> {
    // Validate URL if provided
    if (updateDto.webhookUrl) {
      await this.validateWebhookUrl(updateDto.webhookUrl);
    }

    // Encrypt new secret if provided
    let encryptedSecret: string | undefined;
    if (updateDto.webhookSecret) {
      encryptedSecret = this.encryptionService.encrypt(updateDto.webhookSecret);
    }

    const [updated] = await this.db
      .update(webhookConfigurations)
      .set({
        ...updateDto,
        ...(encryptedSecret && { webhookSecret: encryptedSecret }),
        updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(webhookConfigurations.id, id),
          eq(webhookConfigurations.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundException(
        `Webhook configuration with ID ${id} not found`,
      );
    }

    // Clear cache
    this.invalidateCache(tenantId);

    return this.mapToResponse(updated);
  }

  async delete(id: number, deletedBy: string, tenantId: number): Promise<any> {
    const [deleted] = await this.db
      .update(webhookConfigurations)
      .set({
        deletedAt: new Date(),
        updatedBy: deletedBy,
      })
      .where(
        and(
          eq(webhookConfigurations.id, id),
          eq(webhookConfigurations.tenantId, tenantId),
        ),
      )
      .returning();

    if (!deleted) {
      throw new NotFoundException(
        `Webhook configuration with ID ${id} not found`,
      );
    }

    // Clear cache
    this.invalidateCache(tenantId);

    return this.mapToResponse(deleted);
  }

  async getWebhookUrlForEvent(
    tenantId: number,
    eventType: string,
  ): Promise<string | null> {
    const config = await this.findActiveByTenant(tenantId);

    if (!config) {
      return null;
    }

    // Check if event is enabled
    if (!config.enabledEvents || !config.enabledEvents.includes(eventType)) {
      return null;
    }

    // Check for event-specific override
    if (config.eventOverrides && config.eventOverrides[eventType]) {
      return config.eventOverrides[eventType];
    }

    return config.webhookUrl;
  }

  async logDelivery(
    webhookConfigId: number,
    notificationId: number | null,
    eventType: string,
    webhookUrl: string,
    requestPayload: any,
    requestHeaders: any,
    responseStatusCode: number | null,
    responseBody: string | null,
    responseTime: number,
    attemptNumber: number,
    success: 'success' | 'failed' | 'pending',
    errorMessage: string | null,
  ): Promise<void> {
    try {
      await this.db.insert(webhookDeliveryLogs).values({
        webhookConfigId,
        ...(notificationId && { notificationId }),
        eventType,
        webhookUrl,
        requestPayload,
        requestHeaders,
        ...(responseStatusCode && { responseStatusCode }),
        ...(responseBody && { responseBody }),
        responseTime,
        attemptNumber,
        success,
        ...(errorMessage && { errorMessage }),
      });
    } catch (error) {
      this.logger.error(
        `Failed to log webhook delivery: ${error.message}`,
        error.stack,
      );
    }
  }

  async getDeliveryLogs(
    tenantId: number,
    limit = 100,
    offset = 0,
  ): Promise<any[]> {
    const configs = await this.findByTenant(tenantId);
    const configIds = configs.map((c) => c.id);

    if (configIds.length === 0) {
      return [];
    }

    const logs = await this.db
      .select()
      .from(webhookDeliveryLogs)
      .where(
        eq(webhookDeliveryLogs.webhookConfigId, configIds[0]), // Simplified for now
      )
      .orderBy(desc(webhookDeliveryLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return logs;
  }

  private mapToResponse(config: any, includeSecret = false): any {
    return {
      id: config.id,
      uuid: config.uuid,
      tenantId: config.tenantId,
      name: config.name,
      webhookUrl: config.webhookUrl,
      webhookSecret:
        includeSecret && config.webhookSecret
          ? this.encryptionService.decrypt(config.webhookSecret)
          : undefined,
      isActive: config.isActive,
      retryConfig: config.retryConfig,
      eventOverrides: config.eventOverrides,
      headers: config.headers,
      enabledEvents: config.enabledEvents,
      timeoutMs: config.timeoutMs,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  private async validateWebhookUrl(url: string): Promise<void> {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new BadRequestException('Webhook URL must use HTTP or HTTPS');
      }
      if (
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1'
      ) {
        throw new BadRequestException('Localhost webhooks are not allowed');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid webhook URL format');
    }
  }

  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private invalidateCache(tenantId: number): void {
    this.configCache.delete(tenantId);
  }

  getAvailableEvents(): Array<{ eventType: string; description: string }> {
    return [
      {
        eventType: 'notification.queued',
        description: 'Notification has been queued for processing',
      },
      {
        eventType: 'notification.sent',
        description: 'Notification has been sent to the provider',
      },
      {
        eventType: 'notification.delivered',
        description: 'Notification has been delivered to the recipient',
      },
      {
        eventType: 'notification.failed',
        description: 'Notification delivery failed',
      },
      {
        eventType: 'notification.read',
        description: 'Notification has been read by the recipient',
      },
      {
        eventType: 'template.created',
        description: 'A new template has been created',
      },
      {
        eventType: 'template.updated',
        description: 'A template has been updated',
      },
      {
        eventType: 'tenant.created',
        description: 'A new tenant has been created',
      },
    ];
  }
}
