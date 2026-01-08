import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import {
  bulkNotificationJobs,
  bulkNotificationItems,
} from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as Papa from 'papaparse';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationGateway } from '../../gateways/notification.gateway';

@Injectable()
export class BulkJobsService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly notificationsService: NotificationsService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async createJob(
    file: Express.Multer.File,
    tenantId: number,
    channel: string,
    templateId: number | undefined,
    createdBy: string,
  ) {
    // Parse CSV
    const csvContent = file.buffer.toString('utf-8');
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      throw new BadRequestException(
        `CSV parsing failed: ${parseResult.errors[0].message}`,
      );
    }

    const items = parseResult.data as any[];

    if (items.length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    // Validate CSV structure
    this.validateCsvStructure(items[0], channel);

    // Create bulk job
    const [job] = await this.db
      .insert(bulkNotificationJobs)
      .values({
        tenantId,
        jobName: `Bulk notification job - ${new Date().toISOString()}`,
        sourceType: 'csv',
        filePath: file.path,
        totalCount: items.length,
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        status: 'pending',
        configuration: {
          channel,
          templateId,
        } as any,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    // Create bulk items
    const bulkItems = items.map((item, index) => ({
      bulkJobId: job.id,
      rowNumber: index + 1,
      csvData: item,
      status: 'pending',
    }));

    // Insert in chunks
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < bulkItems.length; i += CHUNK_SIZE) {
      const chunk = bulkItems.slice(i, i + CHUNK_SIZE);
      await this.db.insert(bulkNotificationItems).values(chunk);
    }

    // Start processing (in background)
    this.processJobAsync(job.id, createdBy);

    return {
      jobId: job.id,
      totalItems: items.length,
      status: 'pending',
      message: 'Bulk job created and processing started',
    };
  }

  private validateCsvStructure(sample: any, channel: string) {
    // Validate required columns based on channel
    const requiredColumns = ['userId'];

    if (channel === 'email') {
      requiredColumns.push('email');
    } else if (channel === 'sms' || channel === 'whatsapp') {
      requiredColumns.push('phone');
    }

    for (const col of requiredColumns) {
      if (!(col in sample)) {
        throw new BadRequestException(`CSV missing required column: ${col}`);
      }
    }
  }

  private async processJobAsync(jobId: number, createdBy: string) {
    try {
      // Update job status to processing
      await this.db
        .update(bulkNotificationJobs)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(bulkNotificationJobs.id, jobId));

      // Get job details
      const [job] = await this.db
        .select()
        .from(bulkNotificationJobs)
        .where(eq(bulkNotificationJobs.id, jobId));

      // Get all items for this job
      const items = await this.db
        .select()
        .from(bulkNotificationItems)
        .where(eq(bulkNotificationItems.bulkJobId, jobId));

      let successCount = 0;
      let failCount = 0;

      // Extract configuration
      const config = job.configuration as any;
      const channel = config?.channel;
      const templateId = config?.templateId;

      // Process each item
      for (const item of items) {
        try {
          // Extract recipient data from csvData
          const csvData = item.csvData as any;

          // Create notification
          await this.notificationsService.sendSingle(
            {
              tenantId: job.tenantId,
              channel: channel,
              recipient: {
                recipientUserId: csvData?.userId || csvData?.user_id,
                recipientUserType: csvData?.userType || csvData?.user_type,
                recipientEmail: csvData?.email,
                recipientPhone: csvData?.phone,
              },
              templateId: templateId,
              templateVariables: csvData,
            },
            createdBy,
          );

          // Mark item as successful
          await this.db
            .update(bulkNotificationItems)
            .set({ status: 'processed', processedAt: new Date() })
            .where(eq(bulkNotificationItems.id, item.id));

          successCount++;
        } catch (error) {
          // Mark item as failed
          await this.db
            .update(bulkNotificationItems)
            .set({
              status: 'failed',
              errorMessage: error.message,
              processedAt: new Date(),
            })
            .where(eq(bulkNotificationItems.id, item.id));

          failCount++;
        }

        // Update job progress
        await this.db
          .update(bulkNotificationJobs)
          .set({
            processedCount: successCount + failCount,
            successCount: successCount,
            failedCount: failCount,
            updatedAt: new Date(),
          })
          .where(eq(bulkNotificationJobs.id, jobId));

        // Send progress update via WebSocket
        if (
          (successCount + failCount) % 100 === 0 ||
          successCount + failCount === items.length
        ) {
          this.notificationGateway.sendBulkJobProgress(
            createdBy,
            job.id.toString(),
            {
              totalItems: items.length,
              processedItems: successCount + failCount,
              successfulItems: successCount,
              failedItems: failCount,
              progress: Math.round(
                ((successCount + failCount) / items.length) * 100,
              ),
              status: 'processing',
            },
          );
        }
      }

      // Mark job as completed
      await this.db
        .update(bulkNotificationJobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bulkNotificationJobs.id, jobId));

      // Send final progress update
      this.notificationGateway.sendBulkJobProgress(
        createdBy,
        job.id.toString(),
        {
          totalItems: items.length,
          processedItems: items.length,
          successfulItems: successCount,
          failedItems: failCount,
          progress: 100,
          status: 'completed',
        },
      );
    } catch (error) {
      // Mark job as failed
      await this.db
        .update(bulkNotificationJobs)
        .set({
          status: 'failed',
          errorMessage: error.message,
          updatedAt: new Date(),
        })
        .where(eq(bulkNotificationJobs.id, jobId));
    }
  }

  async getJobStatus(jobId: string, tenantId?: number) {
    const jobIdNum = parseInt(jobId, 10);
    if (isNaN(jobIdNum)) {
      throw new BadRequestException('Invalid job ID');
    }
    const conditions = tenantId
      ? and(
          eq(bulkNotificationJobs.id, jobIdNum),
          eq(bulkNotificationJobs.tenantId, tenantId),
        )
      : eq(bulkNotificationJobs.id, jobIdNum);

    const [job] = await this.db
      .select()
      .from(bulkNotificationJobs)
      .where(conditions);

    if (!job) {
      throw new NotFoundException(`Bulk job ${jobId} not found`);
    }

    return {
      jobId: job.id,
      channel: job.configuration?.channel as string,
      totalItems: job.totalCount,
      processedItems: job.processedCount,
      successfulItems: job.successCount,
      failedItems: job.failedCount,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  async getJobItems(jobId: string, limit = 100, offset = 0) {
    const [job] = await this.db
      .select()
      .from(bulkNotificationJobs)
      .where(eq(bulkNotificationJobs.id, parseInt(jobId, 10)));

    if (!job) {
      throw new NotFoundException(`Bulk job ${jobId} not found`);
    }

    const items = await this.db
      .select()
      .from(bulkNotificationItems)
      .where(eq(bulkNotificationItems.bulkJobId, job.id))
      .limit(limit)
      .offset(offset)
      .orderBy(bulkNotificationItems.rowNumber);

    return items;
  }

  async cancelJob(jobId: string, tenantId?: number) {
    const jobIdNum = parseInt(jobId, 10);
    if (isNaN(jobIdNum)) {
      throw new BadRequestException('Invalid job ID');
    }
    const conditions = tenantId
      ? and(
          eq(bulkNotificationJobs.id, jobIdNum),
          eq(bulkNotificationJobs.tenantId, tenantId),
        )
      : eq(bulkNotificationJobs.id, jobIdNum);

    const [job] = await this.db
      .update(bulkNotificationJobs)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(conditions)
      .returning();

    if (!job) {
      throw new NotFoundException(`Bulk job ${jobId} not found`);
    }

    return {
      jobId: job.id,
      status: 'cancelled',
      message: 'Bulk job cancelled successfully',
    };
  }

  private mapStatusId(statusId: number): string {
    const statusMap: Record<number, string> = {
      1: 'pending',
      2: 'processing',
      3: 'completed',
      5: 'failed',
      6: 'cancelled',
    };
    return statusMap[statusId] || 'unknown';
  }
}
