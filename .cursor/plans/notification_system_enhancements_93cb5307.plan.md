---
name: Enterprise Notification Microservices System
overview: Transform notification system into enterprise-grade microservices architecture with API Gateway, multiple communication protocols (Kafka, gRPC, GraphQL, WebSockets), comprehensive observability (ELK + Grafana/Prometheus), resilience patterns, and all original enhancements (API versioning, templates, webhooks, DTOs).
todos:
  - id: microservices-structure
    content: Create microservices project structure (api-gateway, core-service, worker-services)
    status: completed
  - id: docker-compose-expansion
    content: Expand docker-compose with ELK, Grafana, Prometheus, and service mesh
    status: pending
  - id: grpc-setup
    content: Setup gRPC proto definitions and code generation
    status: pending
  - id: kafka-integration
    content: Implement Kafka producers, consumers, and event contracts
    status: pending
  - id: grpc-graphql-setup
    content: Setup gRPC and GraphQL endpoints in notification service
    status: pending
  - id: communication-layer
    content: Setup Redis pub/sub and inter-service communication patterns
    status: pending
  - id: resilience-patterns
    content: Implement circuit breaker, retry, bulkhead, and timeout patterns
    status: pending
  - id: config-service
    content: Create database-driven configuration service with lookups
    status: pending
  - id: feature-flags
    content: Implement feature flags for observability stack switching
    status: pending
  - id: elk-stack
    content: Setup ELK stack with structured logging and log shipping
    status: pending
  - id: prometheus-grafana
    content: Setup Prometheus metrics and Grafana dashboards
    status: pending
  - id: distributed-tracing
    content: Implement OpenTelemetry for distributed tracing
    status: pending
  - id: api-versioning
    content: Implement NestJS URI versioning across all controllers
    status: completed
  - id: template-schema
    content: Create new database schemas for template categories, versions, and localizations
    status: completed
  - id: template-service
    content: Enhance templates service with categories, versioning, and localization
    status: completed
  - id: template-endpoints
    content: Add new template controller endpoints for enhanced features
    status: completed
  - id: default-templates
    content: Create default template seed data and integrate with tenant creation
    status: completed
  - id: webhook-schema
    content: Create webhook configuration database schema
    status: completed
  - id: webhook-service
    content: Implement webhook configuration service and enhance webhook client
    status: completed
  - id: webhook-endpoints
    content: Create webhook configuration API endpoints
    status: completed
  - id: dto-swagger
    content: Add @ApiProperty decorators to all DTOs
    status: completed
  - id: oauth-fix
    content: Debug and fix OAuth2 redirect JavaScript errors
    status: completed
  - id: migrations
    content: Generate and test all database migrations
    status: completed
  - id: integration-tests
    content: Create integration tests for microservices communication
    status: pending
  - id: e2e-tests
    content: Create end-to-end tests across all services
    status: pending
  - id: api-documentation
    content: Generate comprehensive API documentation for all protocols
    status: pending
---

# Enterprise Notification Microservices System

## Executive Summary

Transform the existing modular monolith into an enterprise-grade, hybrid microservices architecture while maintaining the ability to run as a single service. The system will support multiple communication protocols, comprehensive observability, resilience patterns, and database-driven configuration for maximum flexibility.

### Key Architecture Decisions

**1. Repository Structure**

- **This Repository (notification-system)**: Contains all notification services, workers, and processors
- **Separate Repository (api-gateway)**: Standalone API Gateway project (maintained separately)
- **Shared Infrastructure**: Kafka, Redis, ELK, Prometheus/Grafana, Jaeger - accessible by all services

**2. Communication Model**

- API Gateway → Notification System: REST, gRPC, Kafka, GraphQL
- Notification System ↔ Workers: Kafka events, Redis pub/sub
- All Services → Shared Infrastructure: Direct connections

**3. Deployment Flexibility**

- **All-in-One**: Single process for development
- **Separate Workers**: Main service + individual worker processes
- **Containerized**: Docker Compose with horizontal scaling
- **Kubernetes**: Production-ready with auto-scaling

**4. Observability**

- Feature-flagged support for both ELK and Prometheus/Grafana stacks
- OpenTelemetry for distributed tracing
- All services send logs/metrics to shared infrastructure

## Architecture Overview

### System Architecture (Multi-Repository)

```mermaid
graph TB
    subgraph external [External Systems]
        clients[Clients/Apps]
        keycloak[Keycloak Auth]
        thirdparty[3rd Party Services]
    end
    
    subgraph gatewayRepo [API Gateway - Separate Repository]
        apiGateway[API Gateway Service]
        authProxy[Auth Proxy]
        rateLimiter[Rate Limiter]
        routing[Dynamic Routing]
    end
    
    subgraph notificationRepo [Notification System - This Repository]
        notificationCore[Notification Core Service]
        templateService[Template Service]
        workers[Channel Workers]
    end
    
    subgraph sharedInfra [Shared Infrastructure - All Services]
        kafka[Kafka Event Bus]
        redis[Redis Cache/PubSub]
        elk[ELK Stack]
        prometheus[Prometheus]
        grafana[Grafana]
        jaeger[Jaeger Tracing]
    end
    
    subgraph dataLayer [Data Layer]
        notificationDB[(Notification DB)]
        keycloakDB[(Keycloak DB)]
    end
    
    clients --> apiGateway
    apiGateway --> keycloak
    apiGateway --> notificationCore
    apiGateway --> templateService
    
    notificationCore --> kafka
    notificationCore --> redis
    notificationCore --> notificationDB
    
    templateService --> redis
    templateService --> notificationDB
    
    kafka --> workers
    workers --> redis
    workers --> thirdparty
    workers --> notificationDB
    
    keycloak --> keycloakDB
    
    apiGateway -.logs.-> elk
    notificationCore -.logs.-> elk
    templateService -.logs.-> elk
    workers -.logs.-> elk
    
    apiGateway -.metrics.-> prometheus
    notificationCore -.metrics.-> prometheus
    templateService -.metrics.-> prometheus
    workers -.metrics.-> prometheus
    
    prometheus --> grafana
    
    apiGateway -.traces.-> jaeger
    notificationCore -.traces.-> jaeger
    templateService -.traces.-> jaeger
    workers -.traces.-> jaeger
```

### Repository Structure

**This Repository (notification-system):**

- Notification Core Service
- Template Service  
- Channel Workers (Email, SMS, FCM, WhatsApp)
- Shared libraries for this system

**Separate Repository (api-gateway):**

- API Gateway implementation
- Routing configuration
- Authentication proxy
- Rate limiting
- Service discovery

**Shared Infrastructure (Docker Compose / K8s):**

- Kafka cluster
- Redis cluster
- ELK stack (Elasticsearch, Logstash, Kibana)
- Prometheus + Grafana
- Jaeger tracing
- Keycloak

## Phase 1: Microservices Foundation

### 1.1 Project Structure Reorganization

**This Repository: notification-system**

Transform the existing structure to support multiple deployment modes (hybrid monolith or separate services):

```
notification-system/                    # THIS REPOSITORY
├── src/
│   ├── main.ts                        # Main application (can run all or specific service)
│   ├── app.module.ts
│   │
│   ├── modules/                       # Domain modules (existing + enhanced)
│   │   ├── notifications/
│   │   ├── templates/                 # Enhanced with categories, versions, i18n
│   │   ├── tenants/
│   │   ├── preferences/
│   │   ├── providers/
│   │   ├── lookups/
│   │   ├── webhooks/                  # Enhanced with configuration
│   │   ├── bulk-jobs/
│   │   ├── user-notifications/
│   │   └── auth/
│   │
│   ├── processors/                    # Channel workers (can run separately)
│   │   ├── email.processor.ts
│   │   ├── sms.processor.ts
│   │   ├── fcm.processor.ts
│   │   ├── whatsapp.processor.ts
│   │   └── database.processor.ts
│   │
│   ├── grpc/                          # NEW: gRPC controllers
│   │   ├── notification.controller.ts
│   │   ├── template.controller.ts
│   │   └── tenant.controller.ts
│   │
│   ├── graphql/                       # NEW: GraphQL resolvers
│   │   ├── notification.resolver.ts
│   │   ├── template.resolver.ts
│   │   └── schema.gql
│   │
│   ├── events/                        # Kafka integration (existing + enhanced)
│   │   ├── event-producer.service.ts
│   │   ├── event-consumer.service.ts
│   │   └── schemas/                   # Event type definitions
│   │
│   ├── common/                        # Shared utilities
│   │   ├── resilience/                # NEW: Circuit breaker, retry, bulkhead
│   │   ├── observability/             # NEW: Logging, metrics, tracing
│   │   ├── interceptors/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── middleware/
│   │   └── decorators/
│   │
│   ├── database/                      # Database layer
│   │   ├── schema/                    # Enhanced schemas
│   │   ├── migrations/
│   │   └── seeds/
│   │
│   ├── queues/                        # BullMQ queues
│   └── gateways/                      # WebSocket gateway
│
├── proto/                             # NEW: Protocol Buffers for gRPC
│   ├── notification.proto
│   ├── template.proto
│   ├── tenant.proto
│   └── common.proto
│
├── docker/                            # Docker configurations
│   ├── Dockerfile                     # Main service
│   ├── Dockerfile.worker              # Worker-only mode
│   └── docker-compose.local.yml       # Local dev with all dependencies
│
├── infrastructure/                    # Shared infra configs (reference)
│   ├── kafka/
│   │   └── topics.json
│   ├── redis/
│   │   └── redis.conf
│   └── observability/
│       ├── prometheus/
│       │   └── prometheus.yml
│       ├── grafana/
│       │   └── dashboards/
│       └── logstash/
│           └── pipeline/
│
├── scripts/
│   ├── generate-proto.sh              # Generate TypeScript from .proto
│   ├── start-workers.sh               # Start all workers
│   └── seed-all.sh
│
├── test/                              # E2E and integration tests
├── .env.example                       # Updated with all new configs
├── package.json
├── tsconfig.json
└── README.md
```

**Separate Repository: api-gateway (reference only)**

The API Gateway is maintained separately with these responsibilities:

- Route management and service discovery
- Authentication/authorization (Keycloak integration)
- Rate limiting and throttling
- Request/response transformation
- GraphQL Federation gateway
- Circuit breaker for outbound calls
- Metrics and tracing aggregation

Communication with notification-system via:

- REST API
- gRPC (for sync operations)
- Kafka events (for async operations)
- GraphQL queries/mutations

**Shared Infrastructure (docker-compose or K8s)**

All services connect to shared infrastructure:

- Kafka cluster
- Redis cluster  
- ELK stack
- Prometheus + Grafana
- Jaeger
- PostgreSQL (or separate DBs per service)

### 1.2 Hybrid Deployment Modes

This notification system supports multiple deployment modes:

**Mode 1: All-in-One (Current - Enhanced)**

```bash
npm run start:dev
# Runs: API + Workers + WebSocket Gateway in single process
```

**Mode 2: Separate Workers**

```bash
# Terminal 1: Main service
npm run start:service

# Terminal 2-5: Individual workers
npm run start:worker:email
npm run start:worker:sms
npm run start:worker:fcm
npm run start:worker:whatsapp
```

**Mode 3: Docker Compose (Horizontal Scaling)**

```yaml
services:
  notification-service: { replicas: 3 }
  email-worker: { replicas: 5 }
  sms-worker: { replicas: 3 }
```

**Mode 4: Kubernetes (Production)**

```yaml
# Separate deployments with HPA
# Auto-scaling based on CPU, memory, and queue depth
```

**Package.json Scripts to Add:**

````json
{
  "scripts": {
    "start:service": "nest start",
    "start:worker:email": "nest start --entryFile workers/email",
    "start:worker:sms": "nest start --entryFile workers/sms",
    "start:worker:fcm": "nest start --entryFile workers/fcm",
    "start:worker:whatsapp": "nest start --entryFile workers/whatsapp",
    "start:all": "concurrently \"npm:start:service\" \"npm:start:worker:*\"",
    "proto:generate": "sh scripts/generate-proto.sh",
    "docker:build": "docker build -t notification-service:latest .",
    "docker:build:worker": "docker build -f docker/Dockerfile.worker -t notification-worker:latest ."
  }
}

### 1.3 Docker Compose Configuration

**Local Development: docker-compose.local.yml**

For local development, extend the existing [`docker-compose.yml`](docker-compose.yml) with observability stack:

```yaml
# docker-compose.local.yml - Extends existing docker-compose.yml
version: '3.8'

services:
  # Notification Service (this repository)
  notification-service:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports: 
      - "3000:3000"      # REST API
      - "50051:50051"    # gRPC
      - "4000:4000"      # GraphQL
    depends_on:
      - postgres
      - redis
      - kafka
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://notification:notification@postgres:5432/notification_db
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKERS=kafka:29092
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - JAEGER_ENDPOINT=http://jaeger:14268/api/traces
    volumes:
      - .:/app
      - /app/node_modules

  # Email Worker (separate process)
  email-worker:
    build:
      context: .
      dockerfile: docker/Dockerfile.worker
    command: npm run start:worker:email
    depends_on: [kafka, redis, postgres]
    environment:
      - WORKER_TYPE=email
      - KAFKA_BROKERS=kafka:29092
      - REDIS_URL=redis://redis:6379
    deploy:
      replicas: 2

  # SMS Worker
  sms-worker:
    build:
      context: .
      dockerfile: docker/Dockerfile.worker
    command: npm run start:worker:sms
    depends_on: [kafka, redis, postgres]
    environment:
      - WORKER_TYPE=sms
      - KAFKA_BROKERS=kafka:29092
    deploy:
      replicas: 2

  # Existing services: postgres, redis, kafka, zookeeper, keycloak
  # (Already defined in docker-compose.yml)

  # Observability Stack
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: notification-elasticsearch
    ports: ["9200:9200", "9300:9300"]
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - notification-network

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    container_name: notification-logstash
    ports: ["5000:5000"]
    volumes:
      - ./infrastructure/logstash/pipeline:/usr/share/logstash/pipeline
    depends_on:
      - elasticsearch
    networks:
      - notification-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: notification-kibana
    ports: ["5601:5601"]
    depends_on:
      - elasticsearch
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - notification-network

  prometheus:
    image: prom/prometheus:latest
    container_name: notification-prometheus
    ports: ["9090:9090"]
    volumes:
      - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - notification-network

  grafana:
    image: grafana/grafana:latest
    container_name: notification-grafana
    ports: ["3001:3000"]
    depends_on:
      - prometheus
    volumes:
      - ./infrastructure/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./infrastructure/grafana/datasources:/etc/grafana/provisioning/datasources
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - notification-network

  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: notification-jaeger
    ports: 
      - "6831:6831/udp"   # Jaeger agent
      - "16686:16686"     # Jaeger UI
      - "14268:14268"     # Jaeger collector
      - "14250:14250"     # gRPC
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - notification-network

volumes:
  elasticsearch-data:
  prometheus-data:
  grafana-data:

networks:
  notification-network:
    external: true  # Shared with other services
````

**Shared Infrastructure: docker-compose.infrastructure.yml**

Create a separate compose file for shared infrastructure (can be run independently):

```yaml
# docker-compose.infrastructure.yml - Shared across all microservices
version: '3.8'

services:
  # Kafka cluster (already in docker-compose.yml, reference only)
  # Redis cluster (already in docker-compose.yml, reference only)
  # ELK stack (defined above)
  # Prometheus + Grafana (defined above)
  # Jaeger (defined above)

networks:
  notification-network:
    name: notification-network
    driver: bridge
```

**Running the System:**

```bash
# Start shared infrastructure first (if not already running)
docker-compose -f docker-compose.yml up -d postgres redis kafka keycloak

# Start observability stack
docker-compose -f docker-compose.local.yml up -d elasticsearch logstash kibana prometheus grafana jaeger

# Start notification service + workers
docker-compose -f docker-compose.local.yml up -d notification-service email-worker sms-worker

# API Gateway runs from its separate repository
# (connects to same Kafka, Redis, ELK, etc.)
```

## Phase 2: Communication Protocols

### 2.1 gRPC Implementation

**Proto Definitions:**

Create [`proto/notification.proto`](proto/notification.proto):

```protobuf
syntax = "proto3";

package notification;

service NotificationService {
  rpc SendNotification(SendNotificationRequest) returns (SendNotificationResponse);
  rpc GetNotificationStatus(GetStatusRequest) returns (NotificationStatusResponse);
  rpc MarkAsRead(MarkAsReadRequest) returns (MarkAsReadResponse);
  rpc StreamNotifications(StreamRequest) returns (stream NotificationEvent);
}

message SendNotificationRequest {
  int64 tenant_id = 1;
  string channel = 2;
  Recipient recipient = 3;
  int64 template_id = 4;
  map<string, string> variables = 5;
  string priority = 6;
}

message Recipient {
  string user_id = 1;
  string email = 2;
  string phone = 3;
}

message SendNotificationResponse {
  string notification_uuid = 1;
  string status = 2;
  int64 notification_id = 3;
}

// ... more messages
```

**Code Generation:**

```bash
npm install @grpc/grpc-js @grpc/proto-loader
npm install -D @types/node

# Generate TypeScript code
protoc --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./libs/proto/src \
  --ts_proto_opt=nestJs=true \
  --ts_proto_opt=addGrpcMetadata=true \
  ./proto/*.proto
```

**gRPC Controller:**

Create `apps/notification-core/src/grpc/notification.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Controller()
export class NotificationGrpcController {
  @GrpcMethod('NotificationService', 'SendNotification')
  async sendNotification(data: SendNotificationRequest): Promise<SendNotificationResponse> {
    // Implementation
  }

  @GrpcStreamMethod('NotificationService', 'StreamNotifications')
  streamNotifications(data: Observable<StreamRequest>): Observable<NotificationEvent> {
    // Server streaming implementation
  }
}
```

**gRPC Module Setup:**

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NOTIFICATION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'notification',
          protoPath: join(__dirname, '../../../proto/notification.proto'),
          url: 'localhost:50051',
        },
      },
    ]),
  ],
})
export class GrpcModule {}
```

### 2.2 GraphQL Federation

**Install Dependencies:**

```bash
npm install @nestjs/graphql @nestjs/apollo @apollo/subgraph graphql
```

**Schema Definition:**

Create `apps/notification-core/src/graphql/notification.schema.ts`:

```typescript
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class Notification {
  @Field(() => ID)
  id: number;

  @Field()
  uuid: string;

  @Field()
  channel: string;

  @Field()
  status: string;

  @Field(() => Int)
  tenantId: number;

  @Field({ nullable: true })
  recipientEmail?: string;

  @Field(() => Date)
  createdAt: Date;
}
```

**Resolver:**

```typescript
import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';

const pubSub = new PubSub();

@Resolver(() => Notification)
export class NotificationResolver {
  @Query(() => [Notification])
  async notifications(
    @Args('tenantId', { type: () => Int }) tenantId: number,
  ): Promise<Notification[]> {
    return this.notificationService.findAll(tenantId);
  }

  @Mutation(() => Notification)
  async sendNotification(
    @Args('input') input: SendNotificationInput,
  ): Promise<Notification> {
    const notification = await this.notificationService.send(input);
    pubSub.publish('notificationSent', { notificationSent: notification });
    return notification;
  }

  @Subscription(() => Notification, {
    filter: (payload, variables) => {
      return payload.notificationSent.tenantId === variables.tenantId;
    },
  })
  notificationSent(@Args('tenantId', { type: () => Int }) tenantId: number) {
    return pubSub.asyncIterator('notificationSent');
  }
}
```

**API Gateway GraphQL Federation:**

```typescript
// api-gateway GraphQL module
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'notifications', url: 'http://notification-core:3001/graphql' },
            { name: 'templates', url: 'http://template-service:3002/graphql' },
          ],
        }),
      },
    }),
  ],
})
export class GraphqlGatewayModule {}
```

### 2.3 Kafka Event-Driven Architecture

**Event Schemas:**

Create `libs/events/src/notification-events.ts`:

```typescript
export enum NotificationEventType {
  NOTIFICATION_REQUESTED = 'notification.requested',
  NOTIFICATION_QUEUED = 'notification.queued',
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_DELIVERED = 'notification.delivered',
  NOTIFICATION_FAILED = 'notification.failed',
  NOTIFICATION_READ = 'notification.read',
}

export interface NotificationRequestedEvent {
  eventType: NotificationEventType.NOTIFICATION_REQUESTED;
  timestamp: string;
  data: {
    notificationId: number;
    uuid: string;
    tenantId: number;
    channel: string;
    recipient: {
      userId?: string;
      email?: string;
      phone?: string;
    };
    templateId?: number;
    directContent?: any;
    priority: string;
  };
}

// ... other event interfaces
```

**Kafka Producer Service:**

Create `apps/notification-core/src/events/kafka-producer.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private kafka: Kafka;
  private producer: Producer;

  constructor(private configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'notification-core',
      brokers: this.configService.get<string[]>('kafka.brokers'),
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async publishEvent<T>(topic: string, event: T): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key: (event as any).data?.notificationId?.toString(),
          value: JSON.stringify(event),
          timestamp: Date.now().toString(),
        },
      ],
    });
  }
}
```

**Kafka Consumer (Worker):**

Create `apps/email-worker/src/kafka-consumer.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { EmailProcessor } from './email.processor';

@Injectable()
export class KafkaConsumerService implements OnModuleInit {
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(private emailProcessor: EmailProcessor) {
    this.kafka = new Kafka({
      clientId: 'email-worker',
      brokers: ['kafka:29092'],
    });
    this.consumer = this.kafka.consumer({ groupId: 'email-worker-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ 
      topics: ['notification.email.requested'],
      fromBeginning: false
    });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const event = JSON.parse(payload.message.value.toString());
        await this.emailProcessor.process(event);
      },
    });
  }
}
```

**Topic Configuration:**

Create `infrastructure/kafka/topics.json`:

```json
{
  "topics": [
    {
      "name": "notification.requested",
      "partitions": 10,
      "replicationFactor": 1
    },
    {
      "name": "notification.email.requested",
      "partitions": 5,
      "replicationFactor": 1
    },
    {
      "name": "notification.sms.requested",
      "partitions": 5,
      "replicationFactor": 1
    },
    {
      "name": "notification.status.updated",
      "partitions": 10,
      "replicationFactor": 1
    }
  ]
}
```

### 2.4 Redis Pub/Sub for Real-time Updates

**Redis Publisher:**

```typescript
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisPubSubService {
  private publisher: Redis;
  private subscriber: Redis;

  constructor() {
    this.publisher = new Redis({ host: 'redis', port: 6379 });
    this.subscriber = new Redis({ host: 'redis', port: 6379 });
  }

  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  subscribe(channel: string, callback: (message: any) => void): void {
    this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(JSON.parse(msg));
      }
    });
  }
}
```

## Phase 3: API Gateway Integration (Separate Repository)

**Note:** API Gateway is a separate repository. This section provides integration guidelines.

### 3.1 API Gateway Communication with Notification System

The API Gateway should communicate with this notification system through:

**1. REST API Endpoints** (Primary)

```
Base URL: http://notification-service:3000/api/v1

Endpoints:
- GET    /notifications
- POST   /notifications/send
- POST   /notifications/batch
- GET    /templates
- POST   /templates
- GET    /tenants
- POST   /webhooks/configure
...
```

**2. gRPC Services** (For sync operations)

```
Host: notification-service:50051

Services:
- NotificationService
- TemplateService
- TenantService
```

**3. GraphQL Endpoint** (Optional)

```
URL: http://notification-service:4000/graphql

Supports:
- Queries (get notifications, templates)
- Mutations (send notification, create template)
- Subscriptions (real-time notification updates)
```

**4. Kafka Events** (For async operations)

```
Topics:
- notification.requested
- notification.status.updated
- template.created
- template.updated
```

### 3.2 Service Discovery Configuration

**API Gateway routing.config.ts (example):**

```typescript
export const notificationServiceRoutes = {
  serviceName: 'notification-system',
  baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000',
  grpcUrl: process.env.NOTIFICATION_GRPC_URL || 'notification-service:50051',
  graphqlUrl: process.env.NOTIFICATION_GRAPHQL_URL || 'http://notification-service:4000/graphql',
  
  routes: [
    {
      path: '/api/v1/notifications',
      target: 'http://notification-service:3000/api/v1/notifications',
      auth: true,
      rateLimit: { windowMs: 60000, max: 100 },
    },
    {
      path: '/api/v1/templates',
      target: 'http://notification-service:3000/api/v1/templates',
      auth: true,
      rateLimit: { windowMs: 60000, max: 200 },
    },
    // ... more routes
  ],
  
  healthCheck: {
    url: 'http://notification-service:3000/health',
    interval: 30000,
  },
};
```

### 3.3 Authentication Flow

**Option 1: API Gateway handles auth, passes validated user context**

```
Client → API Gateway (validates JWT with Keycloak)
       → Adds X-User-Id, X-Tenant-Id headers
       → Notification Service (trusts headers from gateway)
```

**Option 2: Notification Service validates auth directly (current)**

```
Client → API Gateway (passes JWT through)
       → Notification Service (validates with Keycloak directly)
```

**Recommended: Hybrid**

- API Gateway validates for public endpoints
- Notification Service re-validates for sensitive operations
- Service-to-service calls use service accounts

### 3.4 Required Headers from API Gateway

When API Gateway proxies requests to notification system:

```typescript
{
  'X-Tenant-ID': '123',              // Tenant context
  'X-User-ID': 'user-uuid',          // User context (if user auth)
  'X-Service-ID': 'service-name',    // Service context (if service auth)
  'X-Request-ID': 'unique-id',       // Tracing
  'X-Correlation-ID': 'trace-id',    // Distributed tracing
  'Authorization': 'Bearer <token>', // Original token (optional)
}
```

### 3.5 Circuit Breaker Configuration

API Gateway should implement circuit breaker for notification service:

```typescript
{
  serviceName: 'notification-service',
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,        // 30 seconds
    resetTimeout: 60000,   // 1 minute
  },
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  }
}
```

## Phase 4: Resilience Patterns

### 4.1 Circuit Breaker Pattern

Create `libs/resilience/src/circuit-breaker.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

@Injectable()
export class CircuitBreakerService {
  private circuits = new Map<string, {
    state: CircuitState;
    failures: number;
    successes: number;
    nextAttempt: number;
    config: CircuitConfig;
  }>();

  private readonly logger = new Logger(CircuitBreakerService.name);

  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitConfig>,
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(serviceName, config);

    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() < circuit.nextAttempt) {
        throw new Error(`Circuit breaker OPEN for ${serviceName}`);
      }
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successes = 0;
    }

    try {
      const result = await Promise.race([
        operation(),
        this.timeout(circuit.config.timeout),
      ]);

      this.onSuccess(serviceName);
      return result as T;
    } catch (error) {
      this.onFailure(serviceName);
      throw error;
    }
  }

  private getOrCreateCircuit(serviceName: string, config?: Partial<CircuitConfig>) {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        nextAttempt: 0,
        config: {
          failureThreshold: config?.failureThreshold || 5,
          successThreshold: config?.successThreshold || 2,
          timeout: config?.timeout || 10000,
          resetTimeout: config?.resetTimeout || 60000,
        },
      });
    }
    return this.circuits.get(serviceName)!;
  }

  private onSuccess(serviceName: string) {
    const circuit = this.circuits.get(serviceName)!;
    circuit.failures = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;
      if (circuit.successes >= circuit.config.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        this.logger.log(`Circuit breaker CLOSED for ${serviceName}`);
      }
    }
  }

  private onFailure(serviceName: string) {
    const circuit = this.circuits.get(serviceName)!;
    circuit.failures++;
    circuit.successes = 0;

    if (circuit.failures >= circuit.config.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttempt = Date.now() + circuit.config.resetTimeout;
      this.logger.warn(`Circuit breaker OPEN for ${serviceName}`);
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), ms);
    });
  }
}
```

### 4.2 Retry with Exponential Backoff

Create `libs/resilience/src/retry.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
  ): Promise<T> {
    const finalConfig: RetryConfig = {
      maxRetries: config.maxRetries || 3,
      initialDelay: config.initialDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      backoffMultiplier: config.backoffMultiplier || 2,
    };

    let lastError: any;
    let delay = finalConfig.initialDelay;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < finalConfig.maxRetries) {
          this.logger.warn(
            `Retry attempt ${attempt + 1}/${finalConfig.maxRetries} failed. Retrying in ${delay}ms...`,
          );
          
          await this.sleep(delay);
          delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4.3 Bulkhead Pattern

Create `libs/resilience/src/bulkhead.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BulkheadService {
  private pools = new Map<string, {
    maxConcurrent: number;
    queue: Array<() => void>;
    running: number;
  }>();

  private readonly logger = new Logger(BulkheadService.name);

  async execute<T>(
    poolName: string,
    operation: () => Promise<T>,
    maxConcurrent = 10,
  ): Promise<T> {
    const pool = this.getOrCreatePool(poolName, maxConcurrent);

    if (pool.running >= pool.maxConcurrent) {
      await this.waitForSlot(pool);
    }

    pool.running++;
    
    try {
      const result = await operation();
      return result;
    } finally {
      pool.running--;
      this.processQueue(pool);
    }
  }

  private getOrCreatePool(poolName: string, maxConcurrent: number) {
    if (!this.pools.has(poolName)) {
      this.pools.set(poolName, {
        maxConcurrent,
        queue: [],
        running: 0,
      });
    }
    return this.pools.get(poolName)!;
  }

  private waitForSlot(pool: any): Promise<void> {
    return new Promise(resolve => {
      pool.queue.push(resolve);
    });
  }

  private processQueue(pool: any) {
    if (pool.queue.length > 0 && pool.running < pool.maxConcurrent) {
      const next = pool.queue.shift();
      next();
    }
  }
}
```

### 4.4 Rate Limiting

Already implemented via `@nestjs/throttler`, enhance with Redis:

```typescript
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Redis } from 'ioredis';

@Injectable()
export class RedisThrottlerGuard extends ThrottlerGuard {
  private redis: Redis;

  constructor() {
    super();
    this.redis = new Redis({ host: 'redis', port: 6379 });
  }

  async handleRequest(
    context: any,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const key = this.generateKey(context);
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, ttl);
    }

    return current <= limit;
  }

  private generateKey(context: any): string {
    const request = context.switchToHttp().getRequest();
    return `rate-limit:${request.ip}:${request.path}`;
  }
}
```

## Phase 5: Observability

### 5.1 Structured Logging with ELK

**Winston Logger Configuration:**

Create `libs/observability/src/logger.service.ts`:

```typescript
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

@Injectable()
export class ObservabilityLoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private config: any) {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            return `${timestamp} [${context}] ${level}: ${message} ${JSON.stringify(meta)}`;
          }),
        ),
      }),
    ];

    if (config.observability.elk.enabled) {
      transports.push(
        new ElasticsearchTransport({
          level: 'info',
          clientOpts: {
            node: config.observability.elk.url,
          },
          index: 'notification-system-logs',
        }),
      );
    }

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: config.serviceName,
        environment: config.environment,
      },
      transports,
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
```

**Logstash Pipeline Configuration:**

Create `infrastructure/logstash/pipeline/logstash.conf`:

```
input {
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  if [service] == "notification-system" {
    mutate {
      add_field => { "[@metadata][index]" => "notification-%{+YYYY.MM.dd}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "%{[@metadata][index]}"
  }
}
```

### 5.2 Prometheus Metrics

**Metrics Service:**

Create `libs/observability/src/metrics.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestTotal: Counter;
  public readonly notificationsSent: Counter;
  public readonly notificationsFailed: Counter;
  public readonly activeConnections: Gauge;
  public readonly kafkaMessageProcessed: Counter;

  constructor() {
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.notificationsSent = new Counter({
      name: 'notifications_sent_total',
      help: 'Total notifications sent',
      labelNames: ['channel', 'status', 'tenant_id'],
    });

    this.notificationsFailed = new Counter({
      name: 'notifications_failed_total',
      help: 'Total notifications failed',
      labelNames: ['channel', 'error_type', 'tenant_id'],
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['type'],
    });

    this.kafkaMessageProcessed = new Counter({
      name: 'kafka_messages_processed_total',
      help: 'Total Kafka messages processed',
      labelNames: ['topic', 'status'],
    });
  }

  getMetrics() {
    return register.metrics();
  }
}
```

**Metrics Controller:**

```typescript
import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  async getMetrics() {
    return this.metricsService.getMetrics();
  }
}
```

**Prometheus Configuration:**

Create `infrastructure/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']
  
  - job_name: 'notification-core'
    static_configs:
      - targets: ['notification-core:3001']
  
  - job_name: 'email-worker'
    static_configs:
      - targets: ['email-worker:3010']
  
  - job_name: 'sms-worker'
    static_configs:
      - targets: ['sms-worker:3011']
```

### 5.3 Distributed Tracing with OpenTelemetry

**Install Dependencies:**

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-jaeger
```

**Tracing Configuration:**

Create `libs/observability/src/tracing.ts`:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

export function initTracing(serviceName: string) {
  const jaegerExporter = new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces',
  });

  const sdk = new NodeSDK({
    serviceName,
    traceExporter: jaegerExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error));
  });
}
```

**Usage in main.ts:**

```typescript
import { initTracing } from '@notification/observability';

initTracing('notification-core');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ... rest of bootstrap
}
```

### 5.4 Grafana Dashboards

Create `infrastructure/grafana/dashboards/notification-system.json`:

```json
{
  "dashboard": {
    "title": "Notification System Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Notifications Sent (by Channel)",
        "targets": [
          {
            "expr": "sum by (channel) (rate(notifications_sent_total[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(notifications_failed_total[5m])"
          }
        ]
      },
      {
        "title": "P95 Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      }
    ]
  }
}
```

## Phase 6: Database-Driven Configuration

### 6.1 Configuration Service

Create `apps/notification-core/src/modules/config/config.service.ts`:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { lookups, lookupTypes } from '../../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class ConfigService {
  private configCache = new Map<string, unknown>();

  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async getConfig(key: string, tenantId?: number): Promise<any> {
    const cacheKey = `${key}:${tenantId || 'global'}`;
    
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey);
    }

    const [config] = await this.db
      .select()
      .from(lookups)
      .where(eq(lookups.lookupCode, key));

    if (config) {
      this.configCache.set(cacheKey, config.value);
      return config.value;
    }

    return null;
  }

  async getConfigsByType(typeName: string): Promise<any[]> {
    const [type] = await this.db
      .select()
      .from(lookupTypes)
      .where(eq(lookupTypes.name, typeName));

    if (!type) return [];

    return await this.db
      .select()
      .from(lookups)
      .where(eq(lookups.lookupTypeId, type.id));
  }

  invalidateCache(key?: string) {
    if (key) {
      for (const cacheKey of this.configCache.keys()) {
        if (cacheKey.startsWith(key)) {
          this.configCache.delete(cacheKey);
        }
      }
    } else {
      this.configCache.clear();
    }
  }
}
```

### 6.2 Feature Flags

Create database schema for feature flags:

```typescript
// src/database/schema/feature-flags.schema.ts
export const featureFlags = pgTable('feature_flags', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  tenantId: bigserial('tenant_id', { mode: 'number' }).references(() => tenants.id),
  configuration: jsonb('configuration'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Feature Flag Service:**

```typescript
@Injectable()
export class FeatureFlagService {
  async isEnabled(flagName: string, tenantId?: number): Promise<boolean> {
    const [flag] = await this.db
      .select()
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.name, flagName),
          tenantId ? eq(featureFlags.tenantId, tenantId) : isNull(featureFlags.tenantId),
        ),
      );

    return flag?.isEnabled || false;
  }

  // Usage:
  // const useELK = await this.featureFlags.isEnabled('observability.elk', tenantId);
  // const useGrafana = await this.featureFlags.isEnabled('observability.grafana', tenantId);
}
```

## Phase 7: Original Enhancements Integration

All original enhancements from the first plan remain valid and will be implemented:

### 7.1 API Versioning

- Implement across all microservices
- API Gateway handles version routing
- Each service supports `@Version('1')` decorators

### 7.2 Template Enhancements

- Implemented in dedicated Template Service
- Exposed via REST, gRPC, and GraphQL
- Full categorization, versioning, and localization

### 7.3 Default Tenant Data

- Seeding triggered on tenant creation
- Templates, preferences, and default configs
- Multi-language support

### 7.4 Configurable Webhooks

- Database-driven webhook configuration
- Per-tenant, per-event configuration
- Delivery tracking and retry logic

### 7.5 DTO Documentation

- All DTOs with `@ApiProperty` decorators
- Proto definitions for gRPC
- GraphQL schemas for GraphQL API

### 7.6 OAuth2 Fix

- Simplified redirect handler
- Better error handling
- Support for API Gateway auth proxy

## Phase 8: Deployment & Scaling

### 8.1 Docker Multi-Stage Builds

**Example Dockerfile:**

```dockerfile
# Base stage
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main"]
```

### 8.2 Kubernetes Deployment

Create `infrastructure/kubernetes/notification-core-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-core
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-core
  template:
    metadata:
      labels:
        app: notification-core
    spec:
      containers:
      - name: notification-core
        image: notification-core:latest
        ports:
        - containerPort: 3001
        - containerPort: 50051
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: KAFKA_BROKERS
          value: "kafka:9092"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: notification-core
spec:
  selector:
    app: notification-core
  ports:
  - name: http
    port: 3001
    targetPort: 3001
  - name: grpc
    port: 50051
    targetPort: 50051
  type: ClusterIP
```

### 8.3 Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: notification-core-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notification-core
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Implementation Roadmap

### Phase 1: Foundation & Structure (Week 1-2)

- [ ] Reorganize project structure for hybrid deployment
- [ ] Create worker entry points (email, sms, fcm, whatsapp)
- [ ] Setup gRPC proto definitions and code generation
- [ ] Configure Docker files for service and worker modes
- [ ] Expand docker-compose with observability stack

### Phase 2: Communication Protocols (Week 3-4)

- [ ] Enhance Kafka integration with event schemas
- [ ] Implement gRPC controllers for all services
- [ ] Add GraphQL resolvers and schema
- [ ] Setup Redis pub/sub for real-time updates
- [ ] Create shared event contracts library

### Phase 3: Resilience Patterns (Week 5-6)

- [ ] Implement circuit breaker service
- [ ] Add retry logic with exponential backoff
- [ ] Create bulkhead pattern for resource isolation
- [ ] Add timeout handling for external calls
- [ ] Integrate Redis-backed rate limiting

### Phase 4: Observability Stack (Week 7-8)

- [ ] Setup structured logging with Winston + Logstash
- [ ] Implement Prometheus metrics collection
- [ ] Create Grafana dashboards
- [ ] Integrate OpenTelemetry distributed tracing
- [ ] Add feature flags for observability stack selection
- [ ] Configure ELK stack integration

### Phase 5: Database-Driven Configuration (Week 9)

- [ ] Create configuration service with caching
- [ ] Implement feature flags system
- [ ] Add lookup-based configuration
- [ ] Create tenant-specific configuration overrides

### Phase 6: Original Enhancements (Week 10-11)

- [ ] Implement API versioning across all controllers
- [ ] Create template categories, versions, and localizations schemas
- [ ] Enhance templates service with new features
- [ ] Add template controller endpoints
- [ ] Create default template seed data
- [ ] Integrate default data seeding with tenant creation
- [ ] Create webhook configuration schema
- [ ] Implement webhook configuration service
- [ ] Add webhook configuration endpoints
- [ ] Add @ApiProperty decorators to all DTOs
- [ ] Fix OAuth2 redirect JavaScript errors
- [ ] Generate and test migrations

### Phase 7: Testing & Documentation (Week 12)

- [ ] Create integration tests for microservices communication
- [ ] Add E2E tests for all communication protocols
- [ ] Document API contracts (REST, gRPC, GraphQL, Kafka)
- [ ] Create deployment guides for different modes
- [ ] Update README with architecture documentation
- [ ] Document API Gateway integration requirements

## Configuration Management

All configuration driven by environment variables and database lookups:

### Environment Variables

```bash
# Service Configuration
SERVICE_NAME=notification-core
NODE_ENV=production
PORT=3001
GRPC_PORT=50051

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Kafka
KAFKA_BROKERS=kafka:29092
KAFKA_CLIENT_ID=notification-core
KAFKA_GROUP_ID=notification-group

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Keycloak
KEYCLOAK_SERVER_URL=http://keycloak:8080
KEYCLOAK_REALM=notification
KEYCLOAK_CLIENT_ID=notification-service

# Observability
OBSERVABILITY_ELK_ENABLED=true
OBSERVABILITY_ELK_URL=http://elasticsearch:9200
OBSERVABILITY_GRAFANA_ENABLED=true
OBSERVABILITY_TRACING_ENABLED=true
JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# Feature Flags
FEATURE_FLAG_GRAPHQL=true
FEATURE_FLAG_GRPC=true
FEATURE_FLAG_KAFKA_EVENTS=true
```

## Success Metrics

- **Performance**: P95 latency < 200ms for API calls
- **Reliability**: 99.9% uptime, circuit breaker prevents cascading failures
- **Scalability**: Horizontal scaling of workers based on queue depth
- **Observability**: Full request tracing, comprehensive metrics, structured logging
- **Flexibility**: Support for REST, gRPC, GraphQL, WebSockets, Kafka
- **Security**: API Gateway authentication, rate limiting, tenant isolation

## Scope Boundaries

### This Repository Will Include:

✅ Notification Core Service (REST, gRPC, GraphQL)

✅ Template Service integration

✅ Worker processes (Email, SMS, FCM, WhatsApp)

✅ Kafka producers and consumers

✅ Redis pub/sub integration

✅ gRPC proto definitions

✅ GraphQL schema and resolvers

✅ Resilience patterns (circuit breaker, retry, bulkhead)

✅ Observability integration (logging, metrics, tracing)

✅ Database schemas and migrations

✅ All original enhancements (versioning, templates, webhooks, DTOs)

✅ Docker configurations for different deployment modes

### API Gateway (Separate Repository)

❌ API Gateway service implementation

❌ Gateway routing logic

❌ Gateway authentication proxy

✅ Integration guidelines and contracts

✅ Required headers and communication protocols

### Shared Infrastructure (Docker Compose / K8s)

❌ Infrastructure setup (provided as reference configs)

✅ Connection configuration

✅ Client libraries and integrations

✅ Observability stack configurations

## Getting Started

### Prerequisites

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Edit .env with your configurations
```

### Development Mode (All-in-One)

```bash
# Start shared infrastructure
docker-compose up -d postgres redis kafka keycloak

# Optional: Start observability stack
docker-compose -f docker-compose.local.yml up -d elasticsearch prometheus grafana jaeger

# Start application
npm run start:dev
```

### Production Mode (Separate Services)

```bash
# Start all infrastructure
docker-compose -f docker-compose.local.yml up -d

# This will start:
# - Notification Service (REST + gRPC + GraphQL)
# - Email Workers (x2)
# - SMS Workers (x2)
# - FCM Workers (x2)
# - WhatsApp Workers (x2)
```

### Testing the System

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:e2e

# Run specific service tests
npm run test:notifications
npm run test:templates

# Test gRPC endpoints
grpcurl -plaintext localhost:50051 list

# Test GraphQL
curl http://localhost:4000/graphql -d '{"query": "{ notifications { id } }"}'

# Test REST API
curl http://localhost:3000/api/v1/notifications

# View metrics
curl http://localhost:3000/metrics

# View health
curl http://localhost:3000/health
```

### Accessing Observability Tools

Once running with `docker-compose.local.yml`:

- **Kibana**: http://localhost:5601 (ELK logs)
- **Grafana**: http://localhost:3001 (Metrics dashboards)
- **Prometheus**: http://localhost:9090 (Raw metrics)
- **Jaeger**: http://localhost:16686 (Distributed tracing)
- **Kafka UI**: http://localhost:8090 (Kafka topics)
- **Swagger**: http://localhost:3000/api (API documentation)

## Environment Variables Reference

```bash
# Service Configuration
SERVICE_NAME=notification-system
NODE_ENV=production
PORT=3000
GRPC_PORT=50051
GRAPHQL_PORT=4000

# Database
DATABASE_URL=postgresql://notification:notification@postgres:5432/notification_db

# Redis
REDIS_URL=redis://redis:6379

# Kafka
KAFKA_BROKERS=kafka:29092
KAFKA_CLIENT_ID=notification-service
KAFKA_GROUP_ID=notification-consumer-group

# Keycloak
KEYCLOAK_SERVER_URL=http://keycloak:8080
KEYCLOAK_REALM=notification
KEYCLOAK_USER_CLIENT_ID=notification-client
KEYCLOAK_SERVICE_CLIENT_ID=notification-service

# Observability - ELK
OBSERVABILITY_ELK_ENABLED=true
ELASTICSEARCH_URL=http://elasticsearch:9200
LOGSTASH_HOST=logstash
LOGSTASH_PORT=5000

# Observability - Prometheus/Grafana
OBSERVABILITY_PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Observability - Tracing
OBSERVABILITY_TRACING_ENABLED=true
JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# Feature Flags
FEATURE_FLAG_GRAPHQL=true
FEATURE_FLAG_GRPC=true
FEATURE_FLAG_KAFKA_EVENTS=true

# Worker Configuration
WORKER_EMAIL_CONCURRENCY=5
WORKER_SMS_CONCURRENCY=10
WORKER_FCM_CONCURRENCY=10
WORKER_WHATSAPP_CONCURRENCY=5

# External Services
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
FCM_PROJECT_ID=
FCM_PRIVATE_KEY=
```

## Next Steps

1. **Review and approve** this comprehensive plan
2. **Prioritize** which phases to implement first (recommend starting with Phase 1-2)
3. **Setup shared infrastructure** (Kafka, Redis, ELK/Grafana if not already running)
4. **Begin implementation** starting with Phase 1: Foundation & Structure
5. **Coordinate with API Gateway team** on integration contracts

This architecture provides enterprise-grade capabilities while maintaining flexibility and extensibility for future growth. The system can start simple (all-in-one) and scale to full microservices as needed.