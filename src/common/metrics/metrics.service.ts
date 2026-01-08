import { Injectable } from '@nestjs/common';

interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

@Injectable()
export class MetricsService {
  private metrics: Map<string, Metric[]> = new Map();

  // Notification metrics
  incrementNotificationsSent(channel: string) {
    this.recordMetric('notifications_sent_total', 1, { channel });
  }

  incrementNotificationsDelivered(channel: string) {
    this.recordMetric('notifications_delivered_total', 1, { channel });
  }

  incrementNotificationsFailed(channel: string, reason: string) {
    this.recordMetric('notifications_failed_total', 1, { channel, reason });
  }

  // Queue metrics
  recordQueueDepth(queue: string, depth: number) {
    this.recordMetric('queue_depth', depth, { queue });
  }

  recordQueueProcessingTime(queue: string, durationMs: number) {
    this.recordMetric('queue_processing_time_ms', durationMs, { queue });
  }

  // Provider metrics
  incrementProviderFailure(provider: string, channel: string) {
    this.recordMetric('provider_failures_total', 1, { provider, channel });
  }

  recordProviderResponseTime(provider: string, durationMs: number) {
    this.recordMetric('provider_response_time_ms', durationMs, { provider });
  }

  // API metrics
  recordApiRequest(endpoint: string, method: string, statusCode: number) {
    this.recordMetric('api_requests_total', 1, {
      endpoint,
      method,
      status: statusCode.toString(),
    });
  }

  recordApiLatency(endpoint: string, method: string, durationMs: number) {
    this.recordMetric('api_latency_ms', durationMs, { endpoint, method });
  }

  // Helper method to record metrics
  private recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ) {
    const metric: Metric = {
      name,
      value,
      labels,
      timestamp: new Date(),
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)?.push(metric);

    // Keep only last 1000 entries per metric
    const entries = this.metrics.get(name);
    if (entries && entries.length > 1000) {
      entries.shift();
    }
  }

  // Get metrics in Prometheus format
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    for (const [name, entries] of this.metrics.entries()) {
      // Group by labels
      const grouped = new Map<string, number>();

      for (const entry of entries) {
        const labelStr = entry.labels
          ? Object.entries(entry.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : '';

        const key = labelStr ? `${name}{${labelStr}}` : name;
        grouped.set(key, (grouped.get(key) || 0) + entry.value);
      }

      for (const [key, value] of grouped.entries()) {
        lines.push(`${key} ${value}`);
      }
    }

    return lines.join('\n');
  }

  // Get all metrics as JSON
  getAllMetrics() {
    const result: Record<string, any> = {};

    for (const [name, entries] of this.metrics.entries()) {
      result[name] = entries.map((e) => ({
        value: e.value,
        labels: e.labels,
        timestamp: e.timestamp,
      }));
    }

    return result;
  }

  // Clear metrics (for testing)
  clearMetrics() {
    this.metrics.clear();
  }
}
