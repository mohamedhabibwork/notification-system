# Worker Migration Guide: From Standalone to NestJS-Native

## Overview

This guide documents the migration from standalone worker processes to NestJS-native worker management using BullMQ processors.

## What Changed

### Before (Old Approach)
- **Multiple Entry Points**: Each worker type had its own entry file (e.g., `email.worker.ts`, `sms.worker.ts`)
- **Separate Processes**: Workers ran as individual Node.js processes
- **Manual Bootstrap**: Each worker bootstrapped its own minimal NestJS application
- **Complex Deployment**: Required orchestration of multiple processes (via `concurrently` or separate containers)
- **Resource Duplication**: Each worker maintained separate database connections, Redis connections, etc.

### After (New Approach)
- **Single Application**: All workers run within the main NestJS application
- **Framework-Managed**: NestJS and BullMQ automatically handle worker lifecycle
- **Unified Process**: One application process handles REST API, GraphQL, gRPC, and all workers
- **Simplified Deployment**: Deploy once, scale horizontally
- **Shared Resources**: Connection pools, caches, and services shared across all workers

## Architecture Changes

### Old Architecture
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ Main Service    │     │ Email Worker │     │ SMS Worker  │
│ (REST/GraphQL)  │     │ (Separate)   │     │ (Separate)  │
└────────┬────────┘     └──────┬───────┘     └──────┬──────┘
         │                     │                     │
         └─────────────────────┴─────────────────────┘
                               │
                         Redis (BullMQ)
```

### New Architecture
```
┌─────────────────────────────────────────────────┐
│         NestJS Application                       │
│                                                  │
│  ┌──────────┐  ┌────────────────────────────┐  │
│  │ REST API │  │  ProcessorsModule          │  │
│  │ GraphQL  │  │                            │  │
│  │ gRPC     │  │  • EmailProcessor          │  │
│  └──────────┘  │  • SmsProcessor            │  │
│                │  • FcmProcessor            │  │
│                │  • WhatsAppProcessor       │  │
│                │  • (All other processors)  │  │
│                └────────────────────────────┘  │
└────────────────────────┬────────────────────────┘
                         │
                   Redis (BullMQ)
```

## Technical Details

### How It Works

1. **ProcessorsModule Registration**: The `ProcessorsModule` is imported in `AppModule`, making all processors available when the app starts

2. **Automatic Worker Startup**: Each processor class decorated with `@Processor('queueName')` automatically registers with BullMQ

3. **Job Processing**: When jobs are added to queues, BullMQ automatically distributes them to the appropriate processor

4. **Concurrency**: Configure per-processor concurrency using BullMQ's processor options:
   ```typescript
   @Processor('email', {
     concurrency: 5,  // Process 5 jobs simultaneously
   })
   ```

### Removed Components

The following files were removed as part of this migration:
- `src/processors/*.worker.ts` - Individual worker entry points
- `src/processors/worker.bootstrap.ts` - Worker bootstrap template
- `docker/Dockerfile.worker` - Separate worker container definition

### Removed Scripts

The following npm scripts were removed from `package.json`:
- `start:service` - Redundant with `start`
- `start:worker:email`, `start:worker:sms`, etc. - No longer needed
- `start:all` - No longer needed (just use `start`)
- `build:workers` - No longer needed
- `docker:build:worker` - No longer needed

## Usage

### Local Development

**Before:**
```bash
npm run start:all  # Started service + all workers via concurrently
```

**After:**
```bash
npm start          # Starts everything in one process
npm run start:dev  # With hot reload
```

### Production

**Before:**
```bash
# Had to start multiple processes
npm run start:service &
npm run start:worker:email &
npm run start:worker:sms &
# ... etc
```

**After:**
```bash
# Single process
npm run start:prod
```

### Docker

**Before:**
```yaml
services:
  notification-service:
    build:
      dockerfile: docker/Dockerfile
  email-worker:
    build:
      dockerfile: docker/Dockerfile.worker
    environment:
      - WORKER_TYPE=email
  sms-worker:
    build:
      dockerfile: docker/Dockerfile.worker
    environment:
      - WORKER_TYPE=sms
```

**After:**
```yaml
services:
  notification-service:
    build:
      dockerfile: docker/Dockerfile
    # All workers included automatically
```

## Scaling Strategies

### Horizontal Scaling (Recommended)

Run multiple instances of the entire application:

```bash
# Kubernetes
kubectl scale deployment notification-service --replicas=3

# Docker Compose
docker-compose up --scale notification-service=3

# Docker Swarm
docker service scale notification-service=3
```

**Benefits:**
- Scales API and workers together
- Better resource utilization
- Automatic load balancing via BullMQ
- Simpler deployment pipeline

### Selective Scaling (If Needed)

If you need to scale workers independently:

1. **Disable Processors in API-Only Instances:**
   ```typescript
   // In processors.module.ts, conditionally register based on env var
   const enableWorkers = process.env.ENABLE_WORKERS !== 'false';
   
   @Module({
     providers: enableWorkers ? [
       EmailProcessor,
       SmsProcessor,
       // ...
     ] : [],
   })
   ```

2. **Run Different Configurations:**
   ```bash
   # API-only instances
   ENABLE_WORKERS=false npm start
   
   # Worker-only instances  
   ENABLE_API=false npm start
   ```

**Note:** This is typically not necessary. The unified approach usually provides better performance.

## Performance Considerations

### Advantages

1. **Connection Pool Sharing**: Database and Redis connections shared across all components
2. **Memory Efficiency**: Single process uses less memory than multiple processes
3. **Better CPU Utilization**: Shared event loop and worker threads
4. **Faster Startup**: One application startup instead of many

### Configuration

Tune performance using BullMQ options in each processor:

```typescript
@Processor('email', {
  concurrency: 10,           // Jobs processed in parallel
  limiter: {
    max: 100,               // Max jobs per duration
    duration: 60000,        // Duration in ms
  },
  settings: {
    stalledInterval: 30000, // Check for stalled jobs
    maxStalledCount: 3,     // Max stalled attempts
  },
})
export class EmailProcessor {
  // ...
}
```

## Monitoring

### Unified Logs

All logs now come from a single application:

```bash
# Before: Had to aggregate logs from multiple processes
tail -f service.log worker-email.log worker-sms.log

# After: Single log stream
npm start | pino-pretty
```

### Metrics

Prometheus metrics now include all processors in one scrape target:

```yaml
# Before
scrape_configs:
  - job_name: 'notification-service'
    static_configs:
      - targets: ['service:9090']
  - job_name: 'email-worker'
    static_configs:
      - targets: ['email-worker:9090']
  # ... etc

# After
scrape_configs:
  - job_name: 'notification-system'
    static_configs:
      - targets: ['notification-service:9090']
```

## Testing

### Unit Tests

No changes needed - processor tests remain the same.

### Integration Tests

Simplified - no need to start multiple processes:

```typescript
// Before: Had to bootstrap worker separately
const workerApp = await bootstrapWorker({...});

// After: Processors are included in main app
const app = await Test.createTestingModule({
  imports: [AppModule],  // Includes ProcessorsModule
}).compile();
```

## Troubleshooting

### Issue: Workers Not Processing Jobs

**Check:**
1. Is `ProcessorsModule` imported in `AppModule`?
2. Are processors decorated with `@Processor('queueName')`?
3. Is BullMQ configured correctly in `QueueModule`?
4. Is Redis accessible?

**Debug:**
```bash
# Enable BullMQ debug logs
DEBUG=bull* npm start
```

### Issue: High Memory Usage

**Solutions:**
1. Reduce processor concurrency
2. Implement job result limits
3. Configure Redis memory limits
4. Use horizontal scaling

### Issue: Need to Scale Specific Worker Types

**Solutions:**
1. Use processor concurrency settings
2. Create worker-specific deployments (see Selective Scaling above)
3. Consider separate queue priorities

## Migration Checklist

- [x] Remove individual worker entry files
- [x] Remove `worker.bootstrap.ts`
- [x] Update `package.json` scripts
- [x] Update Docker configuration
- [x] Update docker-compose files
- [x] Document changes
- [ ] Update deployment pipelines
- [ ] Update monitoring/alerting
- [ ] Update infrastructure as code (Terraform, etc.)
- [ ] Communicate changes to team
- [ ] Update runbooks

## Questions?

For issues or questions about this migration:
1. Check the ProcessorsModule documentation
2. Review BullMQ documentation: https://docs.bullmq.io/
3. Check application logs for startup issues
4. Verify Redis connectivity and configuration

## Benefits Summary

✅ **Simpler**: One application to deploy and manage  
✅ **Faster**: Shared resources and connections  
✅ **Cheaper**: Better resource utilization  
✅ **Cleaner**: Less code, fewer entry points  
✅ **Flexible**: Easy to scale horizontally  
✅ **Observable**: Unified logging and metrics  

The NestJS-native approach is the recommended way to run workers in modern NestJS applications.
