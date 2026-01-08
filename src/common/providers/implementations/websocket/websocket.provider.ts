/**
 * WebSocket Provider Implementation
 *
 * Dual-mode WebSocket provider supporting:
 * - Internal mode: Integration with NotificationGateway
 * - External mode: Connection to external WebSocket servers
 * - Channel broadcasts
 * - Bidirectional communication
 * - Request-response pattern
 * - Multiple authentication methods
 * - Automatic reconnection
 */

import { Logger } from '@nestjs/common';
import { BaseProvider } from '../../base/base.provider';
import {
  WebSocketProviderCredentials,
  InternalWebSocketCredentials,
  ExternalWebSocketCredentials,
} from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';
import { NotificationGateway } from '../../../../gateways/notification.gateway';
import { WebSocketConnectionManager } from './connection-manager';
import { WebSocketAdapter } from './adapters/websocket-adapter.interface';
import {
  WebSocketMessageHandlerService,
  IncomingWebSocketMessage,
} from './services/message-handler.service';

export class WebSocketProvider extends BaseProvider<WebSocketProviderCredentials> {
  private gateway: NotificationGateway | null = null;
  private messageHandler: WebSocketMessageHandlerService | null = null;
  private connectionManager: WebSocketConnectionManager;
  private adapter: WebSocketAdapter | null = null;
  private messageListenersSetup = false;

  constructor(credentials: WebSocketProviderCredentials) {
    super(credentials);
    this.connectionManager = new WebSocketConnectionManager();
  }

  /**
   * Set NotificationGateway (injected by registry for internal mode)
   */
  setGateway(gateway: NotificationGateway): void {
    this.gateway = gateway;
  }

  /**
   * Set MessageHandler (injected by registry)
   */
  setMessageHandler(handler: WebSocketMessageHandlerService): void {
    this.messageHandler = handler;
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      // Detect recipient type
      const isChannelBroadcast = !!payload.recipient.channel;
      const isUserMessage = !!payload.recipient.userId;

      if (!isChannelBroadcast && !isUserMessage) {
        throw new Error(
          'Recipient must have either userId or channel specified',
        );
      }

      if (this.credentials.mode === 'internal') {
        return await this.sendInternal(payload, isChannelBroadcast);
      } else {
        return await this.sendExternal(payload, isChannelBroadcast);
      }
    } catch (error) {
      return {
        success: false,
        timestamp: new Date(),
        error: this.handleError(error as Error),
      };
    }
  }

  /**
   * Send via internal NotificationGateway
   */
  private async sendInternal(
    payload: ProviderSendPayload,
    isChannelBroadcast: boolean,
  ): Promise<ProviderSendResult> {
    if (!this.gateway) {
      throw new Error('NotificationGateway not set');
    }

    const notification = this.formatPayload(payload);

    if (isChannelBroadcast) {
      const channelName = payload.recipient.channel!;
      this.gateway.broadcastToChannel(channelName, notification);

      return {
        success: true,
        messageId: `channel-${channelName}-${Date.now()}`,
        timestamp: new Date(),
        metadata: {
          mode: 'internal',
          channel: channelName,
          type: 'channel_broadcast',
        },
      };
    } else {
      const userId = payload.recipient.userId!;
      this.gateway.sendNotificationToUser(userId, notification);

      return {
        success: true,
        messageId: `user-${userId}-${Date.now()}`,
        timestamp: new Date(),
        metadata: {
          mode: 'internal',
          userId,
          type: 'user_message',
        },
      };
    }
  }

  /**
   * Send via external WebSocket server
   */
  private async sendExternal(
    payload: ProviderSendPayload,
    isChannelBroadcast: boolean,
  ): Promise<ProviderSendResult> {
    const credentials = this.credentials as ExternalWebSocketCredentials;

    // Get or create connection
    if (!this.adapter) {
      this.adapter = await this.connectionManager.getConnection(credentials);

      // Setup message listeners for bidirectional communication
      if (credentials.enableReceiving && !this.messageListenersSetup) {
        await this.setupMessageListeners();
      }
    }

    const notification = this.formatPayload(payload);
    const eventName =
      (isChannelBroadcast
        ? credentials.customEvents?.channelBroadcast
        : credentials.customEvents?.notification) || 'notification';

    const enableAck = credentials.enableAcknowledgments || false;

    if (isChannelBroadcast) {
      const channelName = payload.recipient.channel!;
      await this.adapter.sendToRoom(channelName, eventName, notification);

      return {
        success: true,
        messageId: `external-channel-${channelName}-${Date.now()}`,
        timestamp: new Date(),
        metadata: {
          mode: 'external',
          protocol: credentials.protocol,
          url: credentials.url,
          channel: channelName,
          type: 'channel_broadcast',
        },
      };
    } else {
      const response = await this.adapter.send(
        eventName,
        notification,
        enableAck,
      );

      return {
        success: true,
        messageId: `external-${Date.now()}`,
        timestamp: new Date(),
        metadata: {
          mode: 'external',
          protocol: credentials.protocol,
          url: credentials.url,
          userId: payload.recipient.userId,
          type: 'user_message',
          acknowledgment: enableAck ? response : undefined,
        },
      };
    }
  }

  /**
   * Send to channel (explicit channel broadcast method)
   */
  async sendToChannel(
    channelName: string,
    content: {
      subject?: string;
      body: string;
      data?: Record<string, unknown>;
    },
  ): Promise<ProviderSendResult> {
    return this.send({
      recipient: {
        channel: channelName,
      },
      content,
      options: {},
    });
  }

  /**
   * Query data (request-response pattern)
   */
  async query(request: {
    event: string;
    data: any;
    timeout?: number;
  }): Promise<any> {
    if (this.credentials.mode === 'internal') {
      throw new Error('Query not supported in internal mode');
    }

    const credentials = this.credentials;

    if (!credentials.enableRequestResponse) {
      throw new Error('Request-response not enabled in credentials');
    }

    if (!this.adapter) {
      this.adapter = await this.connectionManager.getConnection(credentials);
    }

    const timeout = request.timeout || credentials.requestTimeout || 5000;

    try {
      const response = await this.adapter.sendWithResponse(
        request.event,
        request.data,
        timeout,
      );

      return response;
    } catch (error) {
      this.logger.error(`Query failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Setup message listeners for incoming messages
   */
  private async setupMessageListeners(): Promise<void> {
    if (!this.adapter || this.messageListenersSetup) {
      return;
    }

    const credentials = this.credentials as ExternalWebSocketCredentials;

    if (
      !credentials.subscribeToEvents ||
      credentials.subscribeToEvents.length === 0
    ) {
      this.logger.warn('No events to subscribe to');
      return;
    }

    this.logger.log(
      `Setting up message listeners for events: ${credentials.subscribeToEvents.join(', ')}`,
    );

    for (const event of credentials.subscribeToEvents) {
      this.adapter.on(event, async (data: any) => {
        const message: IncomingWebSocketMessage = {
          event,
          data,
          timestamp: new Date(),
          metadata: {
            provider: 'websocket',
            mode: 'external',
            url: credentials.url,
            protocol: credentials.protocol,
          },
        };

        try {
          if (this.messageHandler) {
            await this.messageHandler.handleIncomingMessage(
              message,
              credentials,
            );
          } else {
            this.logger.warn('MessageHandler not set, message not processed');
          }
        } catch (error) {
          this.logger.error(
            `Failed to handle incoming message: ${(error as Error).message}`,
          );
        }
      });
    }

    // Join default channels if specified
    if (credentials.defaultChannels && credentials.defaultChannels.length > 0) {
      for (const channel of credentials.defaultChannels) {
        try {
          await this.adapter.joinRoom(channel);
          this.logger.log(`Joined channel: ${channel}`);
        } catch (error) {
          this.logger.error(
            `Failed to join channel ${channel}: ${(error as Error).message}`,
          );
        }
      }
    }

    this.messageListenersSetup = true;
  }

  async validate(): Promise<boolean> {
    if (!this.validateCredentials()) {
      return false;
    }

    try {
      if (this.credentials.mode === 'internal') {
        // Validate internal mode
        if (!this.gateway) {
          this.logger.warn('NotificationGateway not set');
          return false;
        }
        return true;
      } else {
        // Validate external mode by testing connection
        const credentials = this.credentials;
        const adapter = await this.connectionManager.getConnection(credentials);

        const isConnected = adapter.isConnected();

        if (isConnected) {
          this.logger.log('External WebSocket connection validated');
        }

        return isConnected;
      }
    } catch (error) {
      this.logger.error(
        `WebSocket validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(payload: ProviderSendPayload): any {
    return {
      subject: payload.content.subject,
      body: payload.content.body,
      htmlBody: payload.content.htmlBody,
      data: payload.content.data,
      recipient: {
        userId: payload.recipient.userId,
        email: payload.recipient.email,
        channel: payload.recipient.channel,
        metadata: payload.recipient.metadata,
      },
      timestamp: new Date().toISOString(),
      options: payload.options,
    };
  }

  getRequiredCredentials(): string[] {
    if (this.credentials.mode === 'internal') {
      return [];
    } else {
      return ['url', 'protocol'];
    }
  }

  getChannel(): ChannelType {
    return 'websocket';
  }

  getProviderName(): string {
    return 'websocket';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'WebSocket Provider',
      description:
        'Dual-mode WebSocket provider supporting internal gateway and external servers with bidirectional communication',
      version: '1.0.0',
      supportedFeatures: [
        'internal-gateway-integration',
        'external-websocket-servers',
        'channel-broadcasts',
        'user-notifications',
        'bidirectional-communication',
        'request-response-pattern',
        'authentication',
        'auto-reconnection',
        'acknowledgments',
        'compression',
        'message-handling-strategies',
        'event-subscription',
      ],
      rateLimit: {
        maxPerSecond: 100,
        maxPerDay: 10000000,
      },
    };
  }

  protected extractErrorCode(error: Error): string {
    if (error.message.includes('connection')) {
      return 'WEBSOCKET_CONNECTION_ERROR';
    }
    if (error.message.includes('timeout')) {
      return 'WEBSOCKET_TIMEOUT';
    }
    if (error.message.includes('authentication')) {
      return 'WEBSOCKET_AUTH_ERROR';
    }
    if (error.message.includes('not set')) {
      return 'WEBSOCKET_NOT_CONFIGURED';
    }
    return 'WEBSOCKET_ERROR';
  }

  protected isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      'connection',
      'timeout',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'disconnect',
    ];

    return retryablePatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern.toLowerCase()),
    );
  }

  /**
   * Cleanup on provider destruction
   */
  async destroy(): Promise<void> {
    try {
      if (this.adapter && this.credentials.mode === 'external') {
        const credentials = this.credentials;
        this.connectionManager.releaseConnection(credentials);
        this.adapter = null;
      }
    } catch (error) {
      this.logger.error(`Error during cleanup: ${(error as Error).message}`);
    }
  }
}
