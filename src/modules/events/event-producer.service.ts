import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { OutgoingNotificationEvent } from './dto/outgoing-events.dto';

@Injectable()
export class EventProducerService implements OnModuleInit {
  private readonly logger = new Logger(EventProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private readonly topics: Record<string, string>;

  constructor(private readonly configService: ConfigService) {
    const brokers = this.configService.get<string[]>('kafka.brokers');
    const clientId = this.configService.get<string>('kafka.clientId');

    if (!brokers || brokers.length === 0) {
      throw new Error(
        'Kafka brokers are required. Set kafka.brokers in configuration.',
      );
    }
    if (!clientId) {
      throw new Error(
        'Kafka client ID is required. Set kafka.clientId in configuration.',
      );
    }

    this.kafka = new Kafka({
      clientId,
      brokers,
    });

    this.producer = this.kafka.producer();

    const notificationQueued = this.configService.get<string>(
      'kafka.topics.notificationQueued',
    );
    const notificationSent = this.configService.get<string>(
      'kafka.topics.notificationSent',
    );
    const notificationDelivered = this.configService.get<string>(
      'kafka.topics.notificationDelivered',
    );
    const notificationFailed = this.configService.get<string>(
      'kafka.topics.notificationFailed',
    );
    const notificationRead = this.configService.get<string>(
      'kafka.topics.notificationRead',
    );

    if (
      !notificationQueued ||
      !notificationSent ||
      !notificationDelivered ||
      !notificationFailed ||
      !notificationRead
    ) {
      throw new Error(
        'All Kafka topics are required. Set kafka.topics.* in configuration.',
      );
    }

    this.topics = {
      notificationQueued,
      notificationSent,
      notificationDelivered,
      notificationFailed,
      notificationRead,
    };
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka Producer connected successfully');
    } catch (error) {
      this.logger.error(`Failed to connect Kafka Producer: ${error.message}`);
    }
  }

  async publishNotificationEvent(
    event: OutgoingNotificationEvent,
  ): Promise<void> {
    const topic = this.getTopicForEventType(event.eventType);

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.notificationId.toString(),
            value: JSON.stringify(event),
            headers: {
              eventId: event.eventId,
              eventType: event.eventType,
              tenantId: event.tenantId.toString(),
            },
          },
        ],
      });

      this.logger.debug(
        `Published event ${event.eventType} for notification ${event.notificationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${event.eventType}: ${error.message}`,
      );
      throw error;
    }
  }

  private getTopicForEventType(eventType: string): string {
    switch (eventType) {
      case 'notification.queued':
        return this.topics.notificationQueued;
      case 'notification.sent':
        return this.topics.notificationSent;
      case 'notification.delivered':
        return this.topics.notificationDelivered;
      case 'notification.failed':
        return this.topics.notificationFailed;
      case 'notification.read':
        return this.topics.notificationRead;
      default:
        return this.topics.notificationQueued;
    }
  }

  async disconnect() {
    await this.producer.disconnect();
    this.logger.log('Kafka Producer disconnected');
  }
}
