import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiConsumes,
} from '@nestjs/swagger';
import { BulkJobsService } from './bulk-jobs.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { ApiTenantHeader } from '../../common/decorators/api-tenant-header.decorator';

@ApiTenantHeader()
@ApiTags('Services - Bulk Notifications')
@ApiSecurity('bearer')
@Controller({ path: 'services/notifications/bulk', version: '1' })
export class BulkJobsController {
  constructor(private readonly bulkJobsService: BulkJobsService) {}

  @Post('csv')
  @Scopes('notification:send')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload CSV file for bulk notifications' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Bulk job created successfully' })
  async uploadCsv(
    @UploadedFile() file: Express.Multer.File,
    @Query('channel') channel: string,
    @Query('templateId', ParseIntPipe) templateId: number,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (!channel) {
      throw new BadRequestException('Channel is required');
    }

    return this.bulkJobsService.createJob(
      file,
      tenantId,
      channel,
      templateId,
      user.sub,
    );
  }

  @Get(':jobId')
  @Scopes('notification:manage')
  @ApiOperation({ summary: 'Get bulk job status' })
  @ApiResponse({ status: 200, description: 'Returns bulk job status' })
  getJobStatus(
    @Param('jobId') jobId: string,
    @CurrentTenant() tenantId?: number,
  ) {
    return this.bulkJobsService.getJobStatus(jobId, tenantId);
  }

  @Get(':jobId/items')
  @Scopes('notification:manage')
  @ApiOperation({ summary: 'Get bulk job items' })
  @ApiResponse({ status: 200, description: 'Returns bulk job items' })
  getJobItems(
    @Param('jobId') jobId: string,
    @Query('limit', ParseIntPipe) limit = 100,
    @Query('offset', ParseIntPipe) offset = 0,
  ) {
    return this.bulkJobsService.getJobItems(jobId, limit, offset);
  }

  @Delete(':jobId')
  @Scopes('notification:manage')
  @ApiOperation({ summary: 'Cancel bulk job' })
  @ApiResponse({ status: 200, description: 'Bulk job cancelled' })
  cancelJob(@Param('jobId') jobId: string, @CurrentTenant() tenantId?: number) {
    return this.bulkJobsService.cancelJob(jobId, tenantId);
  }
}
