/**
 * Tenant Providers Controller
 * 
 * Handles tenant-scoped provider management operations
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
import { ProvidersService } from '../providers/providers.service';
import { CreateProviderDto, UpdateProviderDto } from '../providers/dto/provider.dto';
import {
  BulkCreateProvidersDto,
  BulkUpdateProvidersDto,
  BulkDeleteProvidersDto,
  ValidateProviderResponseDto,
  ProviderHealthResponseDto,
  BulkOperationResultDto,
} from '../providers/dto/bulk-provider.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Tenants - Providers')
@ApiBearerAuth()
@Controller({ path: 'tenants/:tenantId/providers', version: '1' })
export class TenantProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Create a provider for a specific tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 201, description: 'Provider created successfully' })
  async create(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() createDto: CreateProviderDto,
    @CurrentUser() user: UserContext,
  ) {
    // Ensure the provider is created for the correct tenant
    createDto.tenantId = tenantId;
    return this.providersService.create(createDto, user.sub);
  }

  @Get()
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'List all providers for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiQuery({ name: 'channel', required: false, description: 'Filter by channel type' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'List of providers' })
  async findAll(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Query('channel') channel?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.providersService.findByTenant(tenantId, { channel, isActive });
  }

  @Get(':providerId')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get a specific provider for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Provider details' })
  async findOne(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('providerId', ParseIntPipe) providerId: number,
  ) {
    return this.providersService.findOne(providerId, tenantId);
  }

  @Put(':providerId')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Update a provider for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Provider updated successfully' })
  async update(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('providerId', ParseIntPipe) providerId: number,
    @Body() updateDto: UpdateProviderDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.providersService.update(providerId, updateDto, user.sub, tenantId);
  }

  @Delete(':providerId')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Delete a provider for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Provider deleted successfully' })
  async remove(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('providerId', ParseIntPipe) providerId: number,
  ) {
    return this.providersService.remove(providerId, tenantId);
  }

  @Post(':providerId/validate')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Validate provider credentials' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Validation result',
    type: ValidateProviderResponseDto,
  })
  async validateCredentials(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('providerId', ParseIntPipe) providerId: number,
  ) {
    const result = await this.providersService.validateCredentials(
      providerId,
      tenantId,
    );
    return {
      ...result,
      timestamp: new Date(),
    };
  }

  @Get(':providerId/health')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Check provider health status' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Health status',
    type: ProviderHealthResponseDto,
  })
  async checkHealth(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('providerId', ParseIntPipe) providerId: number,
  ) {
    const provider = await this.providersService.findOne(providerId, tenantId);
    const healthResult = await this.providersService.checkHealth(
      providerId,
      tenantId,
    );

    return {
      providerId,
      providerName: provider.providerName,
      channel: provider.channel,
      isHealthy: healthResult.isHealthy,
      responseTime: healthResult.responseTime,
      message: healthResult.message,
      lastChecked: new Date(),
      error: healthResult.error,
    };
  }

  @Post('bulk')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Bulk create providers for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ 
    status: 201, 
    description: 'Bulk create result',
    type: BulkOperationResultDto,
  })
  async bulkCreate(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() bulkCreateDto: BulkCreateProvidersDto,
    @CurrentUser() user: UserContext,
  ) {
    // Ensure all providers are created for the correct tenant
    const providersWithTenant = bulkCreateDto.providers.map((p) => ({
      ...p,
      tenantId,
    }));

    return this.providersService.bulkCreate(providersWithTenant, user.sub);
  }

  @Put('bulk')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Bulk update providers for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Bulk update result',
    type: BulkOperationResultDto,
  })
  async bulkUpdate(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() bulkUpdateDto: BulkUpdateProvidersDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.providersService.bulkUpdate(
      bulkUpdateDto.updates,
      user.sub,
      tenantId,
    );
  }

  @Delete('bulk')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Bulk delete providers for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Bulk delete result',
    type: BulkOperationResultDto,
  })
  async bulkDelete(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() bulkDeleteDto: BulkDeleteProvidersDto,
  ) {
    return this.providersService.bulkDelete(bulkDeleteDto.ids, tenantId);
  }
}
