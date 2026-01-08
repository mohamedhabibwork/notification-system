# Quick Start Guide

Get the Enterprise Notification System running in under 5 minutes.

## Prerequisites
- Node.js 18+
- Docker & Docker Compose
- 8GB RAM minimum

## Option 1: Quick Start (Development Mode)

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure only (no observability)
docker-compose up -d

# 3. Apply migrations
npm run db:migrate

# 4. Start application
npm run start:dev
```

**Access**:
- API: http://localhost:3000/api
- Health: http://localhost:3000/health

## Option 2: Full Stack (With Observability)

```bash
# 1. Install dependencies
npm install

# 2. Start EVERYTHING (infrastructure + observability)
npm run docker:local:up

# 3. Apply migrations (wait 30s for DB to be ready)
npm run db:migrate

# 4. Seed data (optional but recommended)
npm run seed:keycloak
npm run seed:database

# 5. Start application
npm run start:dev
```

**Access**:
- **API**: http://localhost:3000/api
- **Swagger**: http://localhost:3000/api
- **Health**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics
- **Kibana**: http://localhost:5601
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686
- **Kafka UI**: http://localhost:8090
- **Keycloak**: http://localhost:8080

## First API Call

```bash
# 1. Get access token from Keycloak
TOKEN=$(curl -X POST http://localhost:8080/realms/notification/protocol/openid-connect/token \
  -d "client_id=notification-service" \
  -d "client_secret=<your-secret>" \
  -d "grant_type=client_credentials" \
  | jq -r '.access_token')

# 2. Create a tenant
curl -X POST http://localhost:3000/api/v1/admin/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Tenant",
    "domain": "myfirst.com",
    "isActive": true
  }'

# 3. Send a notification
curl -X POST http://localhost:3000/api/v1/services/notifications/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "channel": "email",
    "recipient": {
      "recipientEmail": "test@example.com"
    },
    "templateId": 1,
    "templateVariables": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "test@example.com",
      "companyName": "My Company"
    }
  }'
```

## Test Features

### 1. Test Template Versioning
```bash
# Create version snapshot
curl -X POST http://localhost:3000/api/v1/admin/templates/1/versions/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"changeDescription": "Initial version", "changeType": "major"}'

# View version history
curl http://localhost:3000/api/v1/admin/templates/1/versions \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Test Webhook Configuration
```bash
# Configure webhook
curl -X POST http://localhost:3000/api/v1/admin/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "name": "Test Webhook",
    "webhookUrl": "https://webhook.site/your-unique-url",
    "isActive": true,
    "enabledEvents": ["notification.sent", "notification.delivered"]
  }'

# Test webhook
curl -X POST http://localhost:3000/api/v1/admin/webhooks/1/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventType": "notification.sent"}'
```

### 3. Check Metrics
```bash
# View Prometheus metrics
curl http://localhost:3000/metrics

# Access Grafana dashboard
open http://localhost:3001
# Login: admin/admin
# Navigate to: Dashboards > Notification System Overview
```

## Troubleshooting

### Issue: Database connection failed
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs notification-postgres

# Restart
docker-compose restart postgres
```

### Issue: Kafka not ready
```bash
# Wait for Kafka to be fully ready (30-60 seconds)
docker logs notification-kafka

# Check health
docker exec notification-kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

### Issue: Application won't start
```bash
# Check logs
docker logs notification-service

# Common fixes:
# 1. Ensure migrations are applied
npm run db:migrate

# 2. Check environment variables
cat .env

# 3. Verify all infrastructure is running
docker ps
```

## Stopping Services

```bash
# Stop application (if running locally)
Ctrl+C

# Stop all Docker containers
docker-compose down

# OR for full stack
npm run docker:local:down

# Clean up (removes volumes - CAUTION: deletes data!)
docker-compose down -v
```

## What's Next?

1. **Explore Swagger UI**: http://localhost:3000/api
2. **Read comprehensive docs**: See `README.md`
3. **Run tests**: `npm run test`
4. **Check implementation details**: See `MICROSERVICES_IMPLEMENTATION_SUMMARY.md`
5. **Review testing guide**: See `COMPREHENSIVE_TESTING_GUIDE.md`

---

🚀 **You're all set!** Start sending notifications through your enterprise-grade microservices system.
