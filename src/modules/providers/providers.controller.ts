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
import { ProvidersService } from './providers.service';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTenantHeader } from '../../common/decorators/api-tenant-header.decorator';

@ApiTenantHeader()
@ApiTags('Admin - Providers')
@ApiBearerAuth()
@Controller({ path: 'admin/providers', version: '1' })
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Create a new provider' })
  @ApiResponse({ status: 201, description: 'Provider created successfully' })
  create(
    @Body() createDto: CreateProviderDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.providersService.create(createDto, user.sub);
  }

  @Get()
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'List all providers' })
  findAll(
    @CurrentTenant() tenantId?: number,
    @Query('channel') channel?: string,
  ) {
    return this.providersService.findAll(tenantId, channel);
  }

  @Get(':id')
  @Roles('notification-admin', 'notification-manager', 'notification-viewer')
  @ApiOperation({ summary: 'Get provider by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenantId?: number,
  ) {
    return this.providersService.findOne(id, tenantId);
  }

  @Put(':id')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Update provider' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProviderDto,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId?: number,
  ) {
    return this.providersService.update(id, updateDto, user.sub, tenantId);
  }

  @Delete(':id')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Delete provider' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenantId?: number,
  ) {
    return this.providersService.remove(id, tenantId);
  }
}
