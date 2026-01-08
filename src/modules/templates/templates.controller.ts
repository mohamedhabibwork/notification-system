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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplatePreviewDto,
} from './dto/template.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin - Templates')
@ApiBearerAuth()
@Controller({ path: 'admin/templates', version: '1' })
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  create(
    @Body() createDto: CreateTemplateDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.create(createDto, user.sub);
  }

  @Get()
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'List all templates' })
  findAll(@CurrentTenant() tenantId?: number) {
    return this.templatesService.findAll(tenantId);
  }

  @Get(':id')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get template by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenantId?: number,
  ) {
    return this.templatesService.findOne(id, tenantId);
  }

  @Put(':id')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Update template' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTemplateDto,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId?: number,
  ) {
    return this.templatesService.update(id, updateDto, user.sub, tenantId);
  }

  @Delete(':id')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Delete template (soft delete)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId?: number,
  ) {
    return this.templatesService.remove(id, user.sub, tenantId);
  }

  @Post(':id/preview')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Preview template with sample data' })
  preview(
    @Param('id', ParseIntPipe) id: number,
    @Body() previewDto: TemplatePreviewDto,
    @CurrentTenant() tenantId?: number,
  ) {
    return this.templatesService.preview(id, previewDto, tenantId);
  }

  // Category Management
  @Get('categories/list')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get all template categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  getCategories(@CurrentTenant() tenantId: number) {
    return this.templatesService.getCategories(tenantId);
  }

  @Post('categories')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Create template category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  createCategory(
    @Body()
    body: {
      name: string;
      code: string;
      description?: string;
      icon?: string;
      color?: string;
    },
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.templatesService.createCategory(
      tenantId,
      body.name,
      body.code,
      user.sub,
      {
        description: body.description,
        icon: body.icon,
        color: body.color,
      },
    );
  }

  // Version Management
  @Get(':id/versions')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get template version history' })
  @ApiResponse({ status: 200, description: 'Version history' })
  getVersionHistory(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenantId: number,
  ) {
    return this.templatesService.getVersionHistory(id, tenantId);
  }

  @Post(':id/versions/create')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Create new version snapshot' })
  @ApiResponse({ status: 201, description: 'Version created' })
  createVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      changeDescription: string;
      changeType: 'major' | 'minor' | 'patch';
    },
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.templatesService.createVersion(
      id,
      tenantId,
      body.changeDescription,
      body.changeType,
      user.sub,
    );
  }

  @Post(':id/versions/:versionNumber/rollback')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Rollback to specific version' })
  @ApiResponse({ status: 200, description: 'Template rolled back' })
  rollbackToVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.templatesService.rollbackToVersion(
      id,
      versionNumber,
      tenantId,
      user.sub,
    );
  }

  // Localization Management
  @Get(':id/localizations')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get all localizations for template' })
  @ApiResponse({ status: 200, description: 'List of localizations' })
  getAllLocalizations(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenantId: number,
  ) {
    return this.templatesService.getAllLocalizations(id, tenantId);
  }

  @Get(':id/localizations/:language')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get specific language localization' })
  @ApiResponse({ status: 200, description: 'Localization found' })
  getLocalization(
    @Param('id', ParseIntPipe) id: number,
    @Param('language') language: string,
    @CurrentTenant() tenantId: number,
  ) {
    return this.templatesService.getLocalization(id, tenantId, language);
  }

  @Post(':id/localizations')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Add new language localization' })
  @ApiResponse({ status: 201, description: 'Localization created' })
  addLocalization(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      language: string;
      subject?: string;
      bodyTemplate: string;
      htmlTemplate?: string;
    },
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.templatesService.addLocalization(
      id,
      tenantId,
      body.language,
      body.subject || null,
      body.bodyTemplate,
      body.htmlTemplate || null,
      user.sub,
    );
  }

  @Put(':id/localizations/:language')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Update language localization' })
  @ApiResponse({ status: 200, description: 'Localization updated' })
  updateLocalization(
    @Param('id', ParseIntPipe) id: number,
    @Param('language') language: string,
    @Body()
    body: {
      subject?: string;
      bodyTemplate?: string;
      htmlTemplate?: string;
    },
    @CurrentTenant() tenantId: number,
  ) {
    return this.templatesService.updateLocalization(
      id,
      tenantId,
      language,
      body,
    );
  }

  // Clone Template
  @Post(':id/clone')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Clone existing template' })
  @ApiResponse({ status: 201, description: 'Template cloned successfully' })
  cloneTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name: string;
      templateCode: string;
    },
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.templatesService.cloneTemplate(
      id,
      tenantId,
      body.name,
      body.templateCode,
      user.sub,
    );
  }

  // System Templates
  @Get('system/list')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get all system templates' })
  @ApiResponse({ status: 200, description: 'List of system templates' })
  getSystemTemplates() {
    return this.templatesService.getSystemTemplates();
  }

  @Get('system/:templateCode')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get system template by code' })
  @ApiResponse({ status: 200, description: 'System template found' })
  getSystemTemplateByCode(@Param('templateCode') code: string) {
    return this.templatesService.findByCodeWithFallback(code, 0);
  }

  @Post('system/:templateCode/preview')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Preview system template with variables' })
  @ApiResponse({ status: 200, description: 'Rendered template' })
  previewSystemTemplate(
    @Param('templateCode') code: string,
    @Body() previewDto: TemplatePreviewDto,
  ) {
    return this.templatesService.renderTemplateByCode(
      code,
      previewDto.variables,
      0,
    );
  }

  @Post(':templateCode/preview/:tenantId')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Preview template with tenant fallback' })
  @ApiResponse({ status: 200, description: 'Rendered template with fallback' })
  previewTemplateWithFallback(
    @Param('templateCode') code: string,
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() previewDto: TemplatePreviewDto,
  ) {
    return this.templatesService.renderTemplateByCode(
      code,
      previewDto.variables,
      tenantId,
    );
  }
}
