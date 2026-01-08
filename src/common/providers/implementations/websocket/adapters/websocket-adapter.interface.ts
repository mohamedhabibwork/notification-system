/**
 * WebSocket Adapter Interface
 *
 * Unified interface for different WebSocket protocols (ws, socket.io)
 * Abstracts protocol differences for seamless switching between implementations
 */

export interface WebSocketAdapter {
  /**
   * Connect to WebSocket server
   */
  connect(url: string, options: any): Promise<void>;

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Send message/event
   */
  send(event: string, data: any, withAck: boolean): Promise<any>;

  /**
   * Send message to specific room/channel
   */
  sendToRoom(room: string, event: string, data: any): Promise<void>;

  /**
   * Register event listener
   */
  on(event: string, handler: Function): void;

  /**
   * Remove event listener
   */
  off(event: string, handler?: Function): void;

  /**
   * Register one-time event listener
   */
  once(event: string, handler: Function): void;

  /**
   * Join room/channel
   */
  joinRoom(room: string): Promise<void>;

  /**
   * Leave room/channel
   */
  leaveRoom(room: string): Promise<void>;

  /**
   * Send with response (request-response pattern)
   */
  sendWithResponse(event: string, data: any, timeout: number): Promise<any>;
}
