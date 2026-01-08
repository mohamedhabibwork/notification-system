import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WebhookConfigService } from '../webhook-config.service';
import {
  CreateWebhookConfigDto,
  UpdateWebhookConfigDto,
  WebhookConfigResponseDto,
  WebhookTestDto,
  WebhookTestResponseDto,
  WebhookEventDto,
} from '../dto/webhook-config.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { UserContext } from '../../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { WebhookClientService } from '../webhook-client.service';

@ApiTags('Admin - Webhooks')
@ApiBearerAuth()
@Controller({ path: 'admin/webhooks', version: '1' })
export class WebhookConfigController {
  constructor(
    private readonly webhookConfigService: WebhookConfigService,
    private readonly webhookClientService: WebhookClientService,
  ) {}

  @Post()
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Create webhook configuration' })
  @ApiResponse({
    status: 201,
    description: 'Webhook configuration created',
    type: WebhookConfigResponseDto,
  })
  create(
    @Body() createDto: CreateWebhookConfigDto,
    @CurrentUser() user: UserContext,
  ): Promise<WebhookConfigResponseDto> {
    return this.webhookConfigService.create(createDto, user.sub);
  }

  @Get()
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Get all webhook configurations for tenant' })
  @ApiResponse({
    status: 200,
    description: 'List of webhook configurations',
    type: [WebhookConfigResponseDto],
  })
  findAll(
    @CurrentTenant() tenantId: number,
  ): Promise<WebhookConfigResponseDto[]> {
    return this.webhookConfigService.findByTenant(tenantId);
  }

  @Get(':id')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Get webhook configuration by ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook configuration found',
    type: WebhookConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook configuration not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenantId: number,
  ): Promise<WebhookConfigResponseDto> {
    return this.webhookConfigService.findOne(id, tenantId);
  }

  @Put(':id')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Update webhook configuration' })
  @ApiResponse({
    status: 200,
    description: 'Webhook configuration updated',
    type: WebhookConfigResponseDto,
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateWebhookConfigDto,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ): Promise<WebhookConfigResponseDto> {
    return this.webhookConfigService.update(id, updateDto, user.sub, tenantId);
  }

  @Delete(':id')
  @Roles('notification-admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete webhook configuration' })
  @ApiResponse({ status: 204, description: 'Webhook configuration deleted' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ): Promise<void> {
    await this.webhookConfigService.delete(id, user.sub, tenantId);
  }

  @Post(':id/test')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Webhook test result',
    type: WebhookTestResponseDto,
  })
  async testWebhook(
    @Param('id', ParseIntPipe) id: number,
    @Body() testDto: WebhookTestDto,
    @CurrentTenant() tenantId: number,
  ): Promise<WebhookTestResponseDto> {
    const config = await this.webhookConfigService.findOne(id, tenantId);
    
    const testPayload = {
      event: testDto.eventType,
      timestamp: new Date().toISOString(),
      tenantId,
      notification: testDto.testPayload || {
        id: 999,
        uuid: 'test-notification-uuid',
        channel: 'email',
        status: 'test',
        recipient: { email: 'test@example.com' },
      },
    };

    const startTime = Date.now();
    const success = await this.webhookClientService.sendWebhookDirect(
      config.webhookUrl,
      testPayload as any,
      config.webhookSecret,
    );

    return {
      success,
      statusCode: success ? 200 : 500,
      responseTime: Date.now() - startTime,
      errorMessage: success ? undefined : 'Webhook test failed',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('events/available')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Get available webhook events' })
  @ApiResponse({
    status: 200,
    description: 'List of available webhook events',
    type: [WebhookEventDto],
  })
  getAvailableEvents(): WebhookEventDto[] {
    return this.webhookConfigService.getAvailableEvents().map((event) => ({
      eventType: event.eventType,
      description: event.description,
      samplePayload: this.getSamplePayload(event.eventType),
    }));
  }

  @Get('logs')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Get webhook delivery logs' })
  @ApiResponse({ status: 200, description: 'Webhook delivery logs' })
  getDeliveryLogs(
    @CurrentTenant() tenantId: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 100,
    @Query('offset', new ParseIntPipe({ optional: true })) offset = 0,
  ) {
    return this.webhookConfigService.getDeliveryLogs(tenantId, limit, offset);
  }

  private getSamplePayload(eventType: string): Record<string, any> {
    const baseSample = {
      event: eventType,
      timestamp: new Date().toISOString(),
      tenantId: 1,
      notification: {
        id: 123,
        uuid: 'notif-uuid-123',
        channel: 'email',
        status: 'sent',
        recipient: {
          userId: 'user-123',
          email: 'user@example.com',
        },
      },
    };

    switch (eventType) {
      case 'notification.delivered':
        return {
          ...baseSample,
          notification: {
            ...baseSample.notification,
            deliveredAt: new Date().toISOString(),
          },
        };
      case 'notification.failed':
        return {
          ...baseSample,
          notification: {
            ...baseSample.notification,
            failedAt: new Date().toISOString(),
            failureReason: 'Invalid email address',
          },
        };
      default:
        return baseSample;
    }
  }
}
