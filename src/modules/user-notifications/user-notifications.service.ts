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
    userId: string,
    tenantId: number,
    query: UserNotificationQueryDto,
  ) {
    const conditions = [
      eq(notifications.recipientUserId, userId),
      eq(notifications.tenantId, tenantId),
      isNull(notifications.deletedAt),
    ];

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

  async findOneUserNotification(id: number, userId: string, tenantId: number) {
    const [notification] = await this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, userId),
          eq(notifications.tenantId, tenantId),
        ),
      );

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async markAsRead(id: number, userId: string, tenantId: number) {
    // Verify ownership
    await this.findOneUserNotification(id, userId, tenantId);

    const [updated] = await this.db
      .update(notifications)
      .set({
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, userId),
          eq(notifications.tenantId, tenantId),
        ),
      )
      .returning();

    return updated;
  }

  async markAsUnread(id: number, userId: string, tenantId: number) {
    // Verify ownership
    await this.findOneUserNotification(id, userId, tenantId);

    const [updated] = await this.db
      .update(notifications)
      .set({
        readAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, userId),
          eq(notifications.tenantId, tenantId),
        ),
      )
      .returning();

    return updated;
  }

  async deleteNotification(id: number, userId: string, tenantId: number) {
    // Verify ownership
    await this.findOneUserNotification(id, userId, tenantId);

    const [deleted] = await this.db
      .update(notifications)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, userId),
          eq(notifications.tenantId, tenantId),
        ),
      )
      .returning();

    return deleted;
  }

  async bulkDelete(
    userId: string,
    tenantId: number,
    bulkDeleteDto: BulkDeleteDto,
  ) {
    const conditions = [
      eq(notifications.recipientUserId, userId),
      eq(notifications.tenantId, tenantId),
      isNull(notifications.deletedAt),
    ];

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

  async getUnreadCount(userId: string, tenantId: number) {
    const results = await this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          eq(notifications.tenantId, tenantId),
          isNull(notifications.readAt),
          isNull(notifications.deletedAt),
        ),
      );

    return {
      unreadCount: results.length,
    };
  }

  async markAllAsRead(userId: string, tenantId: number) {
    const result = await this.db
      .update(notifications)
      .set({
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          eq(notifications.tenantId, tenantId),
          isNull(notifications.readAt),
          isNull(notifications.deletedAt),
        ),
      )
      .returning();

    return {
      markedCount: result.length,
      message: `${result.length} notification(s) marked as read`,
    };
  }
}
