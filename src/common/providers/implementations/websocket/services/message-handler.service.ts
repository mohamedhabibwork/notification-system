/**
 * WebSocket Message Handler Service
 *
 * Handles incoming WebSocket messages with configurable strategies:
 * - Callback: Forward to webhook URL
 * - Database: Store in notifications table
 * - Kafka: Publish to Kafka topic
 * - All: Execute all strategies concurrently
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DRIZZLE_ORM } from '../../../../../database/drizzle.module';
import type { DrizzleDB } from '../../../../../database/drizzle.module';
import { ExternalWebSocketCredentials } from '../../../interfaces/credentials.interface';
import { EventProducerService } from '../../../../../modules/events/event-producer.service';
import { notifications } from '../../../../../database/schema';
import { firstValueFrom } from 'rxjs';

export interface IncomingWebSocketMessage {
  event: string;
  data: any;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WebSocketMessageHandlerService {
  private readonly logger = new Logger(WebSocketMessageHandlerService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly eventProducer: EventProducerService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Handle incoming message based on configured strategy
   */
  async handleIncomingMessage(
    message: IncomingWebSocketMessage,
    credentials: ExternalWebSocketCredentials,
  ): Promise<void> {
    try {
      const strategy = credentials.messageHandling?.strategy || 'kafka';

      this.logger.log(
        `Handling incoming WebSocket message with strategy: ${strategy}`,
      );

      switch (strategy) {
        case 'callback':
          await this.forwardToCallback(message, credentials);
          break;
        case 'database':
          await this.storeInDatabase(message, credentials);
          break;
        case 'kafka':
          await this.publishToKafka(message, credentials);
          break;
        case 'all':
          await Promise.allSettled([
            this.forwardToCallback(message, credentials),
            this.storeInDatabase(message, credentials),
            this.publishToKafka(message, credentials),
          ]);
          break;
        default:
          this.logger.warn(`Unknown strategy: ${strategy}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle incoming message: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Forward message to callback webhook URL
   */
  private async forwardToCallback(
    message: IncomingWebSocketMessage,
    credentials: ExternalWebSocketCredentials,
  ): Promise<void> {
    if (!credentials.messageHandling?.callbackUrl) {
      this.logger.debug('No callback URL configured, skipping callback');
      return;
    }

    try {
      const payload = {
        event: message.event,
        data: message.data,
        timestamp: message.timestamp.toISOString(),
        metadata: message.metadata,
        source: {
          provider: 'websocket',
          url: credentials.url,
          protocol: credentials.protocol,
        },
      };

      await firstValueFrom(
        this.httpService.post(
          credentials.messageHandling.callbackUrl,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'NotificationSystem-WebSocket/1.0',
            },
            timeout: 10000,
          },
        ),
      );

      this.logger.log(
        `Successfully forwarded message to callback: ${credentials.messageHandling.callbackUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to forward to callback: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Store message in database
   */
  private async storeInDatabase(
    message: IncomingWebSocketMessage,
    credentials: ExternalWebSocketCredentials,
  ): Promise<void> {
    if (!credentials.messageHandling?.storeInDatabase) {
      this.logger.debug('Database storage not enabled, skipping');
      return;
    }

    try {
      // Store as a system notification
      await this.db.insert(notifications).values({
        tenantId: 1, // System tenant
        channel: 'websocket',
        recipientUserId: 'system',
        subject: `WebSocket: ${message.event}`,
        body: JSON.stringify(message.data),
        statusId: 1, // Assuming status ID 1 exists
        metadata: {
          event: message.event,
          timestamp: message.timestamp.toISOString(),
          source: {
            provider: 'websocket',
            url: credentials.url,
            protocol: credentials.protocol,
          },
          ...message.metadata,
        },
        createdBy: 'websocket-provider',
        updatedBy: 'websocket-provider',
      });

      this.logger.log('Successfully stored message in database');
    } catch (error) {
      this.logger.error(
        `Failed to store in database: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Publish message to Kafka
   */
  private async publishToKafka(
    message: IncomingWebSocketMessage,
    credentials: ExternalWebSocketCredentials,
  ): Promise<void> {
    if (!credentials.messageHandling?.publishToKafka) {
      this.logger.debug('Kafka publishing not enabled, skipping');
      return;
    }

    try {
      const topic =
        credentials.messageHandling.kafkaTopic || 'websocket.incoming.messages';

      await this.eventProducer.publishNotificationEvent({
        eventId: `ws-${Date.now()}`,
        eventType: 'WEBSOCKET_MESSAGE_RECEIVED' as any,
        timestamp: message.timestamp.getTime(),
        notificationId: 0,
        tenantId: 1,
        channel: 'websocket',
        recipientUserId: 'system',
        metadata: {
          event: message.event,
          data: message.data,
          incomingMetadata: message.metadata,
          source: {
            provider: 'websocket',
            url: credentials.url,
            protocol: credentials.protocol,
          },
        },
      });

      this.logger.log(
        `Successfully published message to Kafka topic: ${topic}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish to Kafka: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
