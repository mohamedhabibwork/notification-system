import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { notifications } from '../../database/schema';
import { eq, and, desc, gte, lte, isNull, inArray, lt } from 'drizzle-orm';
import {
  UserNotificationQueryDto,
  BulkDeleteDto,
} from './dto/user-notification-query.dto';

@Injectable()
export class UserNotificationsService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findUserNotifications(
    userId: string | undefined,
    tenantId: number | undefined,
    query: UserNotificationQueryDto,
    userRoles: string[] = [],
  ) {
    // Validate tenantId - always required
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant ID is required. Please provide x-tenant-id header or ensure your JWT contains tenant_id.',
      );
    }

    // Check if user is admin
    const isAdmin =
      userRoles.includes('admin') ||
      userRoles.includes('system-admin') ||
      userRoles.includes('super-admin');

    const conditions = [
      eq(notifications.tenantId, tenantId),
      isNull(notifications.deletedAt),
    ];

    // Admin can filter by userId/userType from query params
    if (isAdmin) {
      // If admin provides userId filter, use it
      if (query.userId) {
        conditions.push(eq(notifications.recipientUserId, query.userId));
      }
      // If admin provides userType filter, use it
      if (query.userType) {
        conditions.push(eq(notifications.recipientUserType, query.userType));
      }
      // If no filters provided by admin, show all notifications in tenant
    } else {
      // Non-admin users can only see their own notifications
      if (userId) {
        conditions.push(eq(notifications.recipientUserId, userId));
      }
    }

    // Filter by status
    if (query.status) {
      // Map status to statusId (you would have a proper lookup)
      const statusMap: Record<string, number> = {
        pending: 1,
        queued: 2,
        sent: 3,
        delivered: 4,
        failed: 5,
      };
      if (statusMap[query.status]) {
        conditions.push(eq(notifications.statusId, statusMap[query.status]));
      }
      // Handle 'read' status
      if (query.status === 'read') {
        conditions.push(isNull(notifications.readAt) as any);
      }
    }

    // Filter by channel
    if (query.channel) {
      conditions.push(eq(notifications.channel, query.channel));
    }

    // Filter by date range
    if (query.dateFrom) {
      conditions.push(gte(notifications.createdAt, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      conditions.push(lte(notifications.createdAt, new Date(query.dateTo)));
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const results = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(notifications.createdAt));

    return results;
  }

  async findOneUserNotification(
    id: number,
    userId: string | undefined,
    tenantId: number | undefined,
    userRoles: string[] = [],
  ) {
    // Validate tenantId - always required
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant ID is required. Please provide x-tenant-id header or ensure your JWT contains tenant_id.',
      );
    }

    // Check if user is admin
    const isAdmin =
      userRoles.includes('admin') ||
      userRoles.includes('system-admin') ||
      userRoles.includes('super-admin');

    const conditions = [
      eq(notifications.id, id),
      eq(notifications.tenantId, tenantId),
    ];

    // Non-admin users can only see their own notifications
    if (!isAdmin && userId) {
      conditions.push(eq(notifications.recipientUserId, userId));
    }

    const [notification] = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions));

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async markAsRead(
    id: number,
    userId: string | undefined,
    tenantId: number | undefined,
    userRoles: string[] = [],
  ) {
    // Validate tenantId - always required
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant ID is required. Please provide x-tenant-id header or ensure your JWT contains tenant_id.',
      );
    }

    const isAdmin =
      userRoles.includes('admin') ||
      userRoles.includes('system-admin') ||
      userRoles.includes('super-admin');

    // Verify existence and ownership
    const notification = await this.findOneUserNotification(
      id,
      userId,
      tenantId,
      userRoles,
    );

    const conditions = [
      eq(notifications.id, id),
      eq(notifications.tenantId, tenantId),
    ];

    // Non-admin users can only update their own notifications
    if (!isAdmin && userId) {
      conditions.push(eq(notifications.recipientUserId, userId));
    }

    const [updated] = await this.db
      .update(notifications)
      .set({
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    return updated;
  }

  async markAsUnread(
    id: number,
    userId: string | undefined,
    tenantId: number | undefined,
    userRoles: string[] = [],
  ) {
    // Validate tenantId - always required
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant ID is required. Please provide x-tenant-id header or ensure your JWT contains tenant_id.',
      );
    }

    const isAdmin =
      userRoles.includes('admin') ||
      userRoles.includes('system-admin') ||
      userRoles.includes('super-admin');

    // Verify existence and ownership
    const notification = await this.findOneUserNotification(
      id,
      userId,
      tenantId,
      userRoles,
    );

    const conditions = [
      eq(notifications.id, id),
      eq(notifications.tenantId, tenantId),
    ];

    // Non-admin users can only update their own notifications
    if (!isAdmin && userId) {
      conditions.push(eq(notifications.recipientUserId, userId));
    }

    const [updated] = await this.db
      .update(notifications)
      .set({
        readAt: null,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    return updated;
  }

  async deleteNotification(
    id: number,
    userId: string | undefined,
    tenantId: number | undefined,
    userRoles: string[] = [],
  ) {
    // Validate tenantId - always required
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant ID is required. Please provide x-tenant-id header or ensure your JWT contains tenant_id.',
      );
    }

    const isAdmin =
      userRoles.includes('admin') ||
      userRoles.includes('system-admin') ||
      userRoles.includes('super-admin');

    // Verify existence and ownership
    const notification = await this.findOneUserNotification(
      id,
      userId,
      tenantId,
      userRoles,
    );

    const conditions = [
      eq(notifications.id, id),
      eq(notifications.tenantId, tenantId),
    ];

    // Non-admin users can only delete their own notifications
    if (!isAdmin && userId) {
      conditions.push(eq(notifications.recipientUserId, userId));
    }

    const [deleted] = await this.db
      .update(notifications)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    return deleted;
  }

  async bulkDelete(
    userId: string | undefined,
    tenantId: number | undefined,
    bulkDeleteDto: BulkDeleteDto,
    userRoles: string[] = [],
  ) {
    // Validate tenantId - always required
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant ID is required. Please provide x-tenant-id header or ensure your JWT contains tenant_id.',
      );
    }

    const isAdmin =
      userRoles.includes('admin') ||
      userRoles.includes('system-admin') ||
      userRoles.includes('super-admin');

    const conditions = [
      eq(notifications.tenantId, tenantId),
      isNull(notifications.deletedAt),
    ];

    // Admin can filter by userId/userType
    if (isAdmin) {
      if (bulkDeleteDto.userId) {
        conditions.push(
          eq(notifications.recipientUserId, bulkDeleteDto.userId),
        );
      }
      if (bulkDeleteDto.userType) {
        conditions.push(
          eq(notifications.recipientUserType, bulkDeleteDto.userType),
        );
      }
    } else {
      // Non-admin deletes only their own
      if (userId) {
        conditions.push(eq(notifications.recipientUserId, userId));
      }
    }

    // Delete by specific IDs
    if (
      bulkDeleteDto.notificationIds &&
      bulkDeleteDto.notificationIds.length > 0
    ) {
      const ids = bulkDeleteDto.notificationIds.map((id) => parseInt(id, 10));
      conditions.push(inArray(notifications.id, ids));
    }

    // Delete by status
    if (bulkDeleteDto.status) {
      const statusMap: Record<string, number> = {
        pending: 1,
        queued: 2,
        sent: 3,
        delivered: 4,
        failed: 5,
      };
      if (statusMap[bulkDeleteDto.status]) {
        conditions.push(
          eq(notifications.statusId, statusMap[bulkDeleteDto.status]),
        );
      }
    }

    // Delete older than date
    if (bulkDeleteDto.olderThan) {
      conditions.push(
        lt(notifications.createdAt, new Date(bulkDeleteDto.olderThan)),
      );
    }

    const result = await this.db
      .update(notifications)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    return {
      deletedCount: result.length,
      message: `${result.length} notification(s) deleted`,
    };
  }

  async getUnreadCount(
    userId: string | undefined,
    tenantId: number | undefined,
    query: UserNotificationQueryDto,
    userRoles: string[] = [],
  ) {
    // Validate tenantId - always required
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant ID is required. Please provide x-tenant-id header or ensure your JWT contains tenant_id.',
      );
    }

    const isAdmin =
      userRoles.includes('admin') ||
      userRoles.includes('system-admin') ||
      userRoles.includes('super-admin');

    const conditions = [
      eq(notifications.tenantId, tenantId),
      isNull(notifications.readAt),
      isNull(notifications.deletedAt),
    ];

    // Admin can filter by userId/userType
    if (isAdmin) {
      if (query.userId) {
        conditions.push(eq(notifications.recipientUserId, query.userId));
      }
      if (query.userType) {
        conditions.push(eq(notifications.recipientUserType, query.userType));
      }
    } else {
      // Non-admin sees only their own
      if (userId) {
        conditions.push(eq(notifications.recipientUserId, userId));
      }
    }

    const results = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions));

    return {
      unreadCount: results.length,
    };
  }

  async markAllAsRead(
    userId: string | undefined,
    tenantId: number | undefined,
    query: UserNotificationQueryDto,
    userRoles: string[] = [],
  ) {
    // Validate tenantId - always required
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant ID is required. Please provide x-tenant-id header or ensure your JWT contains tenant_id.',
      );
    }

    const isAdmin =
      userRoles.includes('admin') ||
      userRoles.includes('system-admin') ||
      userRoles.includes('super-admin');

    const conditions = [
      eq(notifications.tenantId, tenantId),
      isNull(notifications.deletedAt),
      isNull(notifications.readAt),
    ];

    // Admin can filter by userId/userType
    if (isAdmin) {
      if (query.userId) {
        conditions.push(eq(notifications.recipientUserId, query.userId));
      }
      if (query.userType) {
        conditions.push(eq(notifications.recipientUserType, query.userType));
      }
    } else {
      // Non-admin marks only their own
      if (userId) {
        conditions.push(eq(notifications.recipientUserId, userId));
      }
    }

    const result = await this.db
      .update(notifications)
      .set({
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    return {
      markedCount: result.length,
      message: `${result.length} notification(s) marked as read`,
    };
  }
}
