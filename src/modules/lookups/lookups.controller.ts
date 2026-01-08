import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LookupsService } from './lookups.service';
import {
  CreateLookupDto,
  UpdateLookupDto,
  BulkCreateLookupDto,
  BulkUpdateLookupDto,
  SearchLookupDto,
} from './dto/lookup.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTenantHeader } from '../../common/decorators/api-tenant-header.decorator';

@ApiTenantHeader()
@ApiTags('Lookups')
@ApiBearerAuth()
@Controller({ path: 'lookups', version: '1' })
export class LookupsController {
  constructor(private readonly lookupsService: LookupsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List all lookups with optional filters',
    description:
      'Retrieve all lookups with optional search and filter parameters. Supports pagination.',
  })
  @ApiQuery({
    name: 'lookupTypeId',
    required: false,
    type: Number,
    description: 'Filter by lookup type ID',
    example: 1,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter by code or display name',
    example: 'pending',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of lookups',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              uuid: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              lookupTypeId: { type: 'number', example: 1 },
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
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  findAll(@Query() searchDto: SearchLookupDto) {
    return this.lookupsService.findAll(searchDto);
  }

  @Get('by-id/:id')
  @Public()
  @ApiOperation({
    summary: 'Get lookup by ID',
    description: 'Retrieve a single lookup by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Lookup ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lookup details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        uuid: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        lookupTypeId: { type: 'number', example: 1 },
        code: { type: 'string', example: 'pending' },
        displayName: { type: 'string', example: 'Pending' },
        description: { type: 'string', example: 'Notification is pending' },
        sortOrder: { type: 'number', example: 1 },
        isActive: { type: 'boolean', example: true },
        metadata: { type: 'object', example: { color: 'yellow' } },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Lookup not found',
  })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.findById(id);
  }

  @Get(':typeName')
  @Public()
  @ApiOperation({
    summary: 'Get lookups by type name',
    description: 'Retrieve all active lookups for a specific type',
  })
  @ApiParam({
    name: 'typeName',
    description: 'Lookup type name',
    type: 'string',
    example: 'notification_status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of lookups for the specified type',
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
          lookupTypeId: { type: 'number', example: 1 },
          code: { type: 'string', example: 'pending' },
          displayName: { type: 'string', example: 'Pending' },
          description: { type: 'string', example: 'Notification is pending' },
          sortOrder: { type: 'number', example: 1 },
          isActive: { type: 'boolean', example: true },
          metadata: { type: 'object', example: { color: 'yellow' } },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Lookup type not found',
  })
  findByType(@Param('typeName') typeName: string) {
    return this.lookupsService.findByType(typeName);
  }

  @Get(':typeName/validate/:code')
  @Public()
  @ApiOperation({
    summary: 'Validate if a lookup code exists',
    description:
      'Check if a lookup code exists and is active for a specific type',
  })
  @ApiParam({
    name: 'typeName',
    description: 'Lookup type name',
    type: 'string',
    example: 'notification_status',
  })
  @ApiParam({
    name: 'code',
    description: 'Lookup code to validate',
    type: 'string',
    example: 'pending',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean', example: true },
        lookup: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'number', example: 1 },
            code: { type: 'string', example: 'pending' },
            displayName: { type: 'string', example: 'Pending' },
            isActive: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Lookup type not found',
  })
  validateCode(
    @Param('typeName') typeName: string,
    @Param('code') code: string,
  ) {
    return this.lookupsService.validateCode(typeName, code);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new lookup',
    description: 'Create a single lookup value (admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Lookup created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 10 },
        uuid: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        lookupTypeId: { type: 'number', example: 1 },
        code: { type: 'string', example: 'processing' },
        displayName: { type: 'string', example: 'Processing' },
        description: {
          type: 'string',
          example: 'Notification is being processed',
        },
        sortOrder: { type: 'number', example: 2 },
        isActive: { type: 'boolean', example: true },
        metadata: { type: 'object', example: { color: 'blue' } },
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
  create(@Body() createDto: CreateLookupDto, @CurrentUser() user: UserContext) {
    return this.lookupsService.create(createDto, user.sub);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk create lookups',
    description: 'Create multiple lookup values at once (admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk create results',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', example: 8 },
        failed: { type: 'number', example: 2 },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              code: { type: 'string', example: 'pending' },
              displayName: { type: 'string', example: 'Pending' },
            },
          },
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lookup: { type: 'object' },
              error: { type: 'string', example: 'Duplicate code' },
            },
          },
        },
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
  bulkCreate(
    @Body() bulkDto: BulkCreateLookupDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.lookupsService.bulkCreate(bulkDto, user.sub);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a lookup',
    description: 'Update an existing lookup value (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lookup ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lookup updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        uuid: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        lookupTypeId: { type: 'number', example: 1 },
        code: { type: 'string', example: 'pending' },
        displayName: { type: 'string', example: 'Pending Delivery' },
        description: { type: 'string', example: 'Updated description' },
        sortOrder: { type: 'number', example: 1 },
        isActive: { type: 'boolean', example: true },
        metadata: { type: 'object', example: { color: 'yellow' } },
        updatedAt: { type: 'string', example: '2026-01-08T00:00:00Z' },
        updatedBy: { type: 'string', example: 'user-123' },
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
    description: 'Lookup not found',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLookupDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.lookupsService.update(id, updateDto, user.sub);
  }

  @Put('bulk')
  @ApiOperation({
    summary: 'Bulk update lookups',
    description: 'Update multiple lookup values at once (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk update results',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', example: 7 },
        failed: { type: 'number', example: 1 },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              code: { type: 'string', example: 'pending' },
              displayName: { type: 'string', example: 'Updated Name' },
            },
          },
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 99 },
              error: { type: 'string', example: 'Lookup not found' },
            },
          },
        },
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
  bulkUpdate(
    @Body() bulkDto: BulkUpdateLookupDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.lookupsService.bulkUpdate(bulkDto, user.sub);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a lookup (soft delete)',
    description:
      'Soft delete a lookup by setting isActive to false (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lookup ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lookup deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lookup deleted successfully' },
        lookup: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            code: { type: 'string', example: 'pending' },
            displayName: { type: 'string', example: 'Pending' },
            isActive: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Lookup not found',
  })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserContext,
  ) {
    return this.lookupsService.delete(id, user.sub);
  }
}
