/**
 * Socket.IO Adapter
 *
 * Implements WebSocketAdapter interface using socket.io-client
 * Provides Socket.IO protocol support with built-in features
 */

import { io, Socket } from 'socket.io-client';
import { Logger } from '@nestjs/common';
import { WebSocketAdapter } from './websocket-adapter.interface';

export class SocketIOAdapter implements WebSocketAdapter {
  private readonly logger = new Logger(SocketIOAdapter.name);
  private socket: Socket | null = null;
  private pendingResponses: Map<
    string,
    { resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  > = new Map();
  private messageIdCounter = 0;

  async connect(url: string, options: any = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const socketOptions: any = {
          transports: options.transports || ['websocket', 'polling'],
          path: options.path || '/socket.io',
          reconnection: options.reconnection !== false,
          reconnectionAttempts: options.reconnectionAttempts || 5,
          reconnectionDelay: options.reconnectionDelay || 1000,
          timeout: options.timeout || 20000,
        };

        // Add authentication
        if (options.auth) {
          socketOptions.auth = options.auth;
        }

        // Add extra headers
        if (options.extraHeaders) {
          socketOptions.extraHeaders = options.extraHeaders;
        }

        // Enable compression
        if (options.enableCompression) {
          socketOptions.perMessageDeflate = true;
        }

        this.socket = io(url, socketOptions);

        this.socket.on('connect', () => {
          this.logger.log(`Connected to Socket.IO server: ${url}`);

          // Join default rooms if specified
          if (options.defaultRooms && Array.isArray(options.defaultRooms)) {
            options.defaultRooms.forEach((room: string) => {
              this.joinRoom(room);
            });
          }

          resolve();
        });

        this.socket.on('connect_error', (error) => {
          this.logger.error(`Connection error: ${error.message}`);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          this.logger.log(`Disconnected: ${reason}`);
        });

        this.socket.on('error', (error) => {
          this.logger.error(`Socket.IO error: ${error}`);
        });

        // Handle acknowledgment responses
        this.socket.onAny((event, ...args) => {
          // Check if this is a response to a pending request
          if (event.startsWith('response:')) {
            const messageId = event.substring(9);
            const pending = this.pendingResponses.get(messageId);
            if (pending) {
              clearTimeout(pending.timeout);
              this.pendingResponses.delete(messageId);
              pending.resolve(args[0]);
            }
          }
        });
      } catch (error) {
        this.logger.error(`Failed to connect: ${(error as Error).message}`);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.once('disconnect', () => {
          this.socket = null;
          // Clean up pending responses
          for (const [id, pending] of this.pendingResponses.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
          }
          this.pendingResponses.clear();
          resolve();
        });
        this.socket.disconnect();
      } else {
        resolve();
      }
    });
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  async send(event: string, data: any, withAck: boolean = false): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Socket.IO not connected');
    }

    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    if (withAck) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Acknowledgment timeout'));
        }, 10000);

        this.socket!.emit(event, payload, (response: any) => {
          clearTimeout(timeout);
          resolve(response);
        });
      });
    } else {
      this.socket!.emit(event, payload);
      return Promise.resolve();
    }
  }

  async sendToRoom(room: string, event: string, data: any): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Socket.IO not connected');
    }

    // Socket.IO handles room broadcasts server-side
    // We send with room metadata for server to handle
    const payload = {
      ...data,
      _room: room,
      timestamp: new Date().toISOString(),
    };

    this.socket!.emit(event, payload);
  }

  on(event: string, handler: Function): void {
    if (this.socket) {
      this.socket.on(event, handler as any);
    }
  }

  off(event: string, handler?: Function): void {
    if (this.socket) {
      if (handler) {
        this.socket.off(event, handler as any);
      } else {
        this.socket.off(event);
      }
    }
  }

  once(event: string, handler: Function): void {
    if (this.socket) {
      this.socket.once(event, handler as any);
    }
  }

  async joinRoom(room: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Socket.IO not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Join room timeout: ${room}`));
      }, 5000);

      this.socket!.emit('join', room, () => {
        clearTimeout(timeout);
        this.logger.log(`Joined room: ${room}`);
        resolve();
      });
    });
  }

  async leaveRoom(room: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Socket.IO not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Leave room timeout: ${room}`));
      }, 5000);

      this.socket!.emit('leave', room, () => {
        clearTimeout(timeout);
        this.logger.log(`Left room: ${room}`);
        resolve();
      });
    });
  }

  async sendWithResponse(
    event: string,
    data: any,
    timeout: number,
  ): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Socket.IO not connected');
    }

    const messageId = this.generateMessageId();
    const requestEvent = `request:${messageId}`;
    const responseEvent = `response:${messageId}`;

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingResponses.delete(messageId);
        this.socket?.off(responseEvent);
        reject(new Error('Response timeout'));
      }, timeout);

      this.pendingResponses.set(messageId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      // Listen for response
      this.socket!.once(responseEvent, (response: any) => {
        const pending = this.pendingResponses.get(messageId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingResponses.delete(messageId);
          pending.resolve(response);
        }
      });

      // Send request
      this.socket!.emit(event, {
        ...data,
        _requestId: messageId,
        _requiresResponse: true,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }

  /**
   * Get the underlying Socket.IO socket instance
   * Useful for advanced use cases
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}
