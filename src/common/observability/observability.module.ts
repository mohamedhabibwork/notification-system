import { Module, Global } from '@nestjs/common';
import { ObservabilityLoggerService } from './observability-logger.service';
import { ObservabilityMetricsService } from './metrics.service';
import { TracingService } from './tracing.service';

@Global()
@Module({
  providers: [
    ObservabilityLoggerService,
    ObservabilityMetricsService,
    TracingService,
  ],
  exports: [
    ObservabilityLoggerService,
    ObservabilityMetricsService,
    TracingService,
  ],
})
export class ObservabilityModule {}
