# Quick Start: Monitoring Setup

Choose your setup based on your environment:

## 🚀 Local Development (Recommended for Dev)

```bash
# 1. Setup environment
cp env.development .env

# 2. Start infrastructure with monitoring
docker compose --profile monitoring up -d

# 3. Start application
npm run start:dev
# or
bun run start:dev

# 4. Access dashboards
# - Metrics: http://localhost:3000/metrics
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
```

## ☁️ Cloud Prometheus & Grafana (Production)

### Step 1: Get Your Cloud Credentials

**Grafana Cloud:**
1. Sign up at https://grafana.com/products/cloud/
2. Go to your stack → Configuration → Data Sources
3. Note your Prometheus remote write endpoint and credentials

**Example:**
- URL: `https://prometheus-prod-xx-xxx.grafana.net/api/prom/push`
- Username: `123456` (Instance ID)
- Password: `glc_xxxxxx` (API Token)

### Step 2: Configure Environment

```bash
# Copy environment file
cp env.docker .env  # For Docker
# or
cp env.development .env  # For local dev with cloud monitoring

# Edit .env
nano .env
```

Add these values:

```bash
# Cloud Prometheus
PROMETHEUS_REMOTE_WRITE_ENABLED=true
PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
PROMETHEUS_REMOTE_WRITE_USERNAME=123456
PROMETHEUS_REMOTE_WRITE_PASSWORD=glc_xxxxxx

# Cloud Grafana
GRAFANA_ENABLED=true
GRAFANA_URL=https://yourname.grafana.net
GRAFANA_API_KEY=glsa_xxxxxx
```

### Step 3: Configure Prometheus Scraping

**Option A: Using Grafana Agent (Recommended)**

Install Grafana Agent on your server:

```yaml
# /etc/grafana-agent.yaml
metrics:
  global:
    scrape_interval: 15s
    remote_write:
      - url: https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
        basic_auth:
          username: 123456
          password: glc_xxxxxx
  configs:
    - name: notification-system
      scrape_configs:
        - job_name: 'notification-service'
          static_configs:
            - targets: ['localhost:3000']
              labels:
                service: 'notification-system'
                environment: 'production'
          metrics_path: '/metrics'
```

**Option B: Configure Prometheus to Scrape**

If using your own Prometheus that writes to cloud:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'notification-service'
    static_configs:
      - targets: ['your-app-host:3000']
        labels:
          service: 'notification-system'
          environment: 'production'

remote_write:
  - url: https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
    basic_auth:
      username: 123456
      password: glc_xxxxxx
```

### Step 4: Import Dashboard

1. Login to Grafana Cloud
2. Go to Dashboards → Import
3. Upload: `infrastructure/grafana/dashboards/notification-system-comprehensive.json`
4. Select your Prometheus datasource
5. Click Import

### Step 5: Start Application

```bash
# Docker
docker compose up -d

# Or local
npm run start:dev
```

### Step 6: Verify Metrics

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics

# Check in Grafana Cloud
# Go to Explore → Select Prometheus
# Query: up{job="notification-service"}
```

## 🔧 Environment Files Reference

| File | Usage | Network |
|------|-------|---------|
| `env.development` | Local development | localhost |
| `env.docker` | Docker deployment | container names |
| `env.example` | Template with all options | documentation |

## 📊 Dashboard URLs

After setup, access your monitoring:

| Tool | Local | Cloud |
|------|-------|-------|
| Metrics Endpoint | http://localhost:3000/metrics | https://your-domain/metrics |
| Prometheus | http://localhost:9090 | Your cloud URL |
| Grafana | http://localhost:3001 | https://yourname.grafana.net |
| API Docs | http://localhost:3000/api | https://your-domain/api |

## 🚨 Common Issues

### Metrics Endpoint Returns 404
```bash
# Check if service is running
curl http://localhost:3000/health

# Check environment variables
echo $OBSERVABILITY_PROMETHEUS_ENABLED  # Should be 'true'
```

### Prometheus Not Scraping
```bash
# Check Prometheus targets
curl http://localhost:9090/targets

# Check if metrics endpoint is accessible
curl http://localhost:3000/metrics
```

### Grafana Shows "No Data"
1. Check time range (top right)
2. Verify datasource connection
3. Generate some traffic: `curl http://localhost:3000/health`
4. Wait 30 seconds for scrape

### Cloud Connection Failed
```bash
# Test remote write endpoint
curl -X POST "https://prometheus-prod-xx-xxx.grafana.net/api/prom/push" \
  -u "123456:glc_xxxxxx" \
  -H "Content-Type: application/x-protobuf"

# Should return 204 or similar success code
```

## 📚 Next Steps

1. **Customize Dashboards**: Edit dashboard JSON or create new panels
2. **Setup Alerts**: Configure Alert Manager or use Grafana Cloud alerts
3. **Add Custom Metrics**: Add application-specific metrics in code
4. **Monitor Costs**: For cloud, check usage in Grafana Cloud billing

## 💡 Tips

- Start with **local setup** for development
- Use **cloud setup** for staging/production
- Monitor your metrics endpoint: `watch -n 1 'curl -s http://localhost:3000/metrics | head -20'`
- Check dashboard auto-refresh: Set to 10s or 30s for development

## 📖 Full Documentation

For detailed information, see:
- [MONITORING.md](./MONITORING.md) - Complete monitoring guide
- [Environment Variables](../env.example) - All configuration options
- [Prometheus Alerts](../infrastructure/prometheus/alerts/) - Alert rules
- [Grafana Dashboards](../infrastructure/grafana/dashboards/) - Dashboard JSON

## 🆘 Support

Need help? Check:
1. Application logs: `docker compose logs notification-service`
2. Prometheus logs: `docker compose logs prometheus`
3. Grafana logs: `docker compose logs grafana`
4. Metrics endpoint: `curl http://localhost:3000/metrics`
