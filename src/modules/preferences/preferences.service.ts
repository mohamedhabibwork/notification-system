import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { notificationPreferences } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import {
  CreatePreferenceDto,
  UpdatePreferenceDto,
  BulkUpdatePreferencesDto,
} from './dto/preference.dto';

@Injectable()
export class PreferencesService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async getUserPreferences(userId: string, tenantId: number) {
    const preferences = await this.db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.tenantId, tenantId),
        ),
      );

    return preferences;
  }

  async getChannelPreference(
    userId: string,
    tenantId: number,
    channel: string,
  ) {
    const [preference] = await this.db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.tenantId, tenantId),
          eq(notificationPreferences.channel, channel),
        ),
      );

    return preference;
  }

  async createOrUpdate(
    createDto: CreatePreferenceDto,
    tenantId: number,
    createdBy: string,
  ) {
    // Check if preference exists
    const existing = await this.getChannelPreference(
      createDto.userId,
      tenantId,
      createDto.channel,
    );

    if (existing) {
      // Update existing
      const [updated] = await this.db
        .update(notificationPreferences)
        .set({
          isEnabled: createDto.isEnabled ?? existing.isEnabled,
          settings: createDto.settings ?? existing.settings,
          updatedBy: createdBy,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.id, existing.id))
        .returning();

      return updated;
    }

    // Create new
    const [created] = await this.db
      .insert(notificationPreferences)
      .values({
        tenantId,
        userId: createDto.userId,
        channel: createDto.channel,
        isEnabled: createDto.isEnabled ?? true,
        settings: createDto.settings,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    return created;
  }

  async updateChannelPreference(
    userId: string,
    tenantId: number,
    channel: string,
    updateDto: UpdatePreferenceDto,
    updatedBy: string,
  ) {
    const existing = await this.getChannelPreference(userId, tenantId, channel);

    if (!existing) {
      // Create if doesn't exist
      return this.createOrUpdate(
        {
          userId,
          channel: channel as any,
          ...updateDto,
        },
        tenantId,
        updatedBy,
      );
    }

    const [updated] = await this.db
      .update(notificationPreferences)
      .set({
        ...updateDto,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.id, existing.id))
      .returning();

    return updated;
  }

  async bulkUpdatePreferences(
    userId: string,
    tenantId: number,
    updateDto: BulkUpdatePreferencesDto,
    updatedBy: string,
  ) {
    const results = [];

    // Update each channel preference
    for (const [channel, isEnabled] of Object.entries(updateDto.channels)) {
      const result = await this.updateChannelPreference(
        userId,
        tenantId,
        channel,
        { isEnabled },
        updatedBy,
      );
      results.push(result);
    }

    // Update global settings like quiet hours
    if (updateDto.quietHours || updateDto.doNotDisturb !== undefined) {
      const globalSettings = {
        quietHours: updateDto.quietHours,
        doNotDisturb: updateDto.doNotDisturb,
      };

      // Store global settings in a special "global" channel preference
      const globalPref = await this.updateChannelPreference(
        userId,
        tenantId,
        'global',
        { settings: globalSettings },
        updatedBy,
      );
      results.push(globalPref);
    }

    return results;
  }

  async isChannelEnabledForUser(
    userId: string,
    tenantId: number,
    channel: string,
  ): Promise<boolean> {
    const preference = await this.getChannelPreference(
      userId,
      tenantId,
      channel,
    );

    // If no preference exists, default to enabled
    if (!preference) {
      return true;
    }

    return preference.isEnabled;
  }
}
