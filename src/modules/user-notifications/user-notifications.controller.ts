import {
  Controller,
  Get,
  Patch,
  Delete,
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserNotificationsService } from './user-notifications.service';
import {
  UserNotificationQueryDto,
  BulkDeleteDto,
} from './dto/user-notification-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

@ApiTags('User - Notifications')
@ApiBearerAuth()
@Controller({ path: 'users/me/notifications', version: '1' })
export class UserNotificationsController {
  constructor(
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of user notifications',
  })
  findAll(
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
    @Query() query: UserNotificationQueryDto,
  ) {
    return this.userNotificationsService.findUserNotifications(
      user.sub,
      tenantId,
      query,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Returns unread count' })
  getUnreadCount(
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.userNotificationsService.getUnreadCount(user.sub, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification details' })
  @ApiResponse({ status: 200, description: 'Returns notification details' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.userNotificationsService.findOneUserNotification(
      id,
      user.sub,
      tenantId,
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.userNotificationsService.markAsRead(id, user.sub, tenantId);
  }

  @Patch(':id/unread')
  @ApiOperation({ summary: 'Mark notification as unread' })
  @ApiResponse({ status: 200, description: 'Notification marked as unread' })
  markAsUnread(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.userNotificationsService.markAsUnread(id, user.sub, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  deleteNotification(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.userNotificationsService.deleteNotification(
      id,
      user.sub,
      tenantId,
    );
  }

  @Delete()
  @ApiOperation({ summary: 'Bulk delete notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications deleted successfully',
  })
  bulkDelete(
    @Body() bulkDeleteDto: BulkDeleteDto,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.userNotificationsService.bulkDelete(
      user.sub,
      tenantId,
      bulkDeleteDto,
    );
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.userNotificationsService.markAllAsRead(user.sub, tenantId);
  }
}
