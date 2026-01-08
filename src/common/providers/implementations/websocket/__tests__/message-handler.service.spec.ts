/**
 * WebSocket Message Handler Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import {
  WebSocketMessageHandlerService,
  IncomingWebSocketMessage,
} from '../services/message-handler.service';
import { EventProducerService } from '../../../../../modules/events/event-producer.service';
import { DRIZZLE_ORM } from '../../../../../database/drizzle.module';
import { ExternalWebSocketCredentials } from '../../../interfaces/credentials.interface';
import { of } from 'rxjs';

describe('WebSocketMessageHandlerService', () => {
  let service: WebSocketMessageHandlerService;
  let mockDb: any;
  let mockEventProducer: jest.Mocked<EventProducerService>;
  let mockHttpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
      }),
    };

    mockEventProducer = {
      publishEvent: jest.fn(),
    } as any;

    mockHttpService = {
      post: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketMessageHandlerService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventProducerService, useValue: mockEventProducer },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<WebSocketMessageHandlerService>(
      WebSocketMessageHandlerService,
    );
  });

  describe('Callback Strategy', () => {
    it('should forward message to callback URL', async () => {
      const message: IncomingWebSocketMessage = {
        event: 'test:event',
        data: { test: 'data' },
        timestamp: new Date(),
      };

      const credentials: ExternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'external',
        protocol: 'ws',
        url: 'ws://test.com',
        enabled: true,
        messageHandling: {
          strategy: 'callback',
          callbackUrl: 'https://webhook.example.com/callback',
        },
      };

      mockHttpService.post.mockReturnValue(
        of({
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }) as any,
      );

      await service.handleIncomingMessage(message, credentials);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://webhook.example.com/callback',
        expect.objectContaining({
          event: 'test:event',
          data: { test: 'data' },
        }),
        expect.any(Object),
      );
    });

    it('should not call callback if URL not provided', async () => {
      const message: IncomingWebSocketMessage = {
        event: 'test:event',
        data: {},
        timestamp: new Date(),
      };

      const credentials: ExternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'external',
        protocol: 'ws',
        url: 'ws://test.com',
        enabled: true,
        messageHandling: {
          strategy: 'callback',
        },
      };

      await service.handleIncomingMessage(message, credentials);

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });
  });

  describe('Database Strategy', () => {
    it('should store message in database', async () => {
      const message: IncomingWebSocketMessage = {
        event: 'user:login',
        data: { userId: '123' },
        timestamp: new Date(),
      };

      const credentials: ExternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'external',
        protocol: 'socketio',
        url: 'wss://test.com',
        enabled: true,
        messageHandling: {
          strategy: 'database',
          storeInDatabase: true,
        },
      };

      await service.handleIncomingMessage(message, credentials);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('Kafka Strategy', () => {
    it('should publish message to Kafka', async () => {
      const message: IncomingWebSocketMessage = {
        event: 'data:sync',
        data: { records: 100 },
        timestamp: new Date(),
      };

      const credentials: ExternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'external',
        protocol: 'ws',
        url: 'ws://test.com',
        enabled: true,
        messageHandling: {
          strategy: 'kafka',
          publishToKafka: true,
          kafkaTopic: 'websocket.messages',
        },
      };

      await service.handleIncomingMessage(message, credentials);

      expect(mockEventProducer.publishEvent).toHaveBeenCalledWith(
        'websocket.messages',
        expect.objectContaining({
          eventType: 'WEBSOCKET_MESSAGE_RECEIVED',
        }),
      );
    });

    it('should use default topic if not specified', async () => {
      const message: IncomingWebSocketMessage = {
        event: 'test',
        data: {},
        timestamp: new Date(),
      };

      const credentials: ExternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'external',
        protocol: 'ws',
        url: 'ws://test.com',
        enabled: true,
        messageHandling: {
          strategy: 'kafka',
          publishToKafka: true,
        },
      };

      await service.handleIncomingMessage(message, credentials);

      expect(mockEventProducer.publishEvent).toHaveBeenCalledWith(
        'websocket.incoming.messages',
        expect.any(Object),
      );
    });
  });

  describe('All Strategy', () => {
    it('should execute all strategies concurrently', async () => {
      const message: IncomingWebSocketMessage = {
        event: 'multi:event',
        data: { test: 'data' },
        timestamp: new Date(),
      };

      const credentials: ExternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'external',
        protocol: 'socketio',
        url: 'wss://test.com',
        enabled: true,
        messageHandling: {
          strategy: 'all',
          callbackUrl: 'https://webhook.example.com/callback',
          storeInDatabase: true,
          publishToKafka: true,
          kafkaTopic: 'websocket.all',
        },
      };

      mockHttpService.post.mockReturnValue(
        of({
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }) as any,
      );

      await service.handleIncomingMessage(message, credentials);

      expect(mockHttpService.post).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockEventProducer.publishEvent).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw error on invalid strategy', async () => {
      const message: IncomingWebSocketMessage = {
        event: 'test',
        data: {},
        timestamp: new Date(),
      };

      const credentials: any = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'external',
        protocol: 'ws',
        url: 'ws://test.com',
        enabled: true,
        messageHandling: {
          strategy: 'invalid',
        },
      };

      await expect(
        service.handleIncomingMessage(message, credentials),
      ).rejects.toThrow();
    });
  });
});
