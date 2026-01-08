# Enterprise Notification Microservices System

A production-ready, enterprise-grade, multi-tenant notification system with support for multiple delivery channels (Email, SMS, FCM, WhatsApp, Database) and comprehensive microservices architecture.

## 🚀 Features

### Core Capabilities
- **Multi-Channel Support**: Email, SMS, FCM, WhatsApp, Database notifications
- **Multi-Tenant Architecture**: Complete tenant isolation with RLS (Row Level Security)
- **Template Management**: Handlebars-based templates with categories, versioning, and multi-language support
- **Real-time Updates**: WebSocket support for live notification delivery
- **Batch Processing**: Efficient bulk notification handling with chunking
- **Queue Management**: BullMQ-powered queuing with Redis
- **Event-Driven**: Kafka integration for event streaming
- **Webhook System**: Configurable webhooks with delivery tracking and retry logic

### Microservices Features
- **Multiple Protocol Support**: REST, gRPC, GraphQL, Kafka, WebSockets
- **API Versioning**: URI-based versioning for backward compatibility
- **Horizontal Scaling**: Workers can scale independently
- **Service Mesh Ready**: gRPC service-to-service communication
- **Database-Driven Configuration**: Feature flags and lookup-based config
- **Comprehensive Observability**: ELK + Prometheus/Grafana + Jaeger

### Enterprise Features
- **Authentication**: Keycloak integration with OAuth2/OIDC
- **Authorization**: Role-based (RBAC) and scope-based access control
- **Rate Limiting**: Redis-backed distributed rate limiting
- **Circuit Breaker**: Resilience patterns for fault tolerance
- **Audit Logging**: Complete audit trail for all operations
- **Health Checks**: Kubernetes-ready health endpoints
- **Metrics**: Prometheus-compatible metrics export

## 🏗️ Provider Architecture

The system uses a **flexible, extensible provider architecture** that allows easy integration of new notification providers without modifying core code.

### Key Features
- **Strategy Pattern**: Interchangeable provider implementations
- **Factory Pattern**: Dynamic provider registration and instantiation
- **Type Safety**: Full TypeScript support with discriminated unions
- **Multi-Source Configuration**: Environment variables, database, or request-level overrides
- **Automatic Fallback**: Uses environment config when no tenant provider exists

### Provider Selection Priority
1. **Request Override** - Specific provider in API call
2. **Database Configuration** - Tenant-specific provider settings
3. **Environment Config** - Default provider from .env
4. **First Enabled** - First available enabled provider

### Supported Providers

**14 Directly Implemented + 50+ via Apprise**

- **Chat**: Discord, Slack, Microsoft Teams, Google Chat, Mattermost (+ others via Apprise)
- **Messenger**: Telegram, Signal, LINE Messenger, LINE Notify
- **Push**: Pushover, Gotify, Ntfy, Bark, Gorush, Pushbullet, Pushy, LunaSea
- **Alert**: PagerDuty, Opsgenie, Alerta, Splunk, GoAlert, Squadcast, AlertNow, PagerTree
- **Webhook**: Generic webhook support for any HTTP endpoint
- **IoT**: Home Assistant, Nostr, OneBot
- **Email**: SendGrid, AWS SES, Mailgun
- **SMS**: Twilio, AWS SNS, ClickSend SMS, Octopush, SMSEagle
- **WhatsApp**: WhatsApp Business API, WPPConnect
- **Aggregator**: Apprise (unified access to 50+ services)

📖 See [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md) for detailed documentation on adding custom providers.

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+
- Kafka 3.5+ (with Zookeeper)
- Keycloak 23+
- Docker & Docker Compose (for local development)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd notification-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
```bash
cp .env.example .env
# Edit .env with your configurations
```

### 4. Start Infrastructure
```bash
# Basic infrastructure (PostgreSQL, Redis, Kafka, Keycloak)
docker-compose up -d

# Full stack with observability (ELK, Prometheus, Grafana, Jaeger)
npm run docker:local:up
```

### 5. Run Migrations
```bash
npm run db:migrate
```

### 6. Seed Database
```bash
npm run seed:database  # Setup tenants, templates, categories
```

**Note**: The seeder creates tenants with default templates and categories. Providers should be configured manually per tenant via the API or will automatically fall back to environment configuration.

### 7. Setup Keycloak (Optional)
```bash
npm run seed:keycloak  # Setup Keycloak realm, clients, roles
```

**Note**: Keycloak seeding is a placeholder. Use the Keycloak admin console to create users and clients.

## 🚀 Running the Application

### Development Mode (All-in-One)
```bash
npm run start:dev
```
Runs everything in a single process: API + Workers + WebSocket Gateway

### Separate Workers Mode
```bash
# Terminal 1: Main Service
npm run start:service

# Terminal 2: Email Worker
npm run start:worker:email

# Terminal 3: SMS Worker  
npm run start:worker:sms

# Or run all together:
npm run start:all
```

### Docker Compose Mode (Production-like)
```bash
npm run docker:local:up
```
Starts:
- Notification Service (with horizontal scaling)
- Email Workers (x2)
- SMS Workers (x2) 
- FCM Workers (x2)
- WhatsApp Workers (x2)
- Full observability stack

### Production Mode
```bash
npm run build
npm run start:prod
```

## 📡 API Endpoints

### Base URL
- Local: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api`

### Key Endpoints

#### Service-to-Service APIs
```
POST   /api/v1/services/notifications/send          # Send single notification
POST   /api/v1/services/notifications/send-batch    # Send batch
POST   /api/v1/services/notifications/bulk          # Bulk job
GET    /api/v1/services/notifications/:id/status    # Get status
```

#### User-Facing APIs
```
GET    /api/v1/users/me/notifications                # Get my notifications
PUT    /api/v1/users/me/notifications/:id/read      # Mark as read
GET    /api/v1/users/me/preferences                  # Get preferences
PUT    /api/v1/users/me/preferences/:channel        # Update preference
```

#### Admin APIs
```
# Tenants
GET    /api/v1/admin/tenants
POST   /api/v1/admin/tenants
PUT    /api/v1/admin/tenants/:id
DELETE /api/v1/admin/tenants/:id

# Templates
GET    /api/v1/admin/templates
POST   /api/v1/admin/templates
PUT    /api/v1/admin/templates/:id
POST   /api/v1/admin/templates/:id/preview

# Providers
GET    /api/v1/admin/providers
POST   /api/v1/admin/providers
PUT    /api/v1/admin/providers/:id
```

#### System APIs
```
GET    /health             # Health check
GET    /health/ready       # Readiness check
GET    /metrics            # Prometheus metrics
```

### gRPC APIs
```
Host: localhost:50051

Services:
- NotificationService
- TemplateService
- TenantService
```

### GraphQL API
```
URL: http://localhost:4000/graphql

Supports:
- Queries (notifications, templates, tenants)
- Mutations (send, create, update, delete)
- Subscriptions (real-time notification updates)
```

## 🔐 Authentication

### User Authentication (OAuth2/OIDC)
```bash
# Get access token from Keycloak
curl -X POST http://localhost:8080/realms/notification/protocol/openid-connect/token \
  -d "client_id=notification-client" \
  -d "username=user@test.com" \
  -d "password=password" \
  -d "grant_type=password"

# Use token in requests
curl http://localhost:3000/api/v1/users/me/notifications \
  -H "Authorization: Bearer <access_token>"
```

### Service Authentication (Client Credentials)
```bash
# Get service token
curl -X POST http://localhost:8080/realms/notification/protocol/openid-connect/token \
  -d "client_id=notification-service" \
  -d "client_secret=<secret>" \
  -d "grant_type=client_credentials"

# Use in service-to-service calls
curl -X POST http://localhost:3000/api/v1/services/notifications/send \
  -H "Authorization: Bearer <service_token>" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## 📊 Observability

### Access Monitoring Tools

Once running with `docker-compose.local.yml`:

- **Swagger UI**: http://localhost:3000/api
- **Kibana** (ELK Logs): http://localhost:5601
- **Grafana** (Metrics): http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger** (Tracing): http://localhost:16686
- **Kafka UI**: http://localhost:8090

### Metrics

System exposes Prometheus metrics at `/metrics`:

```
# Notification metrics
notifications_sent_total{channel="email",status="sent",tenant_id="1"}
notifications_failed_total{channel="sms",error_type="timeout"}

# HTTP metrics
http_requests_total{method="POST",route="/api/v1/notifications",status_code="200"}
http_request_duration_seconds{method="POST",route="/api/v1/notifications"}

# Kafka metrics
kafka_messages_processed_total{topic="notification.email.requested",status="success"}

# Connection metrics
active_connections{type="websocket"}
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Integration tests
npm run test:integration

# Test specific modules
npm run test:notifications
npm run test:templates

# Coverage
npm run test:cov
```

## 📦 Project Structure

```
notification-system/
├── proto/                      # gRPC Protocol Buffers
├── docker/                     # Docker configurations
├── infrastructure/             # Observability configs
├── scripts/                    # Utility scripts
├── src/
│   ├── main.ts                # Application entry point
│   ├── app.module.ts          # Root module
│   ├── modules/               # Feature modules
│   │   ├── auth/              # Authentication & authorization
│   │   ├── notifications/     # Core notification logic
│   │   ├── templates/         # Template management
│   │   ├── tenants/           # Tenant management
│   │   ├── providers/         # Channel provider configs
│   │   ├── webhooks/          # Webhook system
│   │   ├── preferences/       # User preferences
│   │   └── ...
│   ├── processors/            # Channel processors (workers)
│   ├── queues/                # BullMQ queue management
│   ├── gateways/              # WebSocket gateway
│   ├── grpc/                  # gRPC controllers
│   ├── graphql/               # GraphQL resolvers
│   ├── database/              # Database layer
│   │   ├── schema/            # Drizzle schemas
│   │   ├── migrations/        # Database migrations
│   │   └── seeds/             # Seed data
│   ├── common/                # Shared utilities
│   │   ├── resilience/        # Circuit breaker, retry, bulkhead
│   │   ├── observability/     # Logging, metrics, tracing
│   │   ├── filters/           # Exception filters
│   │   ├── guards/            # Auth guards
│   │   └── middleware/        # Custom middleware
│   └── config/                # Configuration
└── test/                      # Tests
```

## 🔧 Configuration

### Environment Variables

Key configurations in `.env`:

```bash
# Application
SERVICE_NAME=notification-system
NODE_ENV=production
PORT=3000
GRPC_PORT=50051
GRAPHQL_PORT=4000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/notification_db

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=notification-service

# Keycloak
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=notification
KEYCLOAK_USER_CLIENT_ID=notification-client

# Observability
OBSERVABILITY_ELK_ENABLED=true
OBSERVABILITY_PROMETHEUS_ENABLED=true
OBSERVABILITY_TRACING_ENABLED=true

# Workers
WORKER_EMAIL_CONCURRENCY=5
WORKER_SMS_CONCURRENCY=10

# External Providers
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

See `.env.example` for complete list.

### Database-Driven Configuration

The system supports runtime configuration via:
1. **Lookups Table**: Key-value configuration
2. **Feature Flags**: Enable/disable features per tenant
3. **Tenant Settings**: Per-tenant customization

## 📱 WPPConnect WhatsApp Provider

WPPConnect is a WhatsApp Web client that enables sending messages through WhatsApp without requiring official WhatsApp Business API credentials. It's ideal for development, testing, or small-scale deployments.

### Features
- ✅ **Multi-tenant support**: Each tenant gets their own WhatsApp session
- ✅ **QR code authentication**: Simple setup via QR code scanning
- ✅ **Multiple message types**: Text, media, location, contacts
- ✅ **Session persistence**: Sessions survive application restarts
- ✅ **Status tracking**: Real-time delivery status updates
- ✅ **Auto-reconnect**: Automatic session recovery

### Setup

#### 1. Enable WPPConnect Provider

Update your `.env` file:

```bash
# WPPConnect Provider
WHATSAPP_WPPCONNECT_ENABLED=true
WHATSAPP_WPPCONNECT_SESSION_NAME=notification-service
WHATSAPP_WPPCONNECT_AUTO_CLOSE=60000
WHATSAPP_WPPCONNECT_QR_TIMEOUT=60000
WHATSAPP_WPPCONNECT_USE_CHROME=true
WHATSAPP_WPPCONNECT_DISABLE_WELCOME=true
WHATSAPP_WPPCONNECT_TOKEN_STORE=file
WHATSAPP_WPPCONNECT_TOKEN_FOLDER=./tokens/wppconnect

# Set WPPConnect as default WhatsApp provider
WHATSAPP_DEFAULT_PROVIDER=wppconnect
```

#### 2. QR Code Authentication Flow

When a tenant sends their first WhatsApp message via WPPConnect:

1. **Initiate Session**: Send a WhatsApp notification via the API
2. **Retrieve QR Code**: Call the QR code endpoint

```bash
GET /webhooks/wppconnect/qr/:tenantId
```

Response:
```json
{
  "qrCode": "data:image/png;base64,...",
  "asciiQR": "█████████...",
  "urlCode": "qr-data-ref",
  "expiresAt": "2026-01-08T10:05:00Z",
  "attempts": 1
}
```

3. **Scan QR Code**: Open WhatsApp on your phone and scan the QR code
4. **Session Established**: The session is now active and persists across restarts

#### 3. Check Session Status

```bash
GET /webhooks/wppconnect/session/:tenantId
```

Response:
```json
{
  "tenantId": 1,
  "sessionName": "tenant-1",
  "status": "CONNECTED",
  "isConnected": true,
  "lastActivity": "2026-01-08T10:00:00Z"
}
```

#### 4. Send WhatsApp Messages

**Text Message:**
```bash
POST /api/v1/notifications/send
{
  "tenantId": 1,
  "channel": "whatsapp",
  "recipients": {
    "userIds": ["user123"]
  },
  "content": {
    "body": "Hello from WPPConnect!"
  },
  "metadata": {
    "provider": "wppconnect"
  }
}
```

**Media Message:**
```json
{
  "tenantId": 1,
  "channel": "whatsapp",
  "recipients": { "userIds": ["user123"] },
  "content": { "body": "Check this image" },
  "metadata": {
    "provider": "wppconnect",
    "messageType": "media",
    "media": {
      "base64": "data:image/png;base64,...",
      "filename": "image.png",
      "caption": "Check this image"
    }
  }
}
```

**Location Message:**
```json
{
  "tenantId": 1,
  "channel": "whatsapp",
  "recipients": { "userIds": ["user123"] },
  "content": { "body": "My location" },
  "metadata": {
    "provider": "wppconnect",
    "messageType": "location",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "name": "New York City"
    }
  }
}
```

#### 5. Disconnect Session

```bash
POST /webhooks/wppconnect/session/:tenantId/disconnect
```

### Session Management

- **Session Isolation**: Each tenant has a completely isolated WhatsApp session
- **Token Storage**: Sessions are stored in `./tokens/wppconnect/` by default
- **Auto-Close**: Inactive sessions auto-close after 60 seconds (configurable)
- **Phone Watchdog**: Monitors phone connection every 30 seconds
- **Reconnection**: Automatic reconnection on disconnect

### Troubleshooting

#### QR Code Not Appearing
- Check if `WHATSAPP_WPPCONNECT_ENABLED=true` in your `.env`
- Ensure the service has been restarted after configuration changes
- Check logs for session initialization errors

#### Session Disconnected
- Phone may have disconnected from WhatsApp Web
- Session may have been closed by WhatsApp due to inactivity
- Re-authenticate by requesting a new QR code

#### Multiple Devices Warning
- WhatsApp Web sessions count toward your device limit (4 devices)
- Close unused sessions via `/webhooks/wppconnect/session/:tenantId/disconnect`

### Production Considerations

⚠️ **Important**: WPPConnect uses WhatsApp Web, which is intended for personal use. For production deployments:

- Consider using [WhatsApp Business API](https://business.whatsapp.com/) for official support
- WPPConnect is best suited for development, testing, or small-scale use
- Monitor session health and implement proper error handling
- Keep sessions organized and clean up unused sessions regularly

### API Reference

For detailed API documentation, visit: [https://wppconnect.io/](https://wppconnect.io/)

## 📚 Documentation

- **[PROVIDERS.md](docs/PROVIDERS.md)** - Complete provider documentation (42+ services)
- **[MICROSERVICES_IMPLEMENTATION_SUMMARY.md](MICROSERVICES_IMPLEMENTATION_SUMMARY.md)** - Implementation details
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing instructions  
- **[KEYCLOAK_SETUP.md](KEYCLOAK_SETUP.md)** - Keycloak configuration
- **[MONITORING.md](docs/MONITORING.md)** - Complete monitoring & observability guide
- **[QUICK_START_MONITORING.md](docs/QUICK_START_MONITORING.md)** - Quick monitoring setup
- **[notification_prd.md](notification_prd.md)** - Product requirements
- **[notification_erd.md](notification_erd.md)** - Database schema

## 📊 Monitoring & Observability

The system provides comprehensive monitoring through Prometheus and Grafana:

- **Metrics Endpoint**: `http://localhost:3000/metrics`
- **Pre-built Dashboards**: Grafana dashboards for notifications, API performance, queues
- **Alert Rules**: Pre-configured alerts for critical conditions
- **Cloud Support**: Works with Grafana Cloud, AWS AMP/AMG, or self-hosted

### Quick Setup

**Local Development:**
```bash
cp env.development .env
docker compose --profile monitoring up -d
npm run start:dev
# Access Grafana at http://localhost:3001 (admin/admin)
```

**Cloud (Production):**
```bash
cp env.docker .env
# Edit .env with your Grafana Cloud credentials
PROMETHEUS_REMOTE_WRITE_ENABLED=true
PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
GRAFANA_URL=https://yourname.grafana.net
```

See **[docs/QUICK_START_MONITORING.md](docs/QUICK_START_MONITORING.md)** for detailed setup instructions.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under UNLICENSED.

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review Swagger API documentation at `/api`

## 🎯 Roadmap

### Current (v1.0)
- ✅ Multi-channel notifications
- ✅ Multi-tenant support
- ✅ Template system
- ✅ Webhook system
- ✅ API versioning
- ✅ Microservices architecture

### Upcoming (v1.1)
- 🔨 Template categories and versions
- 🔨 Multi-language templates
- 🔨 Advanced webhook configuration
- 🔨 GraphQL subscriptions
- 🔨 gRPC service mesh

### Future (v2.0)
- 📋 A/B testing for notifications
- 📋 Analytics and reporting
- 📋 AI-powered delivery optimization
- 📋 Smart retry strategies
- 📋 Advanced scheduling

---

Built with ❤️ using NestJS, PostgreSQL, Redis, and Kafka
