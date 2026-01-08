/**
 * Tenant Templates Controller
 *
 * Handles tenant-scoped template management operations
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TemplatesService } from '../templates/templates.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplatePreviewDto,
} from '../templates/dto/template.dto';
import {
  BulkCreateTemplatesDto,
  BulkUpdateTemplatesDto,
  BulkTemplateOperationResultDto,
} from '../templates/dto/bulk-template.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Tenants - Templates')
@ApiBearerAuth()
@Controller({ path: 'tenants/:tenantId/templates', version: '1' })
export class TenantTemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Create a template for a specific tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async create(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() createDto: CreateTemplateDto,
    @CurrentUser() user: UserContext,
  ) {
    // Ensure the template is created for the correct tenant
    createDto.tenantId = tenantId;
    return this.templatesService.create(createDto, user.sub);
  }

  @Get()
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'List all templates for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async findAll(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.templatesService.findAll(tenantId);
  }

  @Get(':templateId')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get a specific template for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async findOne(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.templatesService.findOne(templateId, tenantId);
  }

  @Put(':templateId')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Update a template for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async update(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() updateDto: UpdateTemplateDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.update(
      templateId,
      updateDto,
      user.sub,
      tenantId,
    );
  }

  @Delete(':templateId')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Delete a template for a tenant (soft delete)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async remove(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.remove(templateId, user.sub, tenantId);
  }

  @Post(':templateId/preview')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Preview a template with sample data' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Rendered template preview' })
  async preview(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() previewDto: TemplatePreviewDto,
  ) {
    return this.templatesService.preview(templateId, previewDto, tenantId);
  }

  @Post('bulk')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Bulk create templates for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({
    status: 201,
    description: 'Bulk create result',
    type: BulkTemplateOperationResultDto,
  })
  async bulkCreate(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() bulkCreateDto: BulkCreateTemplatesDto,
    @CurrentUser() user: UserContext,
  ) {
    // Ensure all templates are created for the correct tenant
    const templatesWithTenant = bulkCreateDto.templates.map((t) => ({
      ...t,
      tenantId,
    }));

    return this.templatesService.bulkCreate(templatesWithTenant, user.sub);
  }

  @Put('bulk')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Bulk update templates for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Bulk update result',
    type: BulkTemplateOperationResultDto,
  })
  async bulkUpdate(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() bulkUpdateDto: BulkUpdateTemplatesDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.bulkUpdate(
      bulkUpdateDto.updates,
      user.sub,
      tenantId,
    );
  }

  // Additional tenant-specific template operations

  @Get(':templateId/versions')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get template version history' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Version history' })
  async getVersionHistory(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.templatesService.getVersionHistory(templateId, tenantId);
  }

  @Post(':templateId/versions/create')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Create new version snapshot' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 201, description: 'Version created' })
  async createVersion(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body()
    body: {
      changeDescription: string;
      changeType: 'major' | 'minor' | 'patch';
    },
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.createVersion(
      templateId,
      tenantId,
      body.changeDescription,
      body.changeType,
      user.sub,
    );
  }

  @Post(':templateId/clone')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Clone existing template within tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID to clone' })
  @ApiResponse({ status: 201, description: 'Template cloned successfully' })
  async cloneTemplate(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body()
    body: {
      name: string;
      templateCode: string;
    },
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.cloneTemplate(
      templateId,
      tenantId,
      body.name,
      body.templateCode,
      user.sub,
    );
  }

  @Get(':templateId/localizations')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get all localizations for template' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'List of localizations' })
  async getAllLocalizations(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.templatesService.getAllLocalizations(templateId, tenantId);
  }

  @Post(':templateId/localizations')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Add new language localization' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 201, description: 'Localization created' })
  async addLocalization(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body()
    body: {
      language: string;
      subject?: string;
      bodyTemplate: string;
      htmlTemplate?: string;
    },
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.addLocalization(
      templateId,
      tenantId,
      body.language,
      body.subject || null,
      body.bodyTemplate,
      body.htmlTemplate || null,
      user.sub,
    );
  }
}
