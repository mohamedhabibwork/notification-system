/**
 * Database-Inbox Provider Implementation
 *
 * Stores notifications in the database for in-app notification inbox functionality.
 * Provides reliable storage and supports user notification queries, read/unread status, etc.
 */

import { Inject } from '@nestjs/common';
import { BaseProvider } from '../../base/base.provider';
import { DatabaseInboxCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';
import type { DrizzleDB } from '../../../../database/drizzle.module';
import { DRIZZLE_ORM } from '../../../../database/drizzle.module';
import {
  notifications,
  lookups,
  lookupTypes,
} from '../../../../database/schema';
import { eq, and } from 'drizzle-orm';

export class DatabaseInboxProvider extends BaseProvider<DatabaseInboxCredentials> {
  private db: DrizzleDB | null = null;

  constructor(credentials: DatabaseInboxCredentials) {
    super(credentials);
  }

  /**
   * Set database connection (injected by registry)
   */
  setDatabase(db: DrizzleDB): void {
    this.db = db;
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      if (!this.db) {
        throw new Error('Database connection not initialized');
      }

      this.logSendAttempt(payload);

      const notificationData = await this.formatPayload(payload);

      // Insert notification into database
      const [inserted] = await this.db
        .insert(notifications)
        .values(notificationData)
        .returning();

      const result: ProviderSendResult = {
        success: true,
        messageId: inserted.id.toString(),
        timestamp: new Date(),
        metadata: {
          notificationId: inserted.id,
          uuid: inserted.uuid,
          tenantId: inserted.tenantId,
          channel: inserted.channel,
        },
      };

      this.logSendSuccess(result);
      return result;
    } catch (error) {
      this.logger.error(
        `Database-Inbox provider failed: ${(error as Error).message}`,
      );

      return {
        success: false,
        timestamp: new Date(),
        error: this.handleError(error as Error),
      };
    }
  }

  async validate(): Promise<boolean> {
    if (!this.validateCredentials()) {
      return false;
    }

    try {
      // Validate database connection
      if (!this.db) {
        this.logger.warn('Database connection not set');
        return false;
      }

      // Try a simple query to verify connection
      await this.db.select().from(notifications).limit(1);
      return true;
    } catch (error) {
      this.logger.error(
        `Database-Inbox validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected async formatPayload(payload: ProviderSendPayload): Promise<any> {
    if (!this.db) {
      throw new Error('Database connection not initialized');
    }

    const userId = payload.recipient.userId;
    if (!userId) {
      throw new Error('userId is required for database-inbox provider');
    }

    // Get tenant ID from payload metadata
    const tenantId = payload.options?.tenantId as number;
    if (!tenantId) {
      throw new Error('tenantId is required for database-inbox provider');
    }

    // Get status lookup ID for 'sent'
    // First get the lookupType for notification_status
    const [statusType] = await this.db
      .select()
      .from(lookupTypes)
      .where(eq(lookupTypes.typeName, 'notification_status'))
      .limit(1);

    if (!statusType) {
      throw new Error('Lookup type not found for notification_status');
    }

    const [statusLookup] = await this.db
      .select()
      .from(lookups)
      .where(
        and(eq(lookups.lookupTypeId, statusType.id), eq(lookups.code, 'sent')),
      )
      .limit(1);

    if (!statusLookup) {
      throw new Error('Status lookup not found for notification_status:sent');
    }

    // Get priority lookup if specified
    let priorityId: number | undefined;
    const priority = payload.options?.priority as string;
    if (priority) {
      const [priorityType] = await this.db
        .select()
        .from(lookupTypes)
        .where(eq(lookupTypes.typeName, 'notification_priority'))
        .limit(1);

      if (priorityType) {
        const [priorityLookup] = await this.db
          .select()
          .from(lookups)
          .where(
            and(
              eq(lookups.lookupTypeId, priorityType.id),
              eq(lookups.code, priority),
            ),
          )
          .limit(1);

        if (priorityLookup) {
          priorityId = priorityLookup.id;
        }
      }
    }

    // Calculate expiry date if retentionDays is set
    let expiresAt: Date | undefined;
    const retentionDays = this.credentials.retentionDays || 90;
    if (retentionDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + retentionDays);
    }

    // Build notification record
    const notificationRecord = {
      tenantId,
      channel: 'database',
      recipientUserId: userId,
      recipientEmail: payload.recipient.email,
      recipientPhone: payload.recipient.phone,
      recipientMetadata: payload.recipient.metadata,
      subject: payload.content.subject,
      body: payload.content.body,
      htmlBody: payload.content.htmlBody,
      statusId: statusLookup.id,
      priorityId,
      sentAt: new Date(),
      metadata: {
        ...payload.content.data,
        ...payload.options,
        expiresAt: expiresAt?.toISOString(),
        provider: 'database-inbox',
      },
      createdBy: 'system',
      updatedBy: 'system',
    };

    return notificationRecord;
  }

  getRequiredCredentials(): string[] {
    // Database provider doesn't require external credentials
    return [];
  }

  getChannel(): ChannelType {
    return 'database';
  }

  getProviderName(): string {
    return 'database-inbox';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Database Inbox',
      description:
        'Store notifications in database for in-app inbox and user notification center',
      version: '1.0.0',
      supportedFeatures: [
        'persistent-storage',
        'user-inbox',
        'read-status',
        'notification-history',
        'tenant-isolation',
        'metadata-storage',
        'expiry-management',
        'priority-support',
      ],
      rateLimit: {
        maxPerSecond: 1000, // Database can handle high throughput
        maxPerDay: 10000000, // 10M per day
      },
    };
  }

  protected extractErrorCode(error: Error): string {
    if (error.message.includes('connection')) {
      return 'DATABASE_CONNECTION_ERROR';
    }
    if (error.message.includes('constraint')) {
      return 'DATABASE_CONSTRAINT_ERROR';
    }
    if (error.message.includes('not found')) {
      return 'DATABASE_LOOKUP_ERROR';
    }
    return 'DATABASE_ERROR';
  }

  protected isRetryableError(error: Error): boolean {
    // Connection errors and timeouts are retryable
    const retryablePatterns = [
      'connection',
      'timeout',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'deadlock',
    ];

    return retryablePatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern.toLowerCase()),
    );
  }
}
