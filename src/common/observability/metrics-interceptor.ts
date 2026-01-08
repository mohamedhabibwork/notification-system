import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ObservabilityMetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: ObservabilityMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const startTime = Date.now();
    const method = request.method;
    const route = request.route?.path || request.url;
    const tenantId = request.headers['x-tenant-id'];

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.recordHttpRequest(
            method,
            route,
            response.statusCode,
            duration,
            tenantId ? parseInt(tenantId) : undefined,
          );
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.recordHttpRequest(
            method,
            route,
            error.status || 500,
            duration,
            tenantId ? parseInt(tenantId) : undefined,
          );
        },
      }),
    );
  }
}
