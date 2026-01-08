/**
 * WebSocket Provider Unit Tests
 *
 * Tests covering:
 * - Internal mode (NotificationGateway integration)
 * - External mode (ws and Socket.IO)
 * - Channel broadcasts
 * - Bidirectional communication
 * - Request-response pattern
 * - Authentication
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketProvider } from '../websocket.provider';
import { NotificationGateway } from '../../../../../gateways/notification.gateway';
import { WebSocketMessageHandlerService } from '../services/message-handler.service';
import {
  InternalWebSocketCredentials,
  ExternalWebSocketCredentials,
} from '../../../interfaces/credentials.interface';
import { ProviderSendPayload } from '../../../interfaces/provider.interface';

describe('WebSocketProvider', () => {
  let provider: WebSocketProvider;
  let mockGateway: jest.Mocked<NotificationGateway>;
  let mockMessageHandler: jest.Mocked<WebSocketMessageHandlerService>;

  beforeEach(() => {
    mockGateway = {
      sendNotificationToUser: jest.fn(),
      broadcastToChannel: jest.fn(),
    } as any;

    mockMessageHandler = {
      handleIncomingMessage: jest.fn(),
    } as any;
  });

  describe('Internal Mode', () => {
    beforeEach(() => {
      const credentials: InternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'internal',
        enabled: true,
      };

      provider = new WebSocketProvider(credentials);
      provider.setGateway(mockGateway);
      provider.setMessageHandler(mockMessageHandler);
    });

    it('should send notification to user', async () => {
      const payload: ProviderSendPayload = {
        recipient: {
          userId: 'user-123',
        },
        content: {
          subject: 'Test',
          body: 'Test message',
        },
        options: {},
      };

      const result = await provider.send(payload);

      expect(result.success).toBe(true);
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          subject: 'Test',
          body: 'Test message',
        }),
      );
    });

    it('should broadcast to channel', async () => {
      const payload: ProviderSendPayload = {
        recipient: {
          channel: 'alerts',
        },
        content: {
          subject: 'Alert',
          body: 'System alert',
        },
        options: {},
      };

      const result = await provider.send(payload);

      expect(result.success).toBe(true);
      expect(mockGateway.broadcastToChannel).toHaveBeenCalledWith(
        'alerts',
        expect.objectContaining({
          subject: 'Alert',
          body: 'System alert',
        }),
      );
    });

    it('should fail without gateway set', async () => {
      const provider2 = new WebSocketProvider({
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'internal',
        enabled: true,
      });

      const payload: ProviderSendPayload = {
        recipient: { userId: 'user-123' },
        content: { body: 'Test' },
        options: {},
      };

      const result = await provider2.send(payload);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('NotificationGateway not set');
    });

    it('should validate successfully with gateway', async () => {
      const isValid = await provider.validate();
      expect(isValid).toBe(true);
    });

    it('should fail validation without gateway', async () => {
      const provider2 = new WebSocketProvider({
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'internal',
        enabled: true,
      });

      const isValid = await provider2.validate();
      expect(isValid).toBe(false);
    });

    it('should fail without userId or channel', async () => {
      const payload: ProviderSendPayload = {
        recipient: {},
        content: { body: 'Test' },
        options: {},
      };

      const result = await provider.send(payload);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('userId or channel');
    });

    it('should use sendToChannel method', async () => {
      const result = await provider.sendToChannel('updates', {
        subject: 'Update',
        body: 'New update available',
      });

      expect(result.success).toBe(true);
      expect(mockGateway.broadcastToChannel).toHaveBeenCalledWith(
        'updates',
        expect.any(Object),
      );
    });
  });

  describe('External Mode', () => {
    let credentials: ExternalWebSocketCredentials;

    beforeEach(() => {
      credentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'external',
        protocol: 'ws',
        url: 'ws://localhost:8080',
        enabled: true,
      };
    });

    it('should create provider with external credentials', () => {
      const provider = new WebSocketProvider(credentials);
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('websocket');
      expect(provider.getChannel()).toBe('websocket');
    });

    it('should have correct required credentials', () => {
      const provider = new WebSocketProvider(credentials);
      const required = provider.getRequiredCredentials();
      expect(required).toContain('url');
      expect(required).toContain('protocol');
    });

    it('should provide metadata', () => {
      const provider = new WebSocketProvider(credentials);
      const metadata = provider.getMetadata();

      expect(metadata.displayName).toBe('WebSocket Provider');
      expect(metadata.supportedFeatures).toContain(
        'internal-gateway-integration',
      );
      expect(metadata.supportedFeatures).toContain(
        'bidirectional-communication',
      );
      expect(metadata.supportedFeatures).toContain('channel-broadcasts');
    });

    it('should handle connection errors gracefully', async () => {
      const provider = new WebSocketProvider({
        ...credentials,
        url: 'ws://invalid-url:99999',
        timeout: 1000,
      });

      const payload: ProviderSendPayload = {
        recipient: { userId: 'user-123' },
        content: { body: 'Test' },
        options: {},
      };

      const result = await provider.send(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw error for query in internal mode', async () => {
      const internalCredentials: InternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'internal',
        enabled: true,
      };

      const provider = new WebSocketProvider(internalCredentials);

      await expect(
        provider.query({
          event: 'test',
          data: {},
        }),
      ).rejects.toThrow('Query not supported in internal mode');
    });
  });

  describe('Error Handling', () => {
    it('should extract correct error codes', () => {
      const credentials: InternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'internal',
        enabled: true,
      };

      const provider = new WebSocketProvider(credentials);

      expect(
        (provider as any).extractErrorCode(new Error('connection failed')),
      ).toBe('WEBSOCKET_CONNECTION_ERROR');
      expect(
        (provider as any).extractErrorCode(new Error('timeout exceeded')),
      ).toBe('WEBSOCKET_TIMEOUT');
      expect(
        (provider as any).extractErrorCode(new Error('authentication failed')),
      ).toBe('WEBSOCKET_AUTH_ERROR');
      expect((provider as any).extractErrorCode(new Error('not set'))).toBe(
        'WEBSOCKET_NOT_CONFIGURED',
      );
    });

    it('should identify retryable errors', () => {
      const credentials: InternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'internal',
        enabled: true,
      };

      const provider = new WebSocketProvider(credentials);

      expect(
        (provider as any).isRetryableError(new Error('connection failed')),
      ).toBe(true);
      expect(
        (provider as any).isRetryableError(new Error('ECONNREFUSED')),
      ).toBe(true);
      expect((provider as any).isRetryableError(new Error('timeout'))).toBe(
        true,
      );
      expect((provider as any).isRetryableError(new Error('disconnect'))).toBe(
        true,
      );
      expect(
        (provider as any).isRetryableError(new Error('invalid credentials')),
      ).toBe(false);
    });
  });

  describe('Payload Formatting', () => {
    it('should format payload correctly', () => {
      const credentials: InternalWebSocketCredentials = {
        providerType: 'websocket',
        channel: 'websocket',
        mode: 'internal',
        enabled: true,
      };

      const provider = new WebSocketProvider(credentials);

      const payload: ProviderSendPayload = {
        recipient: {
          userId: 'user-123',
          email: 'test@example.com',
        },
        content: {
          subject: 'Test Subject',
          body: 'Test Body',
          htmlBody: '<p>Test HTML</p>',
          data: { custom: 'data' },
        },
        options: { priority: 'high' },
      };

      const formatted = (provider as any).formatPayload(payload);

      expect(formatted).toMatchObject({
        subject: 'Test Subject',
        body: 'Test Body',
        htmlBody: '<p>Test HTML</p>',
        data: { custom: 'data' },
        recipient: {
          userId: 'user-123',
          email: 'test@example.com',
        },
        options: { priority: 'high' },
      });
      expect(formatted.timestamp).toBeDefined();
    });
  });
});
