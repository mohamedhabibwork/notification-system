import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LookupsService } from './lookups.service';
import { CreateLookupDto, UpdateLookupDto } from './dto/lookup.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Lookups')
@ApiBearerAuth()
@Controller({ path: 'lookups', version: '1' })
export class LookupsController {
  constructor(private readonly lookupsService: LookupsService) {}

  @Get(':typeName')
  @Public()
  @ApiOperation({ summary: 'Get lookups by type name' })
  findByType(@Param('typeName') typeName: string) {
    return this.lookupsService.findByType(typeName);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new lookup' })
  create(@Body() createDto: CreateLookupDto, @CurrentUser() user: UserContext) {
    return this.lookupsService.create(createDto, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update lookup' })
  update(
    @Param('id') id: number,
    @Body() updateDto: UpdateLookupDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.lookupsService.update(id, updateDto, user.sub);
  }
}
