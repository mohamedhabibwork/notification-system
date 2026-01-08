# WebSocket Provider

The WebSocket Provider enables real-time bidirectional communication for notifications through WebSocket connections. It supports both internal gateway integration and external WebSocket servers with comprehensive features.

## Table of Contents

- [Overview](#overview)
- [Modes of Operation](#modes-of-operation)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Channel Broadcasts](#channel-broadcasts)
- [Bidirectional Communication](#bidirectional-communication)
- [Request-Response Pattern](#request-response-pattern)
- [Message Handling Strategies](#message-handling-strategies)
- [Code Examples](#code-examples)
- [Troubleshooting](#troubleshooting)
- [Performance Considerations](#performance-considerations)
- [Security Best Practices](#security-best-practices)

## Overview

The WebSocket Provider offers a dual-mode architecture that can:

- **Internal Mode**: Integrate with the existing NotificationGateway for real-time push notifications to connected users
- **External Mode**: Connect to external WebSocket servers (ws:// or Socket.IO)
- Send notifications to individual users or broadcast to channels/rooms
- Receive incoming messages from WebSocket servers
- Support request-response patterns for querying data
- Handle automatic reconnection with exponential backoff
- Provide multiple authentication methods
- Enable message compression and acknowledgments

### Key Features

✅ Dual-mode operation (internal/external)  
✅ Protocol support: Native WebSocket (ws) and Socket.IO  
✅ Channel/room broadcasts  
✅ Bidirectional communication  
✅ Request-response pattern  
✅ Multiple authentication methods  
✅ Automatic reconnection  
✅ Message acknowledgments  
✅ Compression support  
✅ Configurable message handling (callback, database, Kafka)  
✅ Connection pooling  
✅ Health monitoring  

## Modes of Operation

### Internal Mode

Uses the existing NotificationGateway to push notifications to connected users in real-time.

**Use Cases:**
- Real-time notifications to logged-in users
- In-app alerts and updates
- Live status updates
- Multi-device notification sync

**Advantages:**
- No external dependencies
- Seamless integration
- Built-in user authentication
- Tenant isolation support

### External Mode

Connects to external WebSocket servers for integration with third-party services.

**Use Cases:**
- Integration with external notification services
- Microservices communication
- Real-time data synchronization
- IoT device communication

**Advantages:**
- Protocol flexibility (ws/Socket.IO)
- Custom event handling
- Bidirectional messaging
- Third-party integration

## Configuration

### Internal Mode Configuration

```json
{
  "providerType": "websocket",
  "channel": "websocket",
  "mode": "internal",
  "supportChannelBroadcast": true,
  "defaultChannels": ["system", "alerts"],
  "enabled": true
}
```

#### Configuration Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `providerType` | string | ✓ | Must be "websocket" |
| `channel` | string | ✓ | Must be "websocket" |
| `mode` | string | ✓ | Set to "internal" |
| `supportChannelBroadcast` | boolean | ✗ | Enable channel broadcasts (default: false) |
| `defaultChannels` | string[] | ✗ | Channels to auto-join |
| `enabled` | boolean | ✓ | Enable/disable provider |

### External Mode Configuration (Socket.IO)

```json
{
  "providerType": "websocket",
  "channel": "websocket",
  "mode": "external",
  "protocol": "socketio",
  "url": "https://notifications.example.com",
  
  "authType": "bearer",
  "authToken": "your-api-token",
  
  "supportChannelBroadcast": true,
  "defaultChannels": ["notifications", "alerts", "system"],
  
  "reconnection": true,
  "reconnectionAttempts": 5,
  "reconnectionDelay": 1000,
  "timeout": 20000,
  
  "enableCompression": true,
  "enableAcknowledgments": true,
  
  "customEvents": {
    "notification": "notify",
    "channelBroadcast": "channel:broadcast",
    "incomingMessage": "message:received"
  },
  
  "enableReceiving": true,
  "subscribeToEvents": ["message:received", "status:update", "data:sync"],
  "messageHandling": {
    "strategy": "all",
    "callbackUrl": "https://your-app.com/webhooks/websocket",
    "storeInDatabase": true,
    "publishToKafka": true,
    "kafkaTopic": "websocket.incoming.messages"
  },
  
  "enableRequestResponse": true,
  "requestTimeout": 10000,
  
  "transports": ["websocket", "polling"],
  "path": "/socket.io",
  
  "enabled": true
}
```

### External Mode Configuration (Native WebSocket)

```json
{
  "providerType": "websocket",
  "channel": "websocket",
  "mode": "external",
  "protocol": "ws",
  "url": "wss://api.example.com/ws",
  
  "authType": "query",
  "authQuery": {
    "token": "your-api-token",
    "client": "notification-system"
  },
  
  "reconnection": true,
  "reconnectionAttempts": 3,
  "reconnectionDelay": 2000,
  
  "enableCompression": true,
  "enableAcknowledgments": true,
  
  "enableReceiving": true,
  "subscribeToEvents": ["notification", "status", "error"],
  "messageHandling": {
    "strategy": "kafka",
    "publishToKafka": true,
    "kafkaTopic": "external.websocket.messages"
  },
  
  "enabled": true
}
```

#### External Mode Configuration Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `protocol` | string | ✓ | "ws" or "socketio" |
| `url` | string | ✓ | WebSocket server URL (ws:// or wss://) |
| `authType` | string | ✗ | Authentication method |
| `reconnection` | boolean | ✗ | Enable auto-reconnect (default: true) |
| `reconnectionAttempts` | number | ✗ | Max retry attempts (default: 5) |
| `reconnectionDelay` | number | ✗ | Delay between retries in ms (default: 1000) |
| `timeout` | number | ✗ | Connection timeout in ms (default: 20000) |
| `enableCompression` | boolean | ✗ | Enable message compression |
| `enableAcknowledgments` | boolean | ✗ | Wait for message confirmation |
| `enableReceiving` | boolean | ✗ | Listen for incoming messages |
| `subscribeToEvents` | string[] | ✗ | Events to subscribe to |
| `enableRequestResponse` | boolean | ✗ | Support request-response pattern |
| `requestTimeout` | number | ✗ | Request-response timeout in ms (default: 5000) |

## Authentication

### Bearer Token Authentication

```json
{
  "authType": "bearer",
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Headers sent: `Authorization: Bearer <token>`

### Basic Authentication

```json
{
  "authType": "basic",
  "username": "api_user",
  "password": "api_password"
}
```

Headers sent: `Authorization: Basic <base64(username:password)>`

### Query Parameter Authentication

```json
{
  "authType": "query",
  "authQuery": {
    "api_key": "your-api-key",
    "client_id": "notification-system"
  }
}
```

Query params appended to URL: `?api_key=your-api-key&client_id=notification-system`

### Custom Header Authentication

```json
{
  "authType": "custom",
  "authHeaders": {
    "X-API-Key": "your-api-key",
    "X-Client-ID": "notification-system",
    "X-Signature": "hmac-signature"
  }
}
```

## Channel Broadcasts

Send notifications to all users subscribed to a channel.

### Send to Channel (API)

```typescript
// Using NotificationsService
await notificationsService.send({
  recipient: {
    channel: "alerts" // Specify channel instead of userId
  },
  content: {
    subject: "System Alert",
    body: "Database backup completed successfully",
    data: {
      type: "system",
      severity: "info"
    }
  },
  tenantId: 1,
  channel: "websocket"
});
```

### Send to Channel (Provider Direct)

```typescript
// Using WebSocketProvider directly
await websocketProvider.sendToChannel("alerts", {
  subject: "Security Alert",
  body: "New login detected from unknown location",
  data: {
    ip: "192.168.1.100",
    location: "San Francisco, CA"
  }
});
```

### Client-Side Channel Subscription

```javascript
// Socket.IO Client
const socket = io('https://your-app.com', {
  auth: { token: 'user-jwt-token' }
});

// Join channels
socket.emit('channel:join', { channelName: 'alerts' });
socket.emit('channel:join', { channelName: 'updates' });

// Listen for notifications
socket.on('notification:new', (notification) => {
  console.log('Received:', notification);
  // Display notification to user
});

// Leave channel
socket.emit('channel:leave', { channelName: 'alerts' });
```

## Bidirectional Communication

Receive messages from WebSocket servers and process them with configurable strategies.

### Enable Message Receiving

```json
{
  "enableReceiving": true,
  "subscribeToEvents": [
    "user:online",
    "user:offline",
    "message:received",
    "status:changed",
    "data:updated"
  ],
  "messageHandling": {
    "strategy": "all",
    "callbackUrl": "https://your-app.com/webhooks/websocket",
    "storeInDatabase": true,
    "publishToKafka": true,
    "kafkaTopic": "websocket.events"
  }
}
```

### Message Handling Strategies

#### 1. Callback Strategy

Forward incoming messages to a webhook URL.

```json
{
  "strategy": "callback",
  "callbackUrl": "https://your-app.com/webhooks/websocket"
}
```

Webhook payload:
```json
{
  "event": "message:received",
  "data": { ... },
  "timestamp": "2025-01-08T19:00:00.000Z",
  "metadata": { ... },
  "source": {
    "provider": "websocket",
    "url": "wss://external-service.com",
    "protocol": "socketio"
  }
}
```

#### 2. Database Strategy

Store incoming messages in the notifications table.

```json
{
  "strategy": "database",
  "storeInDatabase": true
}
```

#### 3. Kafka Strategy

Publish incoming messages to Kafka for event streaming.

```json
{
  "strategy": "kafka",
  "publishToKafka": true,
  "kafkaTopic": "websocket.incoming"
}
```

#### 4. All Strategy

Execute all strategies concurrently.

```json
{
  "strategy": "all",
  "callbackUrl": "https://your-app.com/webhooks/websocket",
  "storeInDatabase": true,
  "publishToKafka": true,
  "kafkaTopic": "websocket.events"
}
```

## Request-Response Pattern

Query data from WebSocket servers with timeout handling.

### Enable Request-Response

```json
{
  "enableRequestResponse": true,
  "requestTimeout": 5000
}
```

### Query Example

```typescript
// Using WebSocketProvider
const response = await websocketProvider.query({
  event: 'user:info',
  data: { userId: '12345' },
  timeout: 10000
});

console.log('User info:', response);
```

### Server-Side Response Handling

```javascript
// Socket.IO Server
socket.on('user:info', async (data, callback) => {
  const userInfo = await getUserInfo(data.userId);
  callback(userInfo);
});
```

## Code Examples

### Example 1: Send Notification to User (Internal Mode)

```typescript
import { NotificationsService } from './modules/notifications/notifications.service';

// Configure WebSocket provider (internal mode)
await tenantService.updateProviderConfig(tenantId, {
  providerType: 'websocket',
  channel: 'websocket',
  mode: 'internal',
  enabled: true
});

// Send notification
await notificationsService.send({
  recipient: {
    userId: 'user-123'
  },
  content: {
    subject: 'New Message',
    body: 'You have a new message from John',
    data: {
      messageId: 'msg-456',
      from: 'John Doe'
    }
  },
  tenantId: 1,
  channel: 'websocket'
});
```

### Example 2: Broadcast to Channel (Internal Mode)

```typescript
// Send to all users in 'alerts' channel
await notificationsService.send({
  recipient: {
    channel: 'alerts'
  },
  content: {
    subject: 'System Maintenance',
    body: 'System will be down for maintenance at 2 AM',
    data: {
      maintenanceWindow: '2025-01-09T02:00:00Z'
    }
  },
  tenantId: 1,
  channel: 'websocket'
});
```

### Example 3: External Socket.IO Integration

```typescript
// Configure external Socket.IO provider
await tenantService.updateProviderConfig(tenantId, {
  providerType: 'websocket',
  channel: 'websocket',
  mode: 'external',
  protocol: 'socketio',
  url: 'https://external-notifications.com',
  authType: 'bearer',
  authToken: process.env.EXTERNAL_API_TOKEN,
  enableAcknowledgments: true,
  enableReceiving: true,
  subscribeToEvents: ['status:update', 'alert:critical'],
  messageHandling: {
    strategy: 'kafka',
    publishToKafka: true,
    kafkaTopic: 'external.events'
  }
});

// Send notification
await notificationsService.send({
  recipient: {
    userId: 'external-user-789'
  },
  content: {
    subject: 'Order Shipped',
    body: 'Your order #12345 has been shipped'
  },
  tenantId: 1,
  channel: 'websocket'
});
```

### Example 4: Native WebSocket with Compression

```typescript
await tenantService.updateProviderConfig(tenantId, {
  providerType: 'websocket',
  channel: 'websocket',
  mode: 'external',
  protocol: 'ws',
  url: 'wss://api.example.com/notifications',
  authType: 'query',
  authQuery: {
    token: process.env.WS_TOKEN
  },
  enableCompression: true,
  reconnection: true,
  reconnectionAttempts: 5
});
```

## Troubleshooting

### Connection Issues

**Problem**: Provider fails to connect

```
WebSocket validation failed: Connection timeout
```

**Solutions**:
1. Verify the WebSocket URL is correct
2. Check firewall rules allow WebSocket connections
3. Ensure authentication credentials are valid
4. Increase `timeout` value in configuration
5. Check server logs for connection errors

### Authentication Failures

**Problem**: Authentication error

```
WebSocket error: 401 Unauthorized
```

**Solutions**:
1. Verify `authToken` or credentials are correct
2. Check token hasn't expired
3. Ensure `authType` matches server expectations
4. For bearer tokens, verify format: `Bearer <token>`
5. Check custom headers are properly formatted

### Reconnection Issues

**Problem**: Provider not reconnecting after disconnect

```
Max reconnection attempts (5) reached
```

**Solutions**:
1. Increase `reconnectionAttempts`
2. Increase `reconnectionDelay` for rate-limited servers
3. Check network stability
4. Verify server supports reconnection
5. Monitor connection health in logs

### Message Not Delivered

**Problem**: Notifications not received by clients

**Solutions**:
1. Verify user is connected (check `NotificationGateway`)
2. For channels, ensure client joined the channel
3. Check event names match between client/server
4. Enable `enableAcknowledgments` to confirm delivery
5. Check client-side event listeners are registered

### Incoming Messages Not Processed

**Problem**: Messages from external server not handled

**Solutions**:
1. Verify `enableReceiving` is true
2. Check `subscribeToEvents` includes the event name
3. Ensure `messageHandler` is properly injected
4. Verify Kafka/webhook endpoints are reachable
5. Check logs for processing errors

## Performance Considerations

### Connection Pooling

The provider automatically pools connections to the same endpoint:

```typescript
// These will share the same connection
const provider1 = await registry.getProvider('websocket', config1);
const provider2 = await registry.getProvider('websocket', config1); // Reuses connection
```

### Health Monitoring

Connections are monitored every 30 seconds:
- Ping/pong for native WebSocket
- Connection status checks
- Automatic reconnection on failure

### Message Throughput

- **Internal Mode**: 100+ messages/second
- **External Mode**: Depends on server capacity
- Use compression for large payloads
- Consider batching for bulk notifications

### Memory Management

- Connections are released when no subscribers remain
- Automatic cleanup on application shutdown
- Message handlers process async to avoid blocking

## Security Best Practices

### 1. Use Secure Connections

Always use `wss://` (WebSocket Secure) for production:

```json
{
  "url": "wss://secure-server.com/ws"
}
```

### 2. Rotate Authentication Tokens

Regularly update authentication credentials:

```typescript
await tenantService.updateProviderConfig(tenantId, {
  authToken: newToken
});
```

### 3. Validate Incoming Messages

For bidirectional communication, validate message sources:

```typescript
// In callback webhook handler
app.post('/webhooks/websocket', (req, res) => {
  const signature = req.headers['x-signature'];
  if (!validateSignature(signature, req.body)) {
    return res.status(401).send('Invalid signature');
  }
  // Process message
});
```

### 4. Limit Event Subscriptions

Only subscribe to necessary events:

```json
{
  "subscribeToEvents": ["critical:alert", "user:mention"]
}
```

### 5. Use Channel Permissions

Implement access control for channels:

```typescript
gateway.on('channel:join', async (client, data) => {
  const hasPermission = await checkChannelPermission(
    client.data.userId,
    data.channelName
  );
  
  if (!hasPermission) {
    client.emit('error', { message: 'Access denied' });
    return;
  }
  
  await client.join(`channel:${data.channelName}`);
});
```

### 6. Rate Limiting

Implement rate limiting for message sending:

```typescript
// Configure throttler in NestJS
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 100, ttl: 60000 } })
async sendNotification() {
  // ...
}
```

### 7. Monitor and Alert

Set up monitoring for:
- Connection failures
- Authentication errors
- Message delivery failures
- Unusual traffic patterns

---

## Additional Resources

- [Provider Architecture](../PROVIDER_ARCHITECTURE.md)
- [Main Providers Documentation](../PROVIDERS.md)
- [Notification Gateway](../../src/gateways/notification.gateway.ts)
- [WebSocket Provider Source](../../src/common/providers/implementations/websocket/websocket.provider.ts)

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review provider logs for debugging
