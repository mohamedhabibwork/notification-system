import { Module, Global } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RetryService } from './retry.service';
import { BulkheadService } from './bulkhead.service';

@Global()
@Module({
  providers: [CircuitBreakerService, RetryService, BulkheadService],
  exports: [CircuitBreakerService, RetryService, BulkheadService],
})
export class ResilienceModule {}
