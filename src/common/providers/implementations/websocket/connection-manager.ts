/**
 * WebSocket Connection Manager
 *
 * Manages WebSocket connections with features:
 * - Connection pooling (reuse connections for same endpoint)
 * - Health monitoring (ping/pong)
 * - Automatic reconnection with exponential backoff
 * - Event subscription management
 * - Thread-safe connection handling
 */

import { Logger } from '@nestjs/common';
import { WebSocketAdapter } from './adapters/websocket-adapter.interface';
import { WsAdapter } from './adapters/ws-adapter';
import { SocketIOAdapter } from './adapters/socketio-adapter';
import { ExternalWebSocketCredentials } from '../../interfaces/credentials.interface';

interface ManagedConnection {
  adapter: WebSocketAdapter;
  credentials: ExternalWebSocketCredentials;
  healthCheckInterval?: NodeJS.Timeout;
  reconnectAttempts: number;
  isHealthy: boolean;
  lastConnectedAt?: Date;
  subscribers: number;
}

export class WebSocketConnectionManager {
  private readonly logger = new Logger(WebSocketConnectionManager.name);
  private connections: Map<string, ManagedConnection> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get or create a connection
   */
  async getConnection(
    credentials: ExternalWebSocketCredentials,
  ): Promise<WebSocketAdapter> {
    const key = this.getConnectionKey(credentials);

    if (this.connections.has(key)) {
      const managed = this.connections.get(key)!;
      managed.subscribers++;

      if (!managed.adapter.isConnected()) {
        this.logger.warn(`Connection ${key} is not connected, reconnecting...`);
        await this.reconnect(key);
      }

      return managed.adapter;
    }

    // Create new connection
    return await this.createConnection(credentials);
  }

  /**
   * Release a connection (decrease subscriber count)
   */
  releaseConnection(credentials: ExternalWebSocketCredentials): void {
    const key = this.getConnectionKey(credentials);
    const managed = this.connections.get(key);

    if (managed) {
      managed.subscribers--;

      // Clean up if no more subscribers
      if (managed.subscribers <= 0) {
        this.logger.log(`No more subscribers for ${key}, cleaning up...`);
        this.closeConnection(key);
      }
    }
  }

  /**
   * Create a new connection
   */
  private async createConnection(
    credentials: ExternalWebSocketCredentials,
  ): Promise<WebSocketAdapter> {
    const key = this.getConnectionKey(credentials);
    this.logger.log(`Creating new connection: ${key}`);

    // Create appropriate adapter based on protocol
    const adapter =
      credentials.protocol === 'socketio'
        ? new SocketIOAdapter()
        : new WsAdapter();

    // Build connection options
    const options = this.buildConnectionOptions(credentials);

    try {
      // Connect
      await adapter.connect(credentials.url, options);

      // Setup managed connection
      const managed: ManagedConnection = {
        adapter,
        credentials,
        reconnectAttempts: 0,
        isHealthy: true,
        lastConnectedAt: new Date(),
        subscribers: 1,
      };

      // Setup health monitoring
      if (credentials.reconnection !== false) {
        managed.healthCheckInterval = this.setupHealthCheck(key, adapter);
      }

      // Setup event listeners for reconnection
      adapter.on('disconnect', () => {
        this.logger.warn(`Connection ${key} disconnected`);
        managed.isHealthy = false;

        if (credentials.reconnection !== false && managed.subscribers > 0) {
          this.scheduleReconnect(key);
        }
      });

      adapter.on('error', (error: any) => {
        this.logger.error(`Connection ${key} error: ${error.message}`);
        managed.isHealthy = false;
      });

      this.connections.set(key, managed);
      this.logger.log(`Connection ${key} established successfully`);

      return adapter;
    } catch (error) {
      this.logger.error(
        `Failed to create connection ${key}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Build connection options from credentials
   */
  private buildConnectionOptions(
    credentials: ExternalWebSocketCredentials,
  ): any {
    const options: any = {
      timeout: credentials.timeout || 20000,
      reconnection: credentials.reconnection !== false,
      reconnectionAttempts: credentials.reconnectionAttempts || 5,
      reconnectionDelay: credentials.reconnectionDelay || 1000,
      enableCompression: credentials.enableCompression || false,
      headers: credentials.extraHeaders || {},
    };

    // Add authentication
    if (credentials.authType === 'bearer' && credentials.authToken) {
      options.headers['Authorization'] = `Bearer ${credentials.authToken}`;
    } else if (credentials.authType === 'basic' && credentials.username) {
      const auth = Buffer.from(
        `${credentials.username}:${credentials.password || ''}`,
      ).toString('base64');
      options.headers['Authorization'] = `Basic ${auth}`;
    } else if (credentials.authType === 'custom' && credentials.authHeaders) {
      Object.assign(options.headers, credentials.authHeaders);
    }

    // Add auth query params
    if (credentials.authType === 'query' && credentials.authQuery) {
      options.auth = credentials.authQuery;
    }

    // Socket.IO specific options
    if (credentials.protocol === 'socketio') {
      if (credentials.transports) {
        options.transports = credentials.transports;
      }
      if (credentials.path) {
        options.path = credentials.path;
      }
      if (credentials.defaultChannels) {
        options.defaultRooms = credentials.defaultChannels;
      }
    }

    return options;
  }

  /**
   * Setup health check interval
   */
  private setupHealthCheck(
    key: string,
    adapter: WebSocketAdapter,
  ): NodeJS.Timeout {
    return setInterval(
      () => {
        if (!adapter.isConnected()) {
          const managed = this.connections.get(key);
          if (managed) {
            managed.isHealthy = false;
            this.logger.warn(`Health check failed for ${key}`);
          }
        }
      },
      30000, // Check every 30 seconds
    );
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(key: string): void {
    // Clear existing timeout if any
    const existingTimeout = this.reconnectTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const managed = this.connections.get(key);
    if (!managed) {
      return;
    }

    const maxAttempts = managed.credentials.reconnectionAttempts || 5;
    if (managed.reconnectAttempts >= maxAttempts) {
      this.logger.error(
        `Max reconnection attempts (${maxAttempts}) reached for ${key}`,
      );
      return;
    }

    // Exponential backoff: delay * 2^attempt
    const baseDelay = managed.credentials.reconnectionDelay || 1000;
    const delay = baseDelay * Math.pow(2, managed.reconnectAttempts);

    this.logger.log(
      `Scheduling reconnection for ${key} in ${delay}ms (attempt ${managed.reconnectAttempts + 1}/${maxAttempts})`,
    );

    const timeout = setTimeout(async () => {
      await this.reconnect(key);
    }, delay);

    this.reconnectTimeouts.set(key, timeout);
  }

  /**
   * Attempt to reconnect
   */
  private async reconnect(key: string): Promise<void> {
    const managed = this.connections.get(key);
    if (!managed) {
      this.logger.warn(`No managed connection found for ${key}`);
      return;
    }

    managed.reconnectAttempts++;

    try {
      this.logger.log(`Attempting to reconnect ${key}...`);

      const options = this.buildConnectionOptions(managed.credentials);
      await managed.adapter.connect(managed.credentials.url, options);

      // Reset reconnect attempts on success
      managed.reconnectAttempts = 0;
      managed.isHealthy = true;
      managed.lastConnectedAt = new Date();

      this.logger.log(`Successfully reconnected ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to reconnect ${key}: ${(error as Error).message}`,
      );

      // Schedule next attempt
      if (managed.subscribers > 0) {
        this.scheduleReconnect(key);
      }
    }
  }

  /**
   * Close a connection
   */
  private async closeConnection(key: string): Promise<void> {
    const managed = this.connections.get(key);
    if (!managed) {
      return;
    }

    try {
      // Clear health check
      if (managed.healthCheckInterval) {
        clearInterval(managed.healthCheckInterval);
      }

      // Clear reconnect timeout
      const reconnectTimeout = this.reconnectTimeouts.get(key);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        this.reconnectTimeouts.delete(key);
      }

      // Disconnect adapter
      await managed.adapter.disconnect();

      this.connections.delete(key);
      this.logger.log(`Connection ${key} closed`);
    } catch (error) {
      this.logger.error(
        `Error closing connection ${key}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get connection key for pooling
   */
  private getConnectionKey(credentials: ExternalWebSocketCredentials): string {
    // Create a unique key based on URL and protocol
    return `${credentials.protocol}://${credentials.url}`;
  }

  /**
   * Close all connections (cleanup on shutdown)
   */
  async closeAll(): Promise<void> {
    this.logger.log('Closing all connections...');

    const closePromises = Array.from(this.connections.keys()).map((key) =>
      this.closeConnection(key),
    );

    await Promise.allSettled(closePromises);

    this.logger.log('All connections closed');
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    healthyConnections: number;
    totalSubscribers: number;
  } {
    let healthyConnections = 0;
    let totalSubscribers = 0;

    for (const managed of this.connections.values()) {
      if (managed.isHealthy) {
        healthyConnections++;
      }
      totalSubscribers += managed.subscribers;
    }

    return {
      totalConnections: this.connections.size,
      healthyConnections,
      totalSubscribers,
    };
  }
}
