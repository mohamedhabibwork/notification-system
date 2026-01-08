import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, retry, timeout, catchError } from 'rxjs';
import {
  UserResponseDto,
  UserSearchDto,
  UserPreferencesDto,
} from './dto/user-response.dto';
import type { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class UserServiceClient {
  private readonly logger = new Logger(UserServiceClient.name);
  private readonly baseUrl: string;
  private readonly requestTimeout: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;
  private readonly cacheTtl: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const baseUrl = this.configService.get<string>('userService.baseUrl');
    const requestTimeout = this.configService.get<number>(
      'userService.timeout',
    );
    const retryAttempts = this.configService.get<number>(
      'userService.retryAttempts',
    );
    const retryDelay = this.configService.get<number>('userService.retryDelay');
    const cacheTtl = this.configService.get<number>('userService.cacheTtl');

    if (!baseUrl) {
      throw new Error(
        'User service base URL is required. Set userService.baseUrl in configuration.',
      );
    }

    this.baseUrl = baseUrl;
    this.requestTimeout = requestTimeout ?? 5000;
    this.retryAttempts = retryAttempts ?? 3;
    this.retryDelay = retryDelay ?? 1000;
    this.cacheTtl = cacheTtl ?? 3600;

    this.logger.log(`User Service Client initialized: ${this.baseUrl}`);
  }

  async getUserById(
    userId: string,
    useCache = true,
  ): Promise<UserResponseDto | null> {
    const cacheKey = `user:${userId}`;

    // Try cache first
    if (useCache) {
      const cached = await this.cacheManager.get<UserResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`User ${userId} retrieved from cache`);
        return cached;
      }
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<UserResponseDto>(`${this.baseUrl}/users/${userId}`)
          .pipe(
            timeout(this.requestTimeout),
            retry({
              count: this.retryAttempts,
              delay: this.retryDelay,
            }),
            catchError((error) => {
              this.logger.error(
                `Failed to fetch user ${userId}: ${error.message}`,
              );
              throw error;
            }),
          ),
      );

      const user = response.data;

      // Cache the result
      await this.cacheManager.set(cacheKey, user, this.cacheTtl * 1000);

      this.logger.debug(`User ${userId} fetched from User Service`);
      return user;
    } catch (error) {
      this.logger.error(`Error fetching user ${userId}: ${error.message}`);
      return null; // Graceful degradation
    }
  }

  async getUsersByType(userType: string): Promise<UserResponseDto[]> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<UserResponseDto[]>(`${this.baseUrl}/users/by-type/${userType}`)
          .pipe(
            timeout(this.requestTimeout),
            retry({
              count: this.retryAttempts,
              delay: this.retryDelay,
            }),
          ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error fetching users by type ${userType}: ${error.message}`,
      );
      return [];
    }
  }

  async searchUsers(searchDto: UserSearchDto): Promise<UserResponseDto[]> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .post<UserResponseDto[]>(`${this.baseUrl}/users/search`, searchDto)
          .pipe(
            timeout(this.requestTimeout),
            retry({
              count: this.retryAttempts,
              delay: this.retryDelay,
            }),
          ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`);
      return [];
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferencesDto | null> {
    const cacheKey = `user:preferences:${userId}`;

    // Try cache first
    const cached = await this.cacheManager.get<UserPreferencesDto>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<UserPreferencesDto>(
            `${this.baseUrl}/users/${userId}/preferences`,
          )
          .pipe(
            timeout(this.requestTimeout),
            retry({
              count: this.retryAttempts,
              delay: this.retryDelay,
            }),
          ),
      );

      const preferences = response.data;

      // Cache the result
      await this.cacheManager.set(cacheKey, preferences, this.cacheTtl * 1000);

      return preferences;
    } catch (error) {
      this.logger.error(
        `Error fetching user preferences for ${userId}: ${error.message}`,
      );
      return null;
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.cacheManager.del(`user:${userId}`);
    await this.cacheManager.del(`user:preferences:${userId}`);
    this.logger.debug(`Cache invalidated for user ${userId}`);
  }

  // Batch user lookup with caching
  async getUsersByIds(
    userIds: string[],
  ): Promise<Map<string, UserResponseDto>> {
    const result = new Map<string, UserResponseDto>();
    const uncachedIds: string[] = [];

    // Check cache for all users
    for (const userId of userIds) {
      const cached = await this.cacheManager.get<UserResponseDto>(
        `user:${userId}`,
      );
      if (cached) {
        result.set(userId, cached);
      } else {
        uncachedIds.push(userId);
      }
    }

    // Fetch uncached users in batch
    if (uncachedIds.length > 0) {
      try {
        const users = await this.searchUsers({ userIds: uncachedIds });
        for (const user of users) {
          result.set(user.id, user);
          // Cache each user
          await this.cacheManager.set(
            `user:${user.id}`,
            user,
            this.cacheTtl * 1000,
          );
        }
      } catch (error) {
        this.logger.error(`Error fetching batch users: ${error.message}`);
      }
    }

    return result;
  }
}
