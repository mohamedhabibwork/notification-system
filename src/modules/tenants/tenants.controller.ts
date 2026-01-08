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
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin - Tenants')
@ApiBearerAuth()
@Controller({ path: 'admin/tenants', version: '1' })
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  create(@Body() createDto: CreateTenantDto, @CurrentUser() user: UserContext) {
    return this.tenantsService.create(createDto, user.sub);
  }

  @Get()
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'List all tenants' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles('notification-admin', 'notification-manager')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.findOne(id);
  }

  @Put(':id')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Update tenant' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTenantDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.tenantsService.update(id, updateDto, user.sub);
  }

  @Delete(':id')
  @Roles('notification-admin')
  @ApiOperation({ summary: 'Delete tenant (soft delete)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserContext,
  ) {
    return this.tenantsService.remove(id, user.sub);
  }
}
