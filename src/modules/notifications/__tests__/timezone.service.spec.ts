import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TimezoneService } from '../services/timezone.service';
import { UserServiceClient } from '../../user-service/user-service.client';
import { TimezoneMode } from '../dto/send-multi.dto';

describe('TimezoneService', () => {
  let service: TimezoneService;
  let userServiceClient: jest.Mocked<UserServiceClient>;

  beforeEach(async () => {
    const mockUserServiceClient = {
      getUserById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimezoneService,
        {
          provide: UserServiceClient,
          useValue: mockUserServiceClient,
        },
      ],
    }).compile();

    service = module.get<TimezoneService>(TimezoneService);
    userServiceClient = module.get(UserServiceClient);
  });

  describe('validateTimezone', () => {
    it('should validate correct IANA timezone', () => {
      expect(service.validateTimezone('America/New_York')).toBe(true);
      expect(service.validateTimezone('Europe/London')).toBe(true);
      expect(service.validateTimezone('UTC')).toBe(true);
    });

    it('should reject invalid timezone', () => {
      expect(service.validateTimezone('Invalid/Timezone')).toBe(false);
      expect(service.validateTimezone('')).toBe(false);
    });
  });

  describe('calculateScheduledTime', () => {
    it('should calculate scheduled time in user timezone', () => {
      const baseTime = '2026-01-09T10:00:00Z';
      const timezone = 'America/New_York';

      const result = service.calculateScheduledTime(baseTime, timezone);

      expect(result).toBeInstanceOf(Date);
    });

    it('should throw error for invalid base time', () => {
      expect(() => {
        service.calculateScheduledTime('invalid-date', 'America/New_York');
      }).toThrow(BadRequestException);
    });

    it('should throw error for invalid timezone', () => {
      expect(() => {
        service.calculateScheduledTime(
          '2026-01-09T10:00:00Z',
          'Invalid/Timezone',
        );
      }).toThrow(BadRequestException);
    });
  });

  describe('resolveUserTimezone', () => {
    it('should use client-specified timezone in CLIENT mode', async () => {
      const result = await service.resolveUserTimezone('user123', 1, {
        mode: TimezoneMode.CLIENT,
        timezone: 'Europe/London',
      });

      expect(result).toBe('Europe/London');
      expect(userServiceClient.getUserById).not.toHaveBeenCalled();
    });

    it('should throw error in CLIENT mode without timezone', async () => {
      await expect(
        service.resolveUserTimezone('user123', 1, {
          mode: TimezoneMode.CLIENT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fetch user timezone in USER mode', async () => {
      userServiceClient.getUserById.mockResolvedValue({
        id: 'user123',
        timezone: 'Asia/Tokyo',
      });

      const result = await service.resolveUserTimezone('user123', 1, {
        mode: TimezoneMode.USER,
      });

      expect(result).toBe('Asia/Tokyo');
      expect(userServiceClient.getUserById).toHaveBeenCalledWith(
        'user123',
        true,
      );
    });

    it('should fallback to UTC if user timezone not found', async () => {
      userServiceClient.getUserById.mockResolvedValue({
        id: 'user123',
      });

      const result = await service.resolveUserTimezone('user123', 1, {
        mode: TimezoneMode.USER,
      });

      expect(result).toBe('UTC');
    });

    it('should use client timezone first in MIXED mode', async () => {
      const result = await service.resolveUserTimezone('user123', 1, {
        mode: TimezoneMode.MIXED,
        timezone: 'Europe/Paris',
      });

      expect(result).toBe('Europe/Paris');
      expect(userServiceClient.getUserById).not.toHaveBeenCalled();
    });

    it('should fallback to user timezone in MIXED mode if client timezone invalid', async () => {
      userServiceClient.getUserById.mockResolvedValue({
        id: 'user123',
        timezone: 'Asia/Tokyo',
      });

      const result = await service.resolveUserTimezone('user123', 1, {
        mode: TimezoneMode.MIXED,
        timezone: 'Invalid/Timezone',
      });

      expect(result).toBe('Asia/Tokyo');
    });
  });

  describe('resolveMultipleUserTimezones', () => {
    it('should resolve timezones for multiple users', async () => {
      userServiceClient.getUserById
        .mockResolvedValueOnce({ id: 'user1', timezone: 'America/New_York' })
        .mockResolvedValueOnce({ id: 'user2', timezone: 'Europe/London' });

      const result = await service.resolveMultipleUserTimezones(
        ['user1', 'user2'],
        1,
        { mode: TimezoneMode.USER },
      );

      expect(result.get('user1')).toBe('America/New_York');
      expect(result.get('user2')).toBe('Europe/London');
    });

    it('should use same timezone for all users in CLIENT mode', async () => {
      const result = await service.resolveMultipleUserTimezones(
        ['user1', 'user2', 'user3'],
        1,
        { mode: TimezoneMode.CLIENT, timezone: 'UTC' },
      );

      expect(result.get('user1')).toBe('UTC');
      expect(result.get('user2')).toBe('UTC');
      expect(result.get('user3')).toBe('UTC');
      expect(userServiceClient.getUserById).not.toHaveBeenCalled();
    });
  });

  describe('formatInTimezone', () => {
    it('should format date in specified timezone', () => {
      const date = new Date('2026-01-09T10:00:00Z');
      const result = service.formatInTimezone(
        date,
        'America/New_York',
        'yyyy-MM-dd HH:mm:ss',
      );

      expect(result).toContain('2026-01-09');
    });

    it('should throw error for invalid timezone', () => {
      const date = new Date();
      expect(() => {
        service.formatInTimezone(date, 'Invalid/Timezone');
      }).toThrow(BadRequestException);
    });
  });

  describe('getCommonTimezones', () => {
    it('should return list of common timezones', () => {
      const timezones = service.getCommonTimezones();

      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
      expect(timezones).toContain('UTC');
      expect(timezones).toContain('America/New_York');
      expect(timezones).toContain('Europe/London');
    });
  });
});
