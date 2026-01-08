import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { register, Counter, Histogram, Gauge, Registry } from 'prom-client';

@Injectable()
export class ObservabilityMetricsService {
  private readonly logger = new Logger(ObservabilityMetricsService.name);
  private readonly registry: Registry;
  public httpRequestDuration: Histogram<string>;
  public httpRequestTotal: Counter<string>;
  public notificationsSent: Counter<string>;
  public notificationsFailed: Counter<string>;
  public activeConnections: Gauge<string>;
  public kafkaMessageProcessed: Counter<string>;
  public circuitBreakerState: Gauge<string>;
  public retryAttempts: Counter<string>;
  public queueDepth: Gauge<string>;

  constructor(private readonly configService: ConfigService) {
    const enabled = this.configService.get<boolean>(
      'OBSERVABILITY_PROMETHEUS_ENABLED',
      true,
    );

    if (enabled) {
      this.registry = register;
      this.initializeMetrics();
      this.logger.log('Prometheus metrics initialized');
    }
  }

  private initializeMetrics(): void {
    // HTTP Request Duration
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'tenant_id'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    // HTTP Request Total
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'tenant_id'],
    });

    // Notifications Sent
    this.notificationsSent = new Counter({
      name: 'notifications_sent_total',
      help: 'Total notifications sent',
      labelNames: ['channel', 'status', 'tenant_id'],
    });

    // Notifications Failed
    this.notificationsFailed = new Counter({
      name: 'notifications_failed_total',
      help: 'Total notifications failed',
      labelNames: ['channel', 'error_type', 'tenant_id'],
    });

    // Active Connections
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['type'], // websocket, http, grpc
    });

    // Kafka Messages Processed
    this.kafkaMessageProcessed = new Counter({
      name: 'kafka_messages_processed_total',
      help: 'Total Kafka messages processed',
      labelNames: ['topic', 'status', 'consumer_group'],
    });

    // Circuit Breaker State
    this.circuitBreakerState = new Gauge({
      name: 'circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
      labelNames: ['service_name'],
    });

    // Retry Attempts
    this.retryAttempts = new Counter({
      name: 'retry_attempts_total',
      help: 'Total retry attempts',
      labelNames: ['operation_name', 'attempt_number', 'success'],
    });

    // Queue Depth
    this.queueDepth = new Gauge({
      name: 'queue_depth',
      help: 'Number of jobs waiting in queue',
      labelNames: ['queue_name', 'status'],
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Helper methods for recording metrics
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
    tenantId?: number,
  ): void {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
      tenant_id: tenantId?.toString() || 'unknown',
    };

    this.httpRequestTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);
  }

  recordNotificationSent(
    channel: string,
    status: string,
    tenantId: number,
  ): void {
    this.notificationsSent.inc({
      channel,
      status,
      tenant_id: tenantId.toString(),
    });
  }

  recordNotificationFailed(
    channel: string,
    errorType: string,
    tenantId: number,
  ): void {
    this.notificationsFailed.inc({
      channel,
      error_type: errorType,
      tenant_id: tenantId.toString(),
    });
  }

  setActiveConnections(type: string, count: number): void {
    this.activeConnections.set({ type }, count);
  }

  recordKafkaMessage(
    topic: string,
    status: 'success' | 'failed',
    consumerGroup: string,
  ): void {
    this.kafkaMessageProcessed.inc({
      topic,
      status,
      consumer_group: consumerGroup,
    });
  }

  setCircuitBreakerState(
    serviceName: string,
    state: 'CLOSED' | 'HALF_OPEN' | 'OPEN',
  ): void {
    const stateValue = { CLOSED: 0, HALF_OPEN: 1, OPEN: 2 }[state];
    this.circuitBreakerState.set({ service_name: serviceName }, stateValue);
  }

  recordRetry(
    operationName: string,
    attemptNumber: number,
    success: boolean,
  ): void {
    this.retryAttempts.inc({
      operation_name: operationName,
      attempt_number: attemptNumber.toString(),
      success: success.toString(),
    });
  }

  setQueueDepth(queueName: string, depth: number, status: string): void {
    this.queueDepth.set({ queue_name: queueName, status }, depth);
  }
}
