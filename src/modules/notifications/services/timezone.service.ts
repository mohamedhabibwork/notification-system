import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { parseISO, isValid } from 'date-fns';
import { UserServiceClient } from '../../user-service/user-service.client';
import { TimezoneOptionsDto, TimezoneMode } from '../dto/send-multi.dto';

@Injectable()
export class TimezoneService {
  private readonly logger = new Logger(TimezoneService.name);

  // Common IANA timezones for validation
  private readonly COMMON_TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Rome',
    'Europe/Moscow',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Asia/Hong_Kong',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
  ];

  constructor(private readonly userServiceClient: UserServiceClient) {}

  /**
   * Validate if a timezone string is valid IANA timezone
   */
  validateTimezone(timezone: string): boolean {
    if (!timezone) {
      return false;
    }

    try {
      // Try to format a date in the timezone - if it throws, it's invalid
      const testDate = new Date();
      formatInTimeZone(testDate, timezone, 'yyyy-MM-dd HH:mm:ss');
      return true;
    } catch (error) {
      this.logger.warn(`Invalid timezone: ${timezone}`, error);
      return false;
    }
  }

  /**
   * Calculate scheduled delivery time based on user's timezone
   * @param baseTime - The base time in ISO 8601 format or Date
   * @param userTimezone - The user's IANA timezone
   * @returns Calculated Date in user's timezone
   */
  calculateScheduledTime(baseTime: string | Date, userTimezone: string): Date {
    try {
      // Parse the base time if it's a string
      const parsedTime =
        typeof baseTime === 'string' ? parseISO(baseTime) : baseTime;

      if (!isValid(parsedTime)) {
        throw new BadRequestException(`Invalid base time format: ${baseTime}`);
      }

      // Validate timezone
      if (!this.validateTimezone(userTimezone)) {
        throw new BadRequestException(`Invalid timezone: ${userTimezone}`);
      }

      // Convert to user's timezone
      const zonedTime = toZonedTime(parsedTime, userTimezone);
      return zonedTime;
    } catch (error) {
      this.logger.error(
        `Error calculating scheduled time for timezone ${userTimezone}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Resolve the timezone for a user based on options
   * @param userId - The user ID
   * @param tenantId - The tenant ID
   * @param options - Timezone resolution options
   * @returns Resolved timezone string
   */
  async resolveUserTimezone(
    userId: string,
    tenantId: number,
    options?: TimezoneOptionsDto,
  ): Promise<string> {
    // Default mode is 'user'
    const mode = options?.mode || TimezoneMode.USER;

    try {
      switch (mode) {
        case TimezoneMode.CLIENT:
          // Use client-specified timezone
          if (!options?.timezone) {
            throw new BadRequestException(
              'Timezone must be provided when mode is "client"',
            );
          }
          if (!this.validateTimezone(options.timezone)) {
            throw new BadRequestException(
              `Invalid timezone: ${options.timezone}`,
            );
          }
          return options.timezone;

        case TimezoneMode.USER:
          // Fetch user's timezone from User Service
          return await this.fetchUserTimezone(userId, tenantId);

        case TimezoneMode.MIXED:
          // Try client-specified first, fall back to user's timezone
          if (options?.timezone && this.validateTimezone(options.timezone)) {
            return options.timezone;
          }
          return await this.fetchUserTimezone(userId, tenantId);

        default:
          this.logger.warn(`Unknown timezone mode: ${mode}, using UTC`);
          return 'UTC';
      }
    } catch (error) {
      this.logger.error(`Error resolving timezone for user ${userId}:`, error);
      // Fallback to UTC if we can't resolve
      return 'UTC';
    }
  }

  /**
   * Fetch user's timezone from User Service
   * @param userId - The user ID
   * @param tenantId - The tenant ID
   * @returns User's timezone or UTC as fallback
   */
  private async fetchUserTimezone(
    userId: string,
    tenantId: number,
  ): Promise<string> {
    try {
      const user = await this.userServiceClient.getUserById(userId, true);

      if (!user) {
        this.logger.warn(`User ${userId} not found, using UTC timezone`);
        return 'UTC';
      }

      // Check if user has timezone set
      if (user.timezone && this.validateTimezone(user.timezone)) {
        return user.timezone;
      }

      // Try to get timezone from metadata
      if (user.metadata && typeof user.metadata === 'object') {
        const metadataTimezone = (user.metadata as any).timezone;
        if (metadataTimezone && this.validateTimezone(metadataTimezone)) {
          return metadataTimezone;
        }
      }

      this.logger.warn(`No valid timezone found for user ${userId}, using UTC`);
      return 'UTC';
    } catch (error) {
      this.logger.error(`Failed to fetch timezone for user ${userId}:`, error);
      return 'UTC';
    }
  }

  /**
   * Batch resolve timezones for multiple users
   * @param userIds - Array of user IDs
   * @param tenantId - The tenant ID
   * @param options - Timezone resolution options
   * @returns Map of userId to timezone
   */
  async resolveMultipleUserTimezones(
    userIds: string[],
    tenantId: number,
    options?: TimezoneOptionsDto,
  ): Promise<Map<string, string>> {
    const timezoneMap = new Map<string, string>();

    // If client mode, all users get the same timezone
    if (options?.mode === TimezoneMode.CLIENT && options.timezone) {
      if (!this.validateTimezone(options.timezone)) {
        throw new BadRequestException(`Invalid timezone: ${options.timezone}`);
      }
      for (const userId of userIds) {
        timezoneMap.set(userId, options.timezone);
      }
      return timezoneMap;
    }

    // Resolve each user's timezone in parallel
    const timezonePromises = userIds.map(async (userId) => {
      const timezone = await this.resolveUserTimezone(
        userId,
        tenantId,
        options,
      );
      return { userId, timezone };
    });

    const results = await Promise.all(timezonePromises);

    for (const result of results) {
      timezoneMap.set(result.userId, result.timezone);
    }

    return timezoneMap;
  }

  /**
   * Format a date in a specific timezone
   * @param date - The date to format
   * @param timezone - The IANA timezone
   * @param format - The date format string (date-fns format)
   * @returns Formatted date string
   */
  formatInTimezone(
    date: Date,
    timezone: string,
    format: string = 'yyyy-MM-dd HH:mm:ss zzz',
  ): string {
    try {
      if (!this.validateTimezone(timezone)) {
        throw new BadRequestException(`Invalid timezone: ${timezone}`);
      }
      return formatInTimeZone(date, timezone, format);
    } catch (error) {
      this.logger.error(
        `Error formatting date in timezone ${timezone}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get list of common timezones
   */
  getCommonTimezones(): string[] {
    return [...this.COMMON_TIMEZONES];
  }
}
