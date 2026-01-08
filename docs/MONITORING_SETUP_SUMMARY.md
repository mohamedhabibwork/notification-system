# Prometheus & Grafana Integration - Setup Summary

## ✅ What Has Been Configured

### 1. Environment Files

Three environment configuration files have been created:

| File | Purpose | Network Configuration |
|------|---------|----------------------|
| `env.example` | Template with all options | Documentation |
| `env.development` | Local development | localhost connections |
| `env.docker` | Docker/Production | Docker service names |

**Key Monitoring Variables Added:**
```bash
# Prometheus
OBSERVABILITY_PROMETHEUS_ENABLED=true
PROMETHEUS_METRICS_PATH=/metrics
PROMETHEUS_REMOTE_WRITE_ENABLED=false
PROMETHEUS_REMOTE_WRITE_URL=
PROMETHEUS_REMOTE_WRITE_USERNAME=
PROMETHEUS_REMOTE_WRITE_PASSWORD=
PROMETHEUS_REMOTE_WRITE_BEARER_TOKEN=

# Grafana Cloud
GRAFANA_ENABLED=false
GRAFANA_URL=
GRAFANA_API_KEY=
GRAFANA_DASHBOARD_UID=

# Metrics
METRICS_DEFAULT_LABELS_ENABLED=true
METRICS_COLLECT_DEFAULT_METRICS=true
METRICS_PREFIX=notification_system_
```

### 2. Docker Compose Configuration

**Updated:** `docker-compose.yml`

Added Prometheus and Grafana services with:
- Optional startup using profiles (`--profile monitoring`)
- Health checks
- Persistent volumes
- Pre-configured networking

**Start monitoring stack:**
```bash
docker compose --profile monitoring up -d
```

**Services:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

### 3. Prometheus Configuration

**Created:**
- `infrastructure/prometheus/prometheus.yml` - Main configuration
- `infrastructure/prometheus/alerts/notification-alerts.yml` - Alert rules

**Features:**
- Scrapes notification service metrics
- Supports both local and cloud setups
- Pre-configured alert rules for critical conditions
- 15-second scrape interval

### 4. Grafana Configuration

**Created:**
- `infrastructure/grafana/provisioning/datasources/prometheus.yml` - Auto-provisioned datasource
- `infrastructure/grafana/dashboards/dashboard.yml` - Dashboard provider
- `infrastructure/grafana/dashboards/notification-system-comprehensive.json` - Main dashboard
- `infrastructure/grafana/dashboards/notification-overview.json` - Overview dashboard

**Dashboard Panels:**
- Notifications per minute
- API requests per minute
- Failed notifications
- Active connections
- HTTP latency (P50, P95, P99)
- Queue depth
- Kafka messages processed
- Circuit breaker states
- Retry attempts
- Multi-tenant metrics

### 5. Application Updates

**Updated:** `src/common/metrics/metrics.controller.ts`
- Integrated ObservabilityMetricsService
- Made `/metrics` endpoint public (no auth required)
- Proper content-type header for Prometheus scraping

**Updated:** `src/common/metrics/metrics.module.ts`
- Imported ObservabilityModule for prom-client metrics

### 6. Alert Rules

**Created:** 18 pre-configured alert rules including:

| Alert | Severity | Threshold | Description |
|-------|----------|-----------|-------------|
| ServiceDown | Critical | up == 0 for 1m | Service not responding |
| CriticalNotificationFailureRate | Critical | >25% for 2m | High failure rate |
| CriticalAPILatency | Critical | P95 >3s for 2m | Very slow API |
| CriticalQueueDepth | Critical | >5000 jobs for 5m | Queue overwhelmed |
| HighNotificationFailureRate | Warning | >10% for 5m | Elevated failures |
| HighAPILatency | Warning | P95 >1s for 5m | Slow API |
| HighQueueDepth | Warning | >1000 jobs for 10m | Queue backing up |
| CircuitBreakerOpen | Warning | state == 2 for 5m | Circuit breaker tripped |

### 7. Documentation

**Created:**
- `docs/MONITORING.md` - Comprehensive 500+ line monitoring guide
- `docs/QUICK_START_MONITORING.md` - Quick setup instructions
- `MONITORING_SETUP_SUMMARY.md` - This summary

**Updated:**
- `README.md` - Added monitoring section

## 🚀 Quick Start Guide

### Option 1: Local Development

```bash
# 1. Copy development environment
cp env.development .env

# 2. Start infrastructure with monitoring
docker compose --profile monitoring up -d

# 3. Start application
npm run start:dev
# or
bun run start:dev

# 4. Access dashboards
# Metrics: http://localhost:3000/metrics
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

### Option 2: Cloud Prometheus & Grafana

```bash
# 1. Get credentials from Grafana Cloud
# Sign up at: https://grafana.com/products/cloud/

# 2. Copy environment file
cp env.docker .env

# 3. Update .env with cloud credentials
PROMETHEUS_REMOTE_WRITE_ENABLED=true
PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
PROMETHEUS_REMOTE_WRITE_USERNAME=123456
PROMETHEUS_REMOTE_WRITE_PASSWORD=glc_xxxxxx

GRAFANA_ENABLED=true
GRAFANA_URL=https://yourname.grafana.net
GRAFANA_API_KEY=glsa_xxxxxx

# 4. Configure Grafana Agent or Prometheus to scrape
# Install Grafana Agent or configure Prometheus with:
scrape_configs:
  - job_name: 'notification-service'
    static_configs:
      - targets: ['your-app-host:3000']
    metrics_path: '/metrics'

# 5. Import dashboard
# Go to Grafana → Dashboards → Import
# Upload: infrastructure/grafana/dashboards/notification-system-comprehensive.json
```

## 📊 Available Metrics

### Key Metrics Exposed

```promql
# Notification metrics
notifications_sent_total{channel, status, tenant_id}
notifications_failed_total{channel, error_type, tenant_id}

# HTTP metrics
http_requests_total{method, route, status_code, tenant_id}
http_request_duration_seconds{method, route, status_code, tenant_id}

# Queue metrics
queue_depth{queue_name, status}

# System metrics
active_connections{type}
circuit_breaker_state{service_name}
retry_attempts_total{operation_name, attempt_number, success}
kafka_messages_processed_total{topic, status, consumer_group}
```

### Example Queries

```promql
# Notification success rate
sum(rate(notifications_sent_total{status="delivered"}[5m])) 
/ 
sum(rate(notifications_sent_total[5m])) * 100

# P95 API latency
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# Error rate by channel
sum by (channel) (rate(notifications_failed_total[5m]))

# Queue backlog
sum(queue_depth) by (queue_name)
```

## 🔧 Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| OBSERVABILITY_PROMETHEUS_ENABLED | true | Enable metrics endpoint |
| PROMETHEUS_METRICS_PATH | /metrics | Metrics endpoint path |
| PROMETHEUS_REMOTE_WRITE_ENABLED | false | Push to remote Prometheus |
| PROMETHEUS_REMOTE_WRITE_URL | - | Remote Prometheus endpoint |
| GRAFANA_ENABLED | false | Enable Grafana integration |
| GRAFANA_URL | - | Grafana instance URL |
| METRICS_PREFIX | notification_system_ | Metrics name prefix |

### Docker Profiles

```bash
# Start without monitoring (default)
docker compose up -d

# Start with monitoring
docker compose --profile monitoring up -d

# Start with full stack
docker compose --profile full up -d
```

## 📁 File Structure

```
notification-system/
├── env.example                          # Template with all options
├── env.development                      # Local development config
├── env.docker                           # Docker/production config
├── docker-compose.yml                   # Updated with monitoring services
├── docs/
│   ├── MONITORING.md                    # Complete guide (500+ lines)
│   └── QUICK_START_MONITORING.md        # Quick setup guide
├── infrastructure/
│   ├── prometheus/
│   │   ├── prometheus.yml               # Prometheus configuration
│   │   └── alerts/
│   │       └── notification-alerts.yml  # Alert rules (18 alerts)
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/
│       │   │   └── prometheus.yml       # Auto-provisioned datasource
│       │   └── dashboards/
│       │       └── dashboard.yml        # Dashboard provider
│       └── dashboards/
│           ├── notification-system-comprehensive.json  # Main dashboard
│           └── notification-overview.json              # Overview dashboard
└── src/
    └── common/
        ├── metrics/
        │   ├── metrics.controller.ts    # Updated with public endpoint
        │   └── metrics.module.ts        # Updated with ObservabilityModule
        └── observability/
            └── metrics.service.ts       # Already exists (prom-client)
```

## 🎯 Next Steps

1. **Start Monitoring**
   ```bash
   cp env.development .env
   docker compose --profile monitoring up -d
   npm run start:dev
   ```

2. **Access Dashboards**
   - Open http://localhost:3001
   - Login with admin/admin
   - View "Notification System - Comprehensive Dashboard"

3. **Generate Test Traffic**
   ```bash
   # Generate some metrics
   for i in {1..100}; do
     curl http://localhost:3000/health
     sleep 0.1
   done
   ```

4. **Configure Alerts** (Optional)
   - Set up Alert Manager or use Grafana Cloud alerts
   - Configure Slack/email notifications

5. **Cloud Setup** (Production)
   - Sign up for Grafana Cloud
   - Update .env with credentials
   - Configure Grafana Agent to scrape metrics
   - Import dashboard to cloud instance

## 🔍 Verification Checklist

- [ ] Metrics endpoint accessible: `curl http://localhost:3000/metrics`
- [ ] Prometheus scraping: Check http://localhost:9090/targets
- [ ] Grafana datasource connected: Configuration → Data Sources
- [ ] Dashboard visible: Dashboards → Browse
- [ ] Panels showing data: Generate traffic and check dashboard
- [ ] Alerts configured: Prometheus → Alerts

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [MONITORING.md](docs/MONITORING.md) | Complete guide with troubleshooting |
| [QUICK_START_MONITORING.md](docs/QUICK_START_MONITORING.md) | Quick setup instructions |
| [env.example](env.example) | All configuration options |
| [README.md](README.md) | Updated with monitoring section |

## 🆘 Troubleshooting

### Metrics endpoint returns 404
```bash
curl http://localhost:3000/health  # Check if app is running
echo $OBSERVABILITY_PROMETHEUS_ENABLED  # Should be 'true'
```

### Prometheus not scraping
```bash
# Check targets in Prometheus
curl http://localhost:9090/targets

# Check if metrics endpoint works
curl http://localhost:3000/metrics
```

### Grafana shows "No Data"
1. Check time range (top right)
2. Generate traffic: `curl http://localhost:3000/health`
3. Wait 30 seconds for next scrape
4. Check datasource in Configuration → Data Sources

### Cloud connection issues
```bash
# Test remote write endpoint
curl -X POST "$PROMETHEUS_REMOTE_WRITE_URL" \
  -u "$PROMETHEUS_REMOTE_WRITE_USERNAME:$PROMETHEUS_REMOTE_WRITE_PASSWORD"
  
# Should return 204 or similar
```

## 💡 Tips

- Start with **local setup** for development
- Use **cloud setup** for staging/production  
- Monitor costs in Grafana Cloud billing
- Adjust alert thresholds based on your baseline
- Use recording rules for expensive queries
- Set appropriate retention periods

## 🎉 Summary

You now have a complete monitoring setup with:
- ✅ Prometheus metrics collection
- ✅ Grafana dashboards with 13+ panels
- ✅ 18 pre-configured alerts
- ✅ Support for both local and cloud deployment
- ✅ Comprehensive documentation
- ✅ Production-ready configuration

**Ready to monitor your notification system!** 🚀
