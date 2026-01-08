# API Gateway Integration Guide

This document provides guidance for integrating the separate API Gateway with the Notification System.

## Overview

The Notification System exposes multiple protocols for integration:
- **REST API**: Primary interface (HTTP/JSON)
- **gRPC**: High-performance RPC (when implemented)
- **GraphQL**: Flexible queries and subscriptions (when implemented)
- **Kafka**: Event-driven async communication
- **WebSockets**: Real-time bidirectional communication

## REST API Integration

### Base URL
```
http://notification-service:3000
```

### Key Endpoints

#### Service-to-Service
```
POST   /api/v1/services/notifications/send
POST   /api/v1/services/notifications/send-batch
POST   /api/v1/services/notifications/bulk
GET    /api/v1/services/notifications/:id/status
```

#### Admin
```
GET    /api/v1/admin/tenants
POST   /api/v1/admin/tenants
GET    /api/v1/admin/templates
POST   /api/v1/admin/templates
GET    /api/v1/admin/webhooks
POST   /api/v1/admin/webhooks
```

#### User-Facing
```
GET    /api/v1/users/me/notifications
PUT    /api/v1/users/me/notifications/:id/read
GET    /api/v1/users/me/preferences
PUT    /api/v1/users/me/preferences/:channel
```

### Required Headers

When proxying requests from API Gateway:

```typescript
{
  // Tenant identification (required for multi-tenancy)
  'X-Tenant-ID': '123',
  
  // User context (if user authentication)
  'X-User-ID': 'user-uuid-123',
  
  // Service context (if service-to-service)
  'X-Service-ID': 'api-gateway',
  
  // Distributed tracing
  'X-Request-ID': 'unique-request-id',
  'X-Correlation-ID': 'correlation-id',
  
  // Original token (optional - notification system can validate)
  'Authorization': 'Bearer <jwt-token>',
  
  // Standard headers
  'Content-Type': 'application/json',
}
```

### Service Discovery Configuration

**Example routing configuration for API Gateway:**

```typescript
export const notificationServiceConfig = {
  serviceName: 'notification-system',
  version: '1.0.0',
  
  // Endpoints
  rest: {
    baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000',
    healthCheck: '/health',
    metricsPath: '/metrics',
  },
  
  grpc: {
    host: process.env.NOTIFICATION_GRPC_HOST || 'notification-service',
    port: parseInt(process.env.NOTIFICATION_GRPC_PORT || '50051'),
  },
  
  graphql: {
    url: process.env.NOTIFICATION_GRAPHQL_URL || 'http://notification-service:4000/graphql',
  },
  
  // Health check configuration
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds
    retries: 3,
  },
  
  // Circuit breaker configuration
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 60000,
  },
  
  // Retry configuration
  retry: {
    enabled: true,
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 60000,
    max: 100,
  },
};
```

### Routes to Proxy

```typescript
export const notificationRoutes: Route[] = [
  {
    path: '/api/v1/services/notifications/*',
    target: 'http://notification-service:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    auth: true,
    requiredScopes: ['notification:send'],
    rateLimit: { windowMs: 60000, max: 100 },
  },
  {
    path: '/api/v1/admin/tenants/*',
    target: 'http://notification-service:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    auth: true,
    requiredRoles: ['notification-admin'],
    rateLimit: { windowMs: 60000, max: 200 },
  },
  {
    path: '/api/v1/admin/templates/*',
    target: 'http://notification-service:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    auth: true,
    requiredRoles: ['notification-admin', 'notification-manager'],
    rateLimit: { windowMs: 60000, max: 200 },
  },
  {
    path: '/api/v1/admin/webhooks/*',
    target: 'http://notification-service:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    auth: true,
    requiredRoles: ['notification-admin'],
    rateLimit: { windowMs: 60000, max: 100 },
  },
  {
    path: '/api/v1/users/me/notifications/*',
    target: 'http://notification-service:3000',
    methods: ['GET', 'PUT', 'DELETE'],
    auth: true,
    rateLimit: { windowMs: 60000, max: 300 },
  },
  {
    path: '/api/v1/users/me/preferences/*',
    target: 'http://notification-service:3000',
    methods: ['GET', 'PUT'],
    auth: true,
    rateLimit: { windowMs: 60000, max: 100 },
  },
];
```

## gRPC Integration

### Service Definitions

**notification.NotificationService**
```protobuf
service NotificationService {
  rpc SendNotification(SendNotificationRequest) returns (SendNotificationResponse);
  rpc GetNotificationStatus(GetStatusRequest) returns (NotificationStatusResponse);
  rpc GetNotifications(GetNotificationsRequest) returns (GetNotificationsResponse);
  rpc MarkAsRead(MarkAsReadRequest) returns (MarkAsReadResponse);
  rpc StreamNotifications(StreamRequest) returns (stream NotificationEvent);
}
```

**template.TemplateService**
```protobuf
service TemplateService {
  rpc CreateTemplate(CreateTemplateRequest) returns (TemplateResponse);
  rpc GetTemplate(GetTemplateRequest) returns (TemplateResponse);
  rpc UpdateTemplate(UpdateTemplateRequest) returns (TemplateResponse);
  rpc DeleteTemplate(DeleteTemplateRequest) returns (DeleteResponse);
  rpc ListTemplates(ListTemplatesRequest) returns (ListTemplatesResponse);
  rpc PreviewTemplate(PreviewTemplateRequest) returns (PreviewTemplateResponse);
}
```

### Connection Example

```typescript
import { credentials } from '@grpc/grpc-js';
import { NotificationServiceClient } from './generated/notification';

const client = new NotificationServiceClient(
  'notification-service:50051',
  credentials.createInsecure()
);

// Send notification
client.sendNotification({
  tenant_id: 1,
  channel: 'email',
  recipient: { email: 'test@example.com' },
  template_id: 1,
  variables: { name: 'John' },
  priority: 'medium',
}, (error, response) => {
  if (error) {
    console.error('gRPC error:', error);
  } else {
    console.log('Notification sent:', response.notification_uuid);
  }
});
```

## Kafka Integration

### Topics to Subscribe To

**From Notification System:**
```
notification.status.updated    # Notification status changes
template.created               # New template created
template.updated               # Template updated
tenant.created                 # New tenant created
```

**To Notification System:**
```
notification.requested         # Request notification send
```

### Event Schema Example

```typescript
// notification.status.updated event
{
  "eventType": "notification.status.updated",
  "timestamp": "2026-01-08T12:00:00Z",
  "correlationId": "req-123",
  "tenantId": 1,
  "data": {
    "notificationId": 123,
    "uuid": "notif-uuid-123",
    "oldStatus": "queued",
    "newStatus": "sent",
    "channel": "email",
    "updatedAt": "2026-01-08T12:00:01Z"
  }
}
```

### Kafka Client Configuration

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: [process.env.KAFKA_BROKERS || 'kafka:29092'],
});

const consumer = kafka.consumer({ groupId: 'api-gateway-group' });

await consumer.connect();
await consumer.subscribe({ 
  topics: [
    'notification.status.updated',
    'template.created',
    'template.updated',
  ],
  fromBeginning: false 
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());
    console.log('Received event:', event);
    
    // Process event (e.g., update cache, notify clients)
  },
});
```

## GraphQL Federation (When Implemented)

### Subgraph URL
```
http://notification-service:4000/graphql
```

### Gateway Configuration
```typescript
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { 
        name: 'notifications', 
        url: 'http://notification-service:4000/graphql' 
      },
      { 
        name: 'users', 
        url: 'http://user-service:4000/graphql' 
      },
      // ... other services
    ],
  }),
});
```

## Authentication Flow

### Option 1: Gateway Validates, Passes Context
```
Client 
  → API Gateway (validates JWT with Keycloak)
  → Adds X-User-ID, X-Tenant-ID headers
  → Notification Service (trusts headers from gateway, skips validation)
```

**Implementation**: Notification system checks for `X-Service-ID: api-gateway` header and trusts user context.

### Option 2: Notification Service Validates (Current)
```
Client 
  → API Gateway (passes JWT through)
  → Notification Service (validates JWT with Keycloak directly)
```

**Implementation**: Current default, most secure.

### Option 3: Hybrid (Recommended)
```
Client 
  → API Gateway (validates, adds context headers)
  → Notification Service (re-validates for sensitive operations)
```

**Implementation**: Best of both worlds.

## Shared Infrastructure Access

### Environment Variables for API Gateway

```bash
# PostgreSQL (if shared)
DATABASE_URL=postgresql://user:pass@postgres:5432/api_gateway_db

# Redis (shared)
REDIS_URL=redis://redis:6379

# Kafka (shared)
KAFKA_BROKERS=kafka:29092
KAFKA_CLIENT_ID=api-gateway
KAFKA_GROUP_ID=api-gateway-group

# Keycloak (shared)
KEYCLOAK_SERVER_URL=http://keycloak:8080
KEYCLOAK_REALM=notification

# Elasticsearch (shared)
ELASTICSEARCH_URL=http://elasticsearch:9200

# Jaeger (shared)
JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# Notification Service URLs
NOTIFICATION_SERVICE_URL=http://notification-service:3000
NOTIFICATION_GRPC_URL=notification-service:50051
NOTIFICATION_GRAPHQL_URL=http://notification-service:4000/graphql
```

## Docker Network Configuration

Both services should be on the same Docker network:

```yaml
# In API Gateway's docker-compose.yml
networks:
  default:
    external:
      name: notification-network
```

## Health Checks

API Gateway should monitor notification service health:

```typescript
setInterval(async () => {
  try {
    const response = await fetch('http://notification-service:3000/health');
    const health = await response.json();
    
    if (health.status !== 'ok') {
      console.warn('Notification service unhealthy:', health);
      // Open circuit breaker
    }
  } catch (error) {
    console.error('Notification service unreachable:', error);
    // Open circuit breaker
  }
}, 30000); // Every 30 seconds
```

## Load Balancing

If running multiple notification service instances:

```typescript
// API Gateway load balancing config
const notificationInstances = [
  'http://notification-service-1:3000',
  'http://notification-service-2:3000',
  'http://notification-service-3:3000',
];

// Round-robin or least-connections strategy
function getNextInstance() {
  // Implementation
}
```

## Error Handling

API Gateway should handle notification service errors:

```typescript
try {
  const response = await circuitBreaker.execute(
    'notification-service',
    () => httpClient.post(url, data, { headers })
  );
  return response.data;
} catch (error) {
  if (error.name === 'CircuitBreakerOpenError') {
    // Circuit breaker open - service is down
    return {
      statusCode: 503,
      message: 'Notification service temporarily unavailable',
      retryAfter: 60,
    };
  } else if (error.name === 'TimeoutError') {
    // Request timeout
    return {
      statusCode: 504,
      message: 'Notification service timeout',
    };
  } else {
    // Other errors
    return {
      statusCode: error.response?.status || 500,
      message: error.message,
    };
  }
}
```

## Rate Limiting Coordination

API Gateway and Notification Service should coordinate rate limits:

- **API Gateway**: Apply rate limits based on client/user
- **Notification Service**: Apply rate limits based on tenant
- **Recommendation**: API Gateway enforces stricter limits to protect all services

## Example API Gateway Routes

```typescript
// routes/notification.routes.ts
import { Router } from 'express';
import { proxyMiddleware } from '../middleware/proxy';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';

const router = Router();

// All notification routes go through:
// 1. Authentication
// 2. Rate limiting
// 3. Circuit breaker
// 4. Proxy to notification service

router.use('/api/v1/services/notifications', 
  authMiddleware({ requiredScopes: ['notification:send'] }),
  rateLimitMiddleware({ windowMs: 60000, max: 100 }),
  proxyMiddleware({ 
    target: 'http://notification-service:3000',
    changeOrigin: true,
    pathRewrite: {},
  })
);

router.use('/api/v1/admin/templates',
  authMiddleware({ requiredRoles: ['notification-admin'] }),
  rateLimitMiddleware({ windowMs: 60000, max: 200 }),
  proxyMiddleware({ 
    target: 'http://notification-service:3000',
    changeOrigin: true,
  })
);

export default router;
```

## Testing Integration

### Test 1: API Gateway → Notification Service
```bash
# Through API Gateway
curl -X POST http://api-gateway:8000/api/v1/services/notifications/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Verify it reaches notification service
# Check notification service logs
docker logs notification-service
```

### Test 2: Kafka Integration
```bash
# API Gateway publishes event
kafka-console-producer --topic notification.requested \
  --bootstrap-server kafka:9092

# Notification service consumes it
# Check notification service logs for processing
```

### Test 3: Circuit Breaker
```bash
# Stop notification service
docker stop notification-service

# Make request through API Gateway
curl http://api-gateway:8000/api/v1/services/notifications/send

# Expected: 503 Service Unavailable after threshold
# Circuit breaker should open

# Restart notification service
docker start notification-service

# Wait for reset timeout
# Circuit breaker should close and allow requests
```

## Monitoring API Gateway → Notification Service

### Metrics to Track

```
# In API Gateway
gateway_notification_service_requests_total
gateway_notification_service_errors_total
gateway_notification_service_duration_seconds
gateway_notification_service_circuit_breaker_state

# In Notification Service
http_requests_total{source="api-gateway"}
```

### Distributed Tracing

Ensure correlation IDs are propagated:

```typescript
// API Gateway middleware
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || generateUUID();
  req.correlationId = correlationId;
  
  // Pass to notification service
  req.headers['x-correlation-id'] = correlationId;
  
  next();
});
```

View traces in Jaeger spanning both services:
```
Client Request → API Gateway → Notification Service → Database
                                                    → Kafka
                                                    → Redis
```

## Security Considerations

### 1. Service-to-Service Authentication
- API Gateway should use service account credentials
- Notification service validates service tokens
- mTLS for production (gRPC)

### 2. Header Validation
- Notification service should validate `X-Service-ID`
- Only trust headers from known services
- Implement IP allowlisting if needed

### 3. Encryption
- Use HTTPS/TLS for REST
- Use TLS for gRPC in production
- Encrypt sensitive data in transit

## Docker Compose Integration

### Shared Network
```yaml
# docker-compose.yml (both projects)
networks:
  microservices:
    external: true
    name: notification-network
```

### Service Dependencies
```yaml
# API Gateway docker-compose.yml
services:
  api-gateway:
    depends_on:
      - redis
      - kafka
      - keycloak
    environment:
      - NOTIFICATION_SERVICE_URL=http://notification-service:3000
    networks:
      - notification-network

# Notification System docker-compose.yml
services:
  notification-service:
    depends_on:
      - postgres
      - redis
      - kafka
    networks:
      - notification-network
```

## Complete Example: Send Notification Through Gateway

```typescript
// API Gateway: Proxy request
async function handleNotificationSend(req, res) {
  const user = req.user; // From auth middleware
  const tenantId = user.tenantId;
  
  // Add context headers
  const headers = {
    ...req.headers,
    'X-User-ID': user.id,
    'X-Tenant-ID': tenantId.toString(),
    'X-Service-ID': 'api-gateway',
    'X-Request-ID': req.requestId,
    'X-Correlation-ID': req.correlationId,
  };
  
  try {
    // Send with circuit breaker and retry
    const response = await circuitBreaker.execute(
      'notification-service',
      () => retryService.executeWithRetry(
        'send-notification',
        () => axios.post(
          'http://notification-service:3000/api/v1/services/notifications/send',
          req.body,
          { headers }
        )
      )
    );
    
    res.json(response.data);
  } catch (error) {
    handleError(error, res);
  }
}
```

---

**Integration Status**: Ready  
**Documentation**: Complete  
**Support**: See main README.md
