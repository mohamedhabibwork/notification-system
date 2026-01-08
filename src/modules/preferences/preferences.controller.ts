import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import {
  UpdatePreferenceDto,
  BulkUpdatePreferencesDto,
} from './dto/preference.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

@ApiTags('User - Preferences')
@ApiBearerAuth()
@Controller({ path: 'users/me/preferences', version: '1' })
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notification preferences' })
  @ApiResponse({ status: 200, description: 'Returns user preferences' })
  getPreferences(
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.preferencesService.getUserPreferences(user.sub, tenantId);
  }

  @Put()
  @ApiOperation({ summary: 'Update my notification preferences (bulk)' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  bulkUpdate(
    @Body() updateDto: BulkUpdatePreferencesDto,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.preferencesService.bulkUpdatePreferences(
      user.sub,
      tenantId,
      updateDto,
      user.sub,
    );
  }

  @Put('channels/:channel')
  @ApiOperation({ summary: 'Update preference for a specific channel' })
  @ApiResponse({ status: 200, description: 'Channel preference updated' })
  updateChannel(
    @Param('channel') channel: string,
    @Body() updateDto: UpdatePreferenceDto,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: number,
  ) {
    return this.preferencesService.updateChannelPreference(
      user.sub,
      tenantId,
      channel,
      updateDto,
      user.sub,
    );
  }
}
