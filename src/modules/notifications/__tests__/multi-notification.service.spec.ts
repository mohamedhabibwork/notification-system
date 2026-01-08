import { Test, TestingModule } from '@nestjs/testing';
import { MultiNotificationService } from '../services/multi-notification.service';
import { NotificationValidatorService } from '../services/notification-validator.service';
import { UserEnrichmentService } from '../services/user-enrichment.service';
import { TimezoneService } from '../services/timezone.service';
import { ProviderFallbackService } from '../services/provider-fallback.service';
import { NotificationProcessorService } from '../services/notification-processor.service';
import { EventProducerService } from '../../events/event-producer.service';
import { DRIZZLE_ORM } from '../../../database/drizzle.module';
import { NotificationChannel } from '../dto/send-notification.dto';
import { TimezoneMode } from '../dto/send-multi.dto';

describe('MultiNotificationService', () => {
  let service: MultiNotificationService;
  let validator: jest.Mocked<NotificationValidatorService>;
  let enrichment: jest.Mocked<UserEnrichmentService>;
  let timezoneService: jest.Mocked<TimezoneService>;
  let providerFallback: jest.Mocked<ProviderFallbackService>;
  let processor: jest.Mocked<NotificationProcessorService>;
  let eventProducer: jest.Mocked<EventProducerService>;

  beforeEach(async () => {
    const mockDb = {};
    const mockValidator = {
      validateNotificationRequest: jest.fn(),
    };
    const mockEnrichment = {
      enrichMultipleRecipients: jest.fn(),
    };
    const mockTimezoneService = {
      resolveMultipleUserTimezones: jest.fn(),
      calculateScheduledTime: jest.fn(),
    };
    const mockProviderFallback = {
      validateProviderChain: jest.fn().mockReturnValue(true),
    };
    const mockProcessor = {
      processSingleNotification: jest.fn(),
    };
    const mockEventProducer = {
      publishNotificationEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiNotificationService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: NotificationValidatorService, useValue: mockValidator },
        { provide: UserEnrichmentService, useValue: mockEnrichment },
        { provide: TimezoneService, useValue: mockTimezoneService },
        { provide: ProviderFallbackService, useValue: mockProviderFallback },
        { provide: NotificationProcessorService, useValue: mockProcessor },
        { provide: EventProducerService, useValue: mockEventProducer },
      ],
    }).compile();

    service = module.get<MultiNotificationService>(MultiNotificationService);
    validator = module.get(NotificationValidatorService);
    enrichment = module.get(UserEnrichmentService);
    timezoneService = module.get(TimezoneService);
    providerFallback = module.get(ProviderFallbackService);
    processor = module.get(NotificationProcessorService);
    eventProducer = module.get(EventProducerService);
  });

  describe('sendMulti', () => {
    it('should send notifications to multiple users across multiple channels', async () => {
      const dto = {
        tenantId: 1,
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
        recipients: [
          {
            recipientUserId: 'user1',
            recipientEmail: 'user1@example.com',
            recipientPhone: '+1234567890',
          },
          {
            recipientUserId: 'user2',
            recipientEmail: 'user2@example.com',
            recipientPhone: '+0987654321',
          },
        ],
        directContent: {
          subject: 'Test',
          body: 'Test body',
        },
      };

      enrichment.enrichMultipleRecipients.mockResolvedValue(dto.recipients);
      processor.processSingleNotification.mockResolvedValue({
        id: 1,
        uuid: 'test-uuid',
        channel: 'email',
        recipientUserId: 'user1',
      } as any);

      const result = await service.sendMulti(dto, 'test-user');

      expect(result.success).toBe(true);
      expect(result.totalUsers).toBe(2);
      expect(result.totalChannels).toBe(2);
      expect(result.userResults).toHaveLength(2);
      expect(enrichment.enrichMultipleRecipients).toHaveBeenCalledWith(
        dto.recipients,
        dto.tenantId,
      );
    });

    it('should handle timezone resolution for scheduled notifications', async () => {
      const dto = {
        tenantId: 1,
        channels: [NotificationChannel.EMAIL],
        recipients: [
          {
            recipientUserId: 'user1',
            recipientEmail: 'user1@example.com',
          },
        ],
        scheduledAt: '2026-01-09T10:00:00Z',
        directContent: {
          subject: 'Test',
          body: 'Test body',
        },
        options: {
          timezoneOptions: {
            mode: TimezoneMode.USER,
          },
        },
      };

      const timezoneMap = new Map([['user1', 'America/New_York']]);

      enrichment.enrichMultipleRecipients.mockResolvedValue(dto.recipients);
      timezoneService.resolveMultipleUserTimezones.mockResolvedValue(
        timezoneMap,
      );
      timezoneService.calculateScheduledTime.mockReturnValue(
        new Date('2026-01-09T05:00:00-05:00'),
      );
      processor.processSingleNotification.mockResolvedValue({
        id: 1,
        uuid: 'test-uuid',
        channel: 'email',
        recipientUserId: 'user1',
      } as any);

      const result = await service.sendMulti(dto, 'test-user');

      expect(result.success).toBe(true);
      expect(timezoneService.resolveMultipleUserTimezones).toHaveBeenCalled();
      expect(result.userResults[0].timezone).toBe('America/New_York');
    });

    it('should validate request before processing', async () => {
      const dto = {
        tenantId: 1,
        channels: [],
        recipients: [],
        directContent: {
          body: 'Test',
        },
      };

      await expect(service.sendMulti(dto, 'test-user')).rejects.toThrow();
    });

    it('should handle provider chains', async () => {
      const dto = {
        tenantId: 1,
        channels: [NotificationChannel.EMAIL],
        recipients: [
          {
            recipientUserId: 'user1',
            recipientEmail: 'user1@example.com',
          },
        ],
        directContent: {
          subject: 'Test',
          body: 'Test body',
        },
        options: {
          providerChains: {
            email: {
              primary: 'sendgrid',
              fallbacks: ['ses', 'mailgun'],
            },
          },
        },
      };

      enrichment.enrichMultipleRecipients.mockResolvedValue(dto.recipients);
      processor.processSingleNotification.mockResolvedValue({
        id: 1,
        uuid: 'test-uuid',
        channel: 'email',
        recipientUserId: 'user1',
      } as any);

      const result = await service.sendMulti(dto, 'test-user');

      expect(result.success).toBe(true);
      expect(providerFallback.validateProviderChain).toHaveBeenCalledWith(
        dto.options.providerChains.email,
      );
    });

    it('should handle partial failures gracefully', async () => {
      const dto = {
        tenantId: 1,
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
        recipients: [
          {
            recipientUserId: 'user1',
            recipientEmail: 'user1@example.com',
          },
        ],
        directContent: {
          subject: 'Test',
          body: 'Test body',
        },
      };

      enrichment.enrichMultipleRecipients.mockResolvedValue(dto.recipients);
      processor.processSingleNotification
        .mockResolvedValueOnce({
          id: 1,
          uuid: 'test-uuid',
          channel: 'email',
          recipientUserId: 'user1',
        } as any)
        .mockRejectedValueOnce(new Error('SMS failed'));

      const result = await service.sendMulti(dto, 'test-user');

      expect(result.success).toBe(true); // At least one succeeded
      expect(result.userResults[0].successCount).toBe(1);
      expect(result.userResults[0].failureCount).toBe(1);
    });

    it('should support stopOnFirstChannelSuccess option', async () => {
      const dto = {
        tenantId: 1,
        channels: [
          NotificationChannel.EMAIL,
          NotificationChannel.SMS,
          NotificationChannel.FCM,
        ],
        recipients: [
          {
            recipientUserId: 'user1',
            recipientEmail: 'user1@example.com',
          },
        ],
        directContent: {
          subject: 'Test',
          body: 'Test body',
        },
        options: {
          stopOnFirstChannelSuccess: true,
        },
      };

      enrichment.enrichMultipleRecipients.mockResolvedValue(dto.recipients);
      processor.processSingleNotification.mockResolvedValue({
        id: 1,
        uuid: 'test-uuid',
        channel: 'email',
        recipientUserId: 'user1',
      } as any);

      const result = await service.sendMulti(dto, 'test-user');

      expect(result.success).toBe(true);
      // Should have attempted at least one channel
      expect(result.userResults[0].channels.length).toBeGreaterThan(0);
    });

    it('should process users sequentially when parallelUsers is false', async () => {
      const dto = {
        tenantId: 1,
        channels: [NotificationChannel.EMAIL],
        recipients: [
          { recipientUserId: 'user1', recipientEmail: 'user1@example.com' },
          { recipientUserId: 'user2', recipientEmail: 'user2@example.com' },
        ],
        directContent: {
          subject: 'Test',
          body: 'Test body',
        },
        options: {
          parallelUsers: false,
        },
      };

      enrichment.enrichMultipleRecipients.mockResolvedValue(dto.recipients);
      processor.processSingleNotification.mockResolvedValue({
        id: 1,
        uuid: 'test-uuid',
        channel: 'email',
        recipientUserId: 'user1',
      } as any);

      const result = await service.sendMulti(dto, 'test-user');

      expect(result.success).toBe(true);
      expect(result.userResults).toHaveLength(2);
    });

    it('should reject conflicting options', async () => {
      const dto = {
        tenantId: 1,
        channels: [NotificationChannel.EMAIL],
        recipients: [
          { recipientUserId: 'user1', recipientEmail: 'user1@example.com' },
        ],
        directContent: {
          body: 'Test',
        },
        options: {
          stopOnFirstChannelSuccess: true,
          requireAllChannelsSuccess: true,
        },
      };

      await expect(service.sendMulti(dto, 'test-user')).rejects.toThrow(
        'stopOnFirstChannelSuccess and requireAllChannelsSuccess cannot both be true',
      );
    });
  });
});
