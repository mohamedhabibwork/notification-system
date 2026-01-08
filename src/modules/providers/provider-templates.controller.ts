/**
 * Provider Templates Controller
 * 
 * Handles provider-scoped template operations like testing and compatibility
 */

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
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TemplatesService } from '../templates/templates.service';
import {
  TestTemplateWithProviderDto,
  SendTestNotificationDto,
  TemplateTestResultDto,
  TestNotificationResultDto,
  ProviderTemplateCompatibilityDto,
} from './dto/provider-template.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTenantHeader } from '../../common/decorators/api-tenant-header.decorator';

@ApiTenantHeader()
@ApiTags('Providers - Templates')
@ApiBearerAuth()
@Controller({ path: 'providers/:providerId/templates', version: '1' })
export class ProviderTemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'List templates compatible with provider' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiQuery({ 
    name: 'tenantId', 
    required: false, 
    description: 'Tenant ID to filter templates' 
  })
  @ApiResponse({ status: 200, description: 'List of compatible templates' })
  async findCompatibleTemplates(
    @Param('providerId', ParseIntPipe) providerId: number,
    @Query('tenantId', ParseIntPipe) tenantId?: number,
  ) {
    return this.templatesService.findByProvider(providerId, tenantId);
  }

  @Get('recommended')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get recommended templates for provider type' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of recommended templates',
  })
  async getRecommendedTemplates(
    @Param('providerId', ParseIntPipe) providerId: number,
  ) {
    return this.templatesService.getRecommendedTemplates(providerId);
  }

  @Post(':templateId/test')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Test template rendering with provider' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Template rendering test result',
    type: TemplateTestResultDto,
  })
  async testTemplate(
    @Param('providerId', ParseIntPipe) providerId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() testDto: TestTemplateWithProviderDto,
    @CurrentTenant() tenantId?: number,
  ) {
    return this.templatesService.testTemplateWithProvider(
      templateId,
      providerId,
      testDto.variables,
      tenantId,
    );
  }

  @Post(':templateId/send-test')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Send test notification using provider and template' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Test notification result',
    type: TestNotificationResultDto,
  })
  async sendTestNotification(
    @Param('providerId', ParseIntPipe) providerId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() testDto: SendTestNotificationDto,
    @CurrentTenant() tenantId?: number,
  ) {
    const result = await this.templatesService.sendTestNotification(
      templateId,
      providerId,
      testDto.recipient,
      testDto.variables,
      tenantId,
    );

    // Get template and provider details for the response
    const template = await this.templatesService.findOne(templateId, tenantId);
    const testResult = await this.templatesService.testTemplateWithProvider(
      templateId,
      providerId,
      testDto.variables,
      tenantId,
    );

    return {
      success: result.success,
      messageId: result.messageId,
      timestamp: result.timestamp,
      providerName: testResult.providerInfo.name,
      templateCode: template.templateCode,
      renderedContent: {
        subject: testResult.renderedContent.subject,
        body: testResult.renderedContent.body,
      },
      error: result.error,
    };
  }

  @Get(':templateId/compatibility')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Check template compatibility with provider' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Compatibility analysis',
    type: ProviderTemplateCompatibilityDto,
  })
  async checkCompatibility(
    @Param('providerId', ParseIntPipe) providerId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @CurrentTenant() tenantId?: number,
  ) {
    const template = await this.templatesService.findOne(templateId, tenantId);
    const testResult = await this.templatesService.testTemplateWithProvider(
      templateId,
      providerId,
      {}, // Empty variables for compatibility check
      tenantId,
    );

    const notes: string[] = [];
    let compatibilityScore = 100;

    // Check channel compatibility
    if (testResult.warnings && testResult.warnings.length > 0) {
      notes.push(...testResult.warnings);
      compatibilityScore -= 50;
    }

    // Check feature compatibility
    if (template.subject && !testResult.providerInfo.supportsSubject) {
      notes.push('Provider does not support subject field');
      compatibilityScore -= 20;
    }

    if (template.htmlTemplate && !testResult.providerInfo.supportsHtml) {
      notes.push('Provider does not support HTML content');
      compatibilityScore -= 30;
    }

    const isCompatible = compatibilityScore >= 50;

    return {
      templateId: template.id,
      templateCode: template.templateCode,
      templateName: template.name,
      templateChannel: template.channel,
      isCompatible,
      compatibilityScore: Math.max(0, compatibilityScore),
      notes,
    };
  }

  @Post(':templateId/validate-variables')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Validate template variables against provider requirements' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Variable validation result',
  })
  async validateVariables(
    @Param('providerId', ParseIntPipe) providerId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() body: { variables: Record<string, unknown> },
    @CurrentTenant() tenantId?: number,
  ) {
    try {
      const testResult = await this.templatesService.testTemplateWithProvider(
        templateId,
        providerId,
        body.variables,
        tenantId,
      );

      return {
        valid: testResult.success,
        message: 'Variables are valid for this template',
        renderedPreview: {
          subject: testResult.renderedContent.subject,
          body: testResult.renderedContent.body?.substring(0, 200) + '...',
        },
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Variable validation failed',
        error: (error as Error).message,
      };
    }
  }
}
