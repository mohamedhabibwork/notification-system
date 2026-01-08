import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `Client ${client.id} connection rejected: No token provided`,
        );
        client.disconnect();
        return;
      }

      // Verify token
      const jwksUri = this.configService.get<string>('keycloak.jwksUri');
      // In production, you would verify against JWKS
      // For now, we'll decode without verification (development only)
      const decoded = this.jwtService.decode(token);

      if (!decoded || !decoded.sub) {
        this.logger.warn(
          `Client ${client.id} connection rejected: Invalid token`,
        );
        client.disconnect();
        return;
      }

      const userId = decoded.sub;
      const tenantId = decoded.tenant_id;

      // Store user info in socket
      client.data.userId = userId;
      client.data.tenantId = tenantId;

      // Join user-specific room
      const userRoom = `user:${userId}`;
      await client.join(userRoom);

      // Join tenant-specific room
      if (tenantId) {
        const tenantRoom = `tenant:${tenantId}`;
        await client.join(tenantRoom);
      }

      // Track socket for this user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Client ${client.id} connected as user ${userId}`);
      client.emit('connected', {
        message: 'Connected to notification gateway',
        userId,
      });
    } catch (error) {
      this.logger.error(
        `Connection error for client ${client.id}: ${error.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client ${client.id} disconnected`);
  }

  // Send notification to specific user
  sendNotificationToUser(userId: string, notification: any) {
    const userRoom = `user:${userId}`;
    this.server.to(userRoom).emit('notification:new', notification);
    this.logger.log(`Sent notification to user ${userId}`);
  }

  // Send notification status update to user
  sendStatusUpdate(
    userId: string,
    notificationId: number,
    status: string,
    details?: any,
  ) {
    const userRoom = `user:${userId}`;
    this.server.to(userRoom).emit('notification:status', {
      notificationId,
      status,
      ...details,
    });
    this.logger.log(
      `Sent status update to user ${userId} for notification ${notificationId}`,
    );
  }

  // Broadcast to all users in a tenant
  broadcastToTenant(tenantId: number, event: string, data: any) {
    const tenantRoom = `tenant:${tenantId}`;
    this.server.to(tenantRoom).emit(event, data);
    this.logger.log(`Broadcast ${event} to tenant ${tenantId}`);
  }

  // Send bulk job progress update
  sendBulkJobProgress(userId: string, jobId: string, progress: any) {
    const userRoom = `user:${userId}`;
    this.server.to(userRoom).emit('bulk-job:progress', {
      jobId,
      ...progress,
    });
  }

  @SubscribeMessage('notification:mark-read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: number },
  ) {
    const userId = client.data.userId;
    this.logger.log(
      `User ${userId} marked notification ${data.notificationId} as read`,
    );

    // Acknowledge
    client.emit('notification:read', {
      notificationId: data.notificationId,
      readAt: new Date(),
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date() });
  }

  // Get count of connected users
  getConnectedUserCount(): number {
    return this.userSockets.size;
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }
}
