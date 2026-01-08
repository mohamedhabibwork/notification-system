import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { EventType } from './dto/incoming-events.dto';

@Injectable()
export class EventConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private readonly topics: string[];

  constructor(private readonly configService: ConfigService) {
    const brokers = this.configService.get<string[]>('kafka.brokers');
    const clientId = this.configService.get<string>('kafka.clientId');
    const consumerGroupId = this.configService.get<string>(
      'kafka.consumerGroupId',
    );

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
    if (!consumerGroupId) {
      throw new Error(
        'Kafka consumer group ID is required. Set kafka.consumerGroupId in configuration.',
      );
    }

    this.kafka = new Kafka({
      clientId,
      brokers,
    });

    this.consumer = this.kafka.consumer({ groupId: consumerGroupId });

    // Topics to consume
    const topics = [
      this.configService.get<string>('kafka.topics.orderCreated'),
      this.configService.get<string>('kafka.topics.orderShipped'),
      this.configService.get<string>('kafka.topics.paymentCompleted'),
      this.configService.get<string>('kafka.topics.paymentFailed'),
      this.configService.get<string>('kafka.topics.userRegistered'),
      this.configService.get<string>('kafka.topics.userPasswordReset'),
    ].filter((topic): topic is string => topic !== undefined);

    if (topics.length === 0) {
      throw new Error('At least one Kafka topic is required.');
    }

    this.topics = topics;
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      this.logger.log('Kafka Consumer connected successfully');

      // Subscribe to all topics
      for (const topic of this.topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
        this.logger.log(`Subscribed to topic: ${topic}`);
      }

      // Start consuming
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.logger.log('Kafka Consumer started processing messages');
    } catch (error) {
      this.logger.error(`Failed to start Kafka Consumer: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.logger.log('Kafka Consumer disconnected');
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      if (!message.value) {
        this.logger.warn('Received message with null value, skipping');
        return;
      }
      const event = JSON.parse(message.value.toString());
      const eventType =
        message.headers?.eventType?.toString() || event.eventType;

      this.logger.debug(`Received event ${eventType} from topic ${topic}`);

      // Route to appropriate handler based on event type
      switch (eventType) {
        case EventType.ORDER_CREATED:
          await this.handleOrderCreated(event);
          break;
        case EventType.ORDER_SHIPPED:
          await this.handleOrderShipped(event);
          break;
        case EventType.PAYMENT_COMPLETED:
          await this.handlePaymentCompleted(event);
          break;
        case EventType.PAYMENT_FAILED:
          await this.handlePaymentFailed(event);
          break;
        case EventType.USER_REGISTERED:
          await this.handleUserRegistered(event);
          break;
        case EventType.USER_PASSWORD_RESET:
          await this.handleUserPasswordReset(event);
          break;
        default:
          this.logger.warn(`Unknown event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing message from ${topic}: ${error.message}`,
      );
      // Dead letter queue logic can be added here
    }
  }

  private async handleOrderCreated(event: any): Promise<void> {
    this.logger.debug(`Processing order.created event: ${event.orderId}`);
    // TODO: Trigger order confirmation notification
    // This will be implemented in the Notifications module
  }

  private async handleOrderShipped(event: any): Promise<void> {
    this.logger.debug(`Processing order.shipped event: ${event.orderId}`);
    // TODO: Trigger shipping notification
  }

  private async handlePaymentCompleted(event: any): Promise<void> {
    this.logger.debug(`Processing payment.completed event: ${event.paymentId}`);
    // TODO: Trigger payment receipt notification
  }

  private async handlePaymentFailed(event: any): Promise<void> {
    this.logger.debug(`Processing payment.failed event: ${event.paymentId}`);
    // TODO: Trigger payment failure alert
  }

  private async handleUserRegistered(event: any): Promise<void> {
    this.logger.debug(`Processing user.registered event: ${event.userId}`);
    // TODO: Trigger welcome notification
  }

  private async handleUserPasswordReset(event: any): Promise<void> {
    this.logger.debug(`Processing user.password-reset event: ${event.userId}`);
    // TODO: Trigger password reset notification
  }
}
