/**
 * Native WebSocket Adapter (RFC 6455)
 *
 * Implements WebSocketAdapter interface using the 'ws' library
 * Provides native WebSocket protocol support with custom event handling
 */

import WebSocket from 'ws';
import { Logger } from '@nestjs/common';
import { WebSocketAdapter } from './websocket-adapter.interface';

export class WsAdapter implements WebSocketAdapter {
  private readonly logger = new Logger(WsAdapter.name);
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private pendingResponses: Map<
    string,
    { resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  > = new Map();
  private messageIdCounter = 0;

  async connect(url: string, options: any = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsOptions: any = {
          headers: options.headers || {},
          handshakeTimeout: options.timeout || 20000,
        };

        // Add compression if enabled
        if (options.enableCompression) {
          wsOptions.perMessageDeflate = true;
        }

        this.ws = new WebSocket(url, wsOptions);

        this.ws.on('open', () => {
          this.logger.log(`Connected to WebSocket server: ${url}`);
          this.emit('connect', {});
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          this.logger.error(`WebSocket error: ${error.message}`);
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          this.logger.log(`WebSocket closed: ${code} - ${reason.toString()}`);
          this.emit('disconnect', { code, reason: reason.toString() });
        });

        // Handle pings/pongs for health monitoring
        this.ws.on('ping', () => {
          this.ws?.pong();
        });
      } catch (error) {
        this.logger.error(`Failed to connect: ${(error as Error).message}`);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws) {
        this.ws.once('close', () => {
          this.ws = null;
          this.eventHandlers.clear();
          // Clean up pending responses
          for (const [id, pending] of this.pendingResponses.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
          }
          this.pendingResponses.clear();
          resolve();
        });
        this.ws.close();
      } else {
        resolve();
      }
    });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  async send(event: string, data: any, withAck: boolean = false): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const message: Record<string, any> = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    if (withAck) {
      const messageId = this.generateMessageId();
      message.id = messageId;
      message.requiresAck = true;

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingResponses.delete(messageId);
          reject(new Error('Acknowledgment timeout'));
        }, 10000);

        this.pendingResponses.set(messageId, { resolve, reject, timeout });
        this.ws!.send(JSON.stringify(message));
      });
    } else {
      this.ws!.send(JSON.stringify(message));
      return Promise.resolve();
    }
  }

  async sendToRoom(room: string, event: string, data: any): Promise<void> {
    // Note: Native WebSocket doesn't have built-in room support
    // This is a simplified implementation that sends to the server
    // with room metadata for server-side handling
    return this.send(event, { ...data, _room: room }, false);
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler?: Function): void {
    if (handler) {
      this.eventHandlers.get(event)?.delete(handler);
    } else {
      this.eventHandlers.delete(event);
    }
  }

  once(event: string, handler: Function): void {
    const wrappedHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, wrappedHandler);
    };
    this.on(event, wrappedHandler);
  }

  async joinRoom(room: string): Promise<void> {
    // Send join room message to server
    return this.send('join_room', { room }, false);
  }

  async leaveRoom(room: string): Promise<void> {
    // Send leave room message to server
    return this.send('leave_room', { room }, false);
  }

  async sendWithResponse(
    event: string,
    data: any,
    timeout: number,
  ): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const messageId = this.generateMessageId();
    const message = {
      event,
      data,
      id: messageId,
      requiresResponse: true,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingResponses.delete(messageId);
        reject(new Error('Response timeout'));
      }, timeout);

      this.pendingResponses.set(messageId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      // Handle acknowledgments
      if (message.ack && message.id) {
        const pending = this.pendingResponses.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingResponses.delete(message.id);
          pending.resolve(message.data);
        }
        return;
      }

      // Handle responses
      if (message.response && message.id) {
        const pending = this.pendingResponses.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingResponses.delete(message.id);
          pending.resolve(message.data);
        }
        return;
      }

      // Handle regular messages
      if (message.event) {
        this.emit(message.event, message.data || message);
      } else {
        // Emit as 'message' event if no specific event type
        this.emit('message', message);
      }
    } catch (error) {
      this.logger.error(`Failed to parse message: ${(error as Error).message}`);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(
            `Error in event handler: ${(error as Error).message}`,
          );
        }
      });
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }
}
