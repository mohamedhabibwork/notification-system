import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  SendNotificationDto,
  SendBatchDto,
  SendChunkDto,
} from './dto/send-notification.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { Scopes } from '../auth/decorators/scopes.decorator';

@ApiTags('Services - Notifications')
@ApiSecurity('bearer')
@Controller({ path: 'services/notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @Scopes('notification:send')
  @ApiOperation({ summary: 'Send a single notification (service-to-service)' })
  @ApiResponse({ status: 202, description: 'Notification queued successfully' })
  sendSingle(
    @Body() dto: SendNotificationDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.notificationsService.sendSingle(dto, user.sub);
  }

  @Post('send-batch')
  @Scopes('notification:send')
  @ApiOperation({
    summary:
      'Send multiple notifications and create a batch (returns batch_id)',
  })
  @ApiResponse({
    status: 202,
    description: 'Batch created and notifications queued',
  })
  sendBatch(@Body() dto: SendBatchDto, @CurrentUser() user: UserContext) {
    return this.notificationsService.sendBatch(dto, user.sub);
  }

  @Post('send-chunk')
  @Scopes('notification:send')
  @ApiOperation({
    summary:
      'Send a chunk of notifications to an existing batch (requires batch_id and batch_token)',
  })
  @ApiResponse({ status: 202, description: 'Chunk queued successfully' })
  sendChunk(@Body() dto: SendChunkDto, @CurrentUser() user: UserContext) {
    return this.notificationsService.sendChunk(dto, user.sub);
  }

  @Get('batches/:batchId')
  @Scopes('notification:manage')
  @ApiOperation({ summary: 'Get batch status and statistics' })
  @ApiResponse({ status: 200, description: 'Returns batch status' })
  getBatchStatus(@Param('batchId') batchId: string) {
    return this.notificationsService.getBatchStatus(batchId);
  }

  @Get('batches/:batchId/notifications')
  @Scopes('notification:manage')
  @ApiOperation({ summary: 'List notifications in a batch' })
  @ApiResponse({ status: 200, description: 'Returns notifications in batch' })
  getBatchNotifications(
    @Param('batchId') batchId: string,
    @Query('limit', ParseIntPipe) limit = 100,
    @Query('offset', ParseIntPipe) offset = 0,
  ) {
    return this.notificationsService.getBatchNotifications(
      batchId,
      limit,
      offset,
    );
  }
}

@ApiTags('Admin - Notifications')
@ApiSecurity('bearer')
@Controller('api/v1/admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all notifications (admin)' })
  @ApiResponse({ status: 200, description: 'Returns list of notifications' })
  findAll(
    @CurrentTenant() tenantId: number,
    @Query('limit', ParseIntPipe) limit = 50,
    @Query('offset', ParseIntPipe) offset = 0,
  ) {
    return this.notificationsService.findAll(tenantId, limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification details (admin)' })
  @ApiResponse({ status: 200, description: 'Returns notification details' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenantId?: number,
  ) {
    return this.notificationsService.findOne(id, tenantId);
  }
}
