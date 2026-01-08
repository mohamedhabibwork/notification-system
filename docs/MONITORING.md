# Monitoring & Observability Guide

This guide covers how to set up monitoring and observability for the Notification System using Prometheus and Grafana.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Local Setup](#local-setup)
- [Cloud Setup](#cloud-setup)
- [Available Metrics](#available-metrics)
- [Dashboards](#dashboards)
- [Alerts](#alerts)
- [Troubleshooting](#troubleshooting)

## Overview

The Notification System provides comprehensive observability through:

- **Prometheus Metrics**: Application metrics exposed at `/metrics` endpoint
- **Grafana Dashboards**: Pre-built dashboards for visualization
- **Alert Rules**: Pre-configured alerts for critical conditions
- **Distributed Tracing**: Optional Jaeger integration
- **Centralized Logging**: Optional ELK stack integration

## Quick Start

### Local Development with Local Prometheus & Grafana

```bash
# 1. Copy development environment file
cp env.development .env

# 2. Start infrastructure (including Prometheus & Grafana)
docker compose --profile monitoring up -d

# 3. Start the application
npm run start:dev
# or
bun run start:dev

# 4. Access monitoring tools
# - Metrics endpoint: http://localhost:3000/metrics
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
```

### Production with Cloud Prometheus & Grafana

```bash
# 1. Copy docker environment file
cp env.docker .env

# 2. Configure cloud credentials in .env
PROMETHEUS_REMOTE_WRITE_ENABLED=true
PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
PROMETHEUS_REMOTE_WRITE_USERNAME=your-instance-id
PROMETHEUS_REMOTE_WRITE_PASSWORD=your-api-token

GRAFANA_ENABLED=true
GRAFANA_URL=https://your-grafana-instance.grafana.net
GRAFANA_API_KEY=your-grafana-api-key

# 3. Start the application
docker compose up -d
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Notification System                      │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  Application (NestJS)                    │   │
│  │  - HTTP Endpoints                        │   │
│  │  - Queue Processors                      │   │
│  │  - Event Consumers                       │   │
│  └─────────────┬────────────────────────────┘   │
│                │                                 │
│  ┌─────────────▼────────────────────────────┐   │
│  │  Metrics Service (prom-client)           │   │
│  │  - Counter (requests, notifications)     │   │
│  │  - Histogram (latency, duration)         │   │
│  │  - Gauge (queue depth, connections)      │   │
│  └─────────────┬────────────────────────────┘   │
│                │                                 │
│  ┌─────────────▼────────────────────────────┐   │
│  │  /metrics Endpoint                       │   │
│  │  (Prometheus format)                     │   │
│  └─────────────┬────────────────────────────┘   │
└────────────────┼────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌────────────┐         ┌─────────────┐
│ Prometheus │         │   Cloud     │
│  (Local)   │         │ Prometheus  │
│            │         │ (Grafana    │
│  Port 9090 │         │  Cloud)     │
└─────┬──────┘         └──────┬──────┘
      │                       │
      ▼                       ▼
┌────────────┐         ┌─────────────┐
│  Grafana   │         │   Cloud     │
│  (Local)   │         │  Grafana    │
│            │         │             │
│  Port 3001 │         │ (Hosted)    │
└────────────┘         └─────────────┘
```

## Local Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ or Bun
- Notification System repository

### Step 1: Environment Configuration

```bash
# Copy development environment
cp env.development .env

# The key settings for local monitoring:
OBSERVABILITY_PROMETHEUS_ENABLED=true
PROMETHEUS_METRICS_PATH=/metrics
PROMETHEUS_METRICS_PORT=3000
PROMETHEUS_REMOTE_WRITE_ENABLED=false  # Using local Prometheus
GRAFANA_ENABLED=false                  # Using local Grafana
```

### Step 2: Start Infrastructure

```bash
# Start all infrastructure including monitoring
docker compose --profile monitoring up -d

# Or start specific services
docker compose up -d postgres redis kafka zookeeper keycloak
docker compose up -d prometheus grafana
```

### Step 3: Verify Services

```bash
# Check all services are running
docker compose ps

# View logs
docker compose logs -f prometheus
docker compose logs -f grafana
```

### Step 4: Start Application

```bash
# Install dependencies
npm install
# or
bun install

# Run database migrations
npm run db:migrate
npm run seed:all

# Start in development mode
npm run start:dev
# or
bun run start:dev
```

### Step 5: Access Monitoring Tools

| Service | URL | Credentials |
|---------|-----|-------------|
| Metrics Endpoint | http://localhost:3000/metrics | None (public) |
| Prometheus | http://localhost:9090 | None |
| Grafana | http://localhost:3001 | admin/admin |
| Swagger UI | http://localhost:3000/api | None |

### Step 6: Import Dashboards

Dashboards are automatically provisioned, but you can also import manually:

1. Open Grafana at http://localhost:3001
2. Login with admin/admin
3. Go to Dashboards → Browse
4. You should see:
   - **Notification System - Comprehensive Dashboard**
   - **Notification System Overview**

If not visible:
1. Go to Dashboards → Import
2. Upload JSON from `infrastructure/grafana/dashboards/notification-system-comprehensive.json`

## Cloud Setup

### Option 1: Grafana Cloud

#### Step 1: Create Grafana Cloud Account

1. Sign up at https://grafana.com/products/cloud/
2. Create a new stack
3. Note your:
   - Prometheus remote write URL
   - Instance ID (username)
   - API token (password)
   - Grafana URL

#### Step 2: Configure Environment

Edit your `.env` file:

```bash
# Enable cloud Prometheus
PROMETHEUS_REMOTE_WRITE_ENABLED=true
PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
PROMETHEUS_REMOTE_WRITE_USERNAME=123456  # Your instance ID
PROMETHEUS_REMOTE_WRITE_PASSWORD=glc_xxxxxxxxxxxxxxxxx  # Your API token

# Enable cloud Grafana
GRAFANA_ENABLED=true
GRAFANA_URL=https://yourname.grafana.net
GRAFANA_API_KEY=glsa_xxxxxxxxxxxxxxxxx  # Grafana service account token
```

#### Step 3: Configure Prometheus to Scrape Your App

In Grafana Cloud:
1. Go to Configuration → Data Sources → Prometheus
2. Add scrape config or use Grafana Agent

**Example Grafana Agent Config:**

```yaml
metrics:
  global:
    scrape_interval: 15s
  configs:
    - name: notification-system
      scrape_configs:
        - job_name: 'notification-service'
          static_configs:
            - targets: ['your-app-host:3000']
              labels:
                service: 'notification-system'
                environment: 'production'
          metrics_path: '/metrics'
```

#### Step 4: Import Dashboard

1. Login to your Grafana Cloud instance
2. Go to Dashboards → Import
3. Upload `infrastructure/grafana/dashboards/notification-system-comprehensive.json`
4. Select your Prometheus data source

### Option 2: AWS Managed Prometheus & Grafana

#### Configure for AWS

```bash
# AWS Managed Prometheus
PROMETHEUS_REMOTE_WRITE_ENABLED=true
PROMETHEUS_REMOTE_WRITE_URL=https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-xxxxx/api/v1/remote_write
PROMETHEUS_REMOTE_WRITE_BEARER_TOKEN=AWS_AUTH_TOKEN

# AWS Managed Grafana
GRAFANA_ENABLED=true
GRAFANA_URL=https://g-xxxxx.grafana-workspace.us-east-1.amazonaws.com
GRAFANA_API_KEY=your-grafana-api-key
```

### Option 3: Self-Hosted Cloud

For self-hosted Prometheus/Grafana on VPS/Cloud:

```bash
# Remote Prometheus
PROMETHEUS_REMOTE_WRITE_ENABLED=true
PROMETHEUS_REMOTE_WRITE_URL=https://your-prometheus-server.com/api/v1/write
PROMETHEUS_REMOTE_WRITE_USERNAME=username
PROMETHEUS_REMOTE_WRITE_PASSWORD=password

# Remote Grafana
GRAFANA_ENABLED=true
GRAFANA_URL=https://your-grafana-server.com
GRAFANA_API_KEY=your-api-key
```

## Available Metrics

### Application Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `http_requests_total` | Counter | Total HTTP requests | method, route, status_code, tenant_id |
| `http_request_duration_seconds` | Histogram | HTTP request duration | method, route, status_code, tenant_id |
| `notifications_sent_total` | Counter | Total notifications sent | channel, status, tenant_id |
| `notifications_failed_total` | Counter | Total notifications failed | channel, error_type, tenant_id |
| `queue_depth` | Gauge | Number of jobs in queue | queue_name, status |
| `active_connections` | Gauge | Active WebSocket connections | type |
| `kafka_messages_processed_total` | Counter | Kafka messages processed | topic, status, consumer_group |
| `circuit_breaker_state` | Gauge | Circuit breaker state (0=closed, 1=half-open, 2=open) | service_name |
| `retry_attempts_total` | Counter | Total retry attempts | operation_name, attempt_number, success |

### System Metrics (Default Node.js Metrics)

- `process_cpu_user_seconds_total`
- `process_cpu_system_seconds_total`
- `process_resident_memory_bytes`
- `process_heap_bytes`
- `nodejs_eventloop_lag_seconds`
- `nodejs_gc_duration_seconds`

## Dashboards

### Comprehensive Dashboard

The main dashboard (`notification-system-comprehensive.json`) includes:

#### Row 1: Key Metrics (Stats)
- Notifications per Minute
- API Requests per Minute
- Failed Notifications per Minute
- Active Connections

#### Row 2: Throughput
- Notifications Sent by Channel (time series)
- HTTP Request Rate (time series)

#### Row 3: Performance
- HTTP Request Latency (P50, P95, P99)
- Failed Notifications by Channel

#### Row 4: Queue & Kafka
- Queue Depth by Queue
- Kafka Messages Processed

#### Row 5: Resilience
- Circuit Breaker States (bar gauge)
- Retry Attempts

#### Row 6: Multi-tenancy
- Notifications by Tenant

### Creating Custom Dashboards

Example PromQL queries:

```promql
# Success rate
sum(rate(notifications_sent_total{status="delivered"}[5m])) 
/ 
sum(rate(notifications_sent_total[5m])) * 100

# Error rate by channel
sum by (channel) (rate(notifications_failed_total[5m]))

# P95 latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Queue saturation
sum(queue_depth) / 10000 * 100  # Assuming 10k max capacity
```

## Alerts

### Alert Rules

Alert rules are defined in `infrastructure/prometheus/alerts/notification-alerts.yml`.

#### Critical Alerts

| Alert | Threshold | Duration | Description |
|-------|-----------|----------|-------------|
| `ServiceDown` | up == 0 | 1m | Service is not responding |
| `CriticalNotificationFailureRate` | > 25% | 2m | More than 25% notifications failing |
| `CriticalAPILatency` | P95 > 3s | 2m | Very high API latency |
| `CriticalQueueDepth` | > 5000 jobs | 5m | Queue is critically backed up |

#### Warning Alerts

| Alert | Threshold | Duration | Description |
|-------|-----------|----------|-------------|
| `HighNotificationFailureRate` | > 10% | 5m | Elevated failure rate |
| `HighAPILatency` | P95 > 1s | 5m | High API latency |
| `HighQueueDepth` | > 1000 jobs | 10m | Queue is backing up |
| `CircuitBreakerOpen` | state == 2 | 5m | Circuit breaker is open |
| `HighHTTPErrorRate` | 5xx > 5% | 5m | High server error rate |

### Configuring Alert Manager

#### Local Alert Manager

1. Add to `docker-compose.yml`:

```yaml
alertmanager:
  image: prom/alertmanager:latest
  container_name: notification-alertmanager
  ports:
    - "9093:9093"
  volumes:
    - ./infrastructure/alertmanager:/etc/alertmanager
  command:
    - '--config.file=/etc/alertmanager/alertmanager.yml'
  networks:
    - notification-network
```

2. Create `infrastructure/alertmanager/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

#### Cloud Alert Manager (Grafana Cloud)

Alerts are automatically managed in Grafana Cloud. Configure in:
1. Grafana Cloud → Alerting → Alert rules
2. Import from `infrastructure/prometheus/alerts/notification-alerts.yml`

## Troubleshooting

### Metrics Endpoint Not Working

```bash
# Check if service is running
curl http://localhost:3000/health

# Check metrics endpoint
curl http://localhost:3000/metrics

# Check logs
docker compose logs -f notification-service
```

### Prometheus Not Scraping

```bash
# Check Prometheus targets
# Go to: http://localhost:9090/targets

# Check Prometheus logs
docker compose logs prometheus

# Verify Prometheus config
docker compose exec prometheus cat /etc/prometheus/prometheus.yml
```

### Grafana Dashboard Not Loading

```bash
# Check Grafana logs
docker compose logs grafana

# Verify datasource
# Go to: http://localhost:3001/datasources

# Re-import dashboard
# Go to: Dashboards → Import
# Upload: infrastructure/grafana/dashboards/notification-system-comprehensive.json
```

### Cloud Prometheus Not Receiving Metrics

```bash
# Verify credentials
echo $PROMETHEUS_REMOTE_WRITE_URL
echo $PROMETHEUS_REMOTE_WRITE_USERNAME

# Test endpoint
curl -X POST "$PROMETHEUS_REMOTE_WRITE_URL" \
  -u "$PROMETHEUS_REMOTE_WRITE_USERNAME:$PROMETHEUS_REMOTE_WRITE_PASSWORD" \
  --data-binary '@metrics.txt'

# Check application logs for errors
docker compose logs notification-service | grep -i prometheus
```

### No Data in Grafana

1. **Check time range**: Ensure time range selector shows recent data
2. **Check datasource**: Go to Configuration → Data Sources → Test
3. **Check queries**: Use Explore tab to test PromQL queries
4. **Generate traffic**: Make some API calls to generate metrics

```bash
# Generate sample traffic
for i in {1..100}; do
  curl http://localhost:3000/api/v1/health
  sleep 0.1
done
```

## Best Practices

### 1. Label Cardinality

Avoid high-cardinality labels (e.g., user IDs, UUIDs):

```typescript
// ❌ Bad - high cardinality
metrics.notificationsSent.inc({ user_id: userId, notification_id: notificationId });

// ✅ Good - low cardinality
metrics.notificationsSent.inc({ channel: 'email', status: 'delivered', tenant_id: tenantId });
```

### 2. Alert Thresholds

- Start conservative and adjust based on baseline
- Use multiple severity levels (info, warning, critical)
- Consider time-of-day patterns

### 3. Dashboard Organization

- Keep dashboards focused (one dashboard per service/component)
- Use rows to group related panels
- Include documentation in dashboard descriptions

### 4. Retention

- Configure appropriate retention for your use case:
  - Development: 7-15 days
  - Production: 30-90 days
  - Long-term: Use recording rules and downsampling

### 5. Cost Optimization (Cloud)

- Use recording rules for expensive queries
- Aggregate metrics before sending
- Set appropriate scrape intervals
- Use metric relabeling to drop unused metrics

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Cloud Setup](https://grafana.com/docs/grafana-cloud/)
- [Best Practices for Monitoring](https://prometheus.io/docs/practices/naming/)

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Review metrics: `curl http://localhost:3000/metrics`
- GitHub Issues: [Your Repository Issues]
