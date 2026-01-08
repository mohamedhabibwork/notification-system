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
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { LookupsService } from './lookups.service';
import {
  CreateLookupTypeDto,
  UpdateLookupTypeDto,
} from './dto/lookup-type.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTenantHeader } from '../../common/decorators/api-tenant-header.decorator';

@ApiTenantHeader()
@ApiTags('Lookup Types')
@ApiBearerAuth()
@Controller({ path: 'lookup-types', version: '1' })
export class LookupTypesController {
  constructor(private readonly lookupsService: LookupsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List all lookup types',
    description: 'Retrieve all lookup types in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all lookup types',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          uuid: {
            type: 'string',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          typeName: { type: 'string', example: 'notification_status' },
          description: {
            type: 'string',
            example: 'Status values for notifications',
          },
          isSystem: { type: 'boolean', example: true },
          createdAt: { type: 'string', example: '2026-01-08T00:00:00Z' },
          createdBy: { type: 'string', example: 'system' },
        },
      },
    },
  })
  findAll() {
    return this.lookupsService.findAllTypes();
  }

  @Get('all/with-values')
  @Public()
  @ApiOperation({
    summary: 'Get all lookup types with their values',
    description:
      'Retrieve all lookup types along with their associated lookup values in one call',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all lookup types with values',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          uuid: {
            type: 'string',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          typeName: { type: 'string', example: 'notification_status' },
          description: {
            type: 'string',
            example: 'Status values for notifications',
          },
          isSystem: { type: 'boolean', example: true },
          createdAt: { type: 'string', example: '2026-01-08T00:00:00Z' },
          createdBy: { type: 'string', example: 'system' },
          values: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                code: { type: 'string', example: 'pending' },
                displayName: { type: 'string', example: 'Pending' },
                sortOrder: { type: 'number', example: 1 },
              },
            },
          },
        },
      },
    },
  })
  getAllWithValues() {
    return this.lookupsService.getAllTypesWithValues();
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get lookup type by ID',
    description: 'Retrieve a single lookup type by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Lookup type ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lookup type details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        uuid: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        typeName: { type: 'string', example: 'notification_status' },
        description: {
          type: 'string',
          example: 'Status values for notifications',
        },
        isSystem: { type: 'boolean', example: true },
        createdAt: { type: 'string', example: '2026-01-08T00:00:00Z' },
        createdBy: { type: 'string', example: 'system' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Lookup type not found',
  })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.findTypeById(id);
  }

  @Get(':typeName/with-values')
  @Public()
  @ApiOperation({
    summary: 'Get lookup type with values by type name',
    description:
      'Retrieve a lookup type along with all its associated lookup values',
  })
  @ApiParam({
    name: 'typeName',
    description: 'Lookup type name',
    type: 'string',
    example: 'notification_status',
  })
  @ApiResponse({
    status: 200,
    description: 'Lookup type with values',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        uuid: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        typeName: { type: 'string', example: 'notification_status' },
        description: {
          type: 'string',
          example: 'Status values for notifications',
        },
        isSystem: { type: 'boolean', example: true },
        createdAt: { type: 'string', example: '2026-01-08T00:00:00Z' },
        createdBy: { type: 'string', example: 'system' },
        values: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              code: { type: 'string', example: 'pending' },
              displayName: { type: 'string', example: 'Pending' },
              description: {
                type: 'string',
                example: 'Notification is pending',
              },
              sortOrder: { type: 'number', example: 1 },
              isActive: { type: 'boolean', example: true },
              metadata: { type: 'object', example: { color: 'yellow' } },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Lookup type not found',
  })
  findWithValues(@Param('typeName') typeName: string) {
    return this.lookupsService.findTypeWithValues(typeName);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new lookup type',
    description:
      'Create a new lookup type (admin only). System lookup types can only be created by administrators.',
  })
  @ApiResponse({
    status: 201,
    description: 'Lookup type created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 10 },
        uuid: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        typeName: { type: 'string', example: 'order_status' },
        description: { type: 'string', example: 'Status values for orders' },
        isSystem: { type: 'boolean', example: false },
        createdAt: { type: 'string', example: '2026-01-08T00:00:00Z' },
        createdBy: { type: 'string', example: 'user-123' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - lookup type already exists',
  })
  create(
    @Body() createDto: CreateLookupTypeDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.lookupsService.createType(createDto, user.sub);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a lookup type',
    description: 'Update an existing lookup type (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lookup type ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lookup type updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        uuid: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        typeName: { type: 'string', example: 'order_status' },
        description: { type: 'string', example: 'Updated description' },
        isSystem: { type: 'boolean', example: false },
        createdAt: { type: 'string', example: '2026-01-08T00:00:00Z' },
        createdBy: { type: 'string', example: 'system' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Lookup type not found',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLookupTypeDto,
  ) {
    return this.lookupsService.updateType(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a lookup type',
    description:
      'Delete a lookup type (admin only). Can only delete if no lookup values reference this type.',
  })
  @ApiParam({
    name: 'id',
    description: 'Lookup type ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lookup type deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Lookup type deleted successfully',
        },
        type: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            typeName: { type: 'string', example: 'order_status' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - cannot delete type with associated lookup values',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Lookup type not found',
  })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deleteType(id);
  }
}
