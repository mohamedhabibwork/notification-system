import { Controller, Get, Header } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { ObservabilityMetricsService } from '../observability/metrics.service';
import { Public } from '../../modules/auth/decorators/public.decorator';

@ApiTags('System')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly observabilityMetricsService: ObservabilityMetricsService,
  ) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description:
      'Returns all application metrics in Prometheus format for scraping by Prometheus server',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns metrics in Prometheus format',
    type: String,
  })
  async getMetrics() {
    // Get metrics from both services and combine them
    const basicMetrics = this.metricsService.getPrometheusMetrics();
    const observabilityMetrics =
      await this.observabilityMetricsService.getMetrics();

    // Return observability metrics (prom-client) as it's more comprehensive
    return observabilityMetrics;
  }

  @Get('json')
  @Public()
  @ApiExcludeEndpoint()
  getMetricsJson() {
    return this.metricsService.getAllMetrics();
  }
}
