import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { DRIZZLE_ORM } from '../../../database/drizzle.module';
import { NotificationValidatorService } from '../services/notification-validator.service';
import { UserEnrichmentService } from '../services/user-enrichment.service';
import { NotificationProcessorService } from '../services/notification-processor.service';
import { EventProducerService } from '../../events/event-producer.service';
import { BroadcastNotificationDto } from '../dto/broadcast-notification.dto';

describe('NotificationsService - Broadcast', () => {
  let service: NotificationsService;
  let validator: jest.Mocked<NotificationValidatorService>;
  let enrichment: jest.Mocked<UserEnrichmentService>;
  let processor: jest.Mocked<NotificationProcessorService>;
  let eventProducer: jest.Mocked<EventProducerService>;

  beforeEach(async () => {
    const mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: DRIZZLE_ORM,
          useValue: mockDb,
        },
        {
          provide: NotificationValidatorService,
          useValue: {
            validateNotificationRequest: jest.fn(),
          },
        },
        {
          provide: UserEnrichmentService,
          useValue: {
            enrichRecipient: jest.fn().mockResolvedValue({
              recipientUserId: 'user123',
              recipientEmail: 'user@example.com',
              recipientPhone: '+1234567890',
            }),
          },
        },
        {
          provide: NotificationProcessorService,
          useValue: {
            processSingleNotification: jest.fn().mockResolvedValue({
              id: 1,
              uuid: '123e4567-e89b-12d3-a456-426614174000',
              channel: 'email',
              recipientUserId: 'user123',
            }),
          },
        },
        {
          provide: EventProducerService,
          useValue: {
            publishNotificationEvent: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    validator = module.get(NotificationValidatorService);
    enrichment = module.get(UserEnrichmentService);
    processor = module.get(NotificationProcessorService);
    eventProducer = module.get(EventProducerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendBroadcast', () => {
    const baseBroadcastDto: BroadcastNotificationDto = {
      tenantId: 1,
      channels: ['email', 'sms', 'database'],
      recipient: {
        recipientUserId: 'user123',
        recipientEmail: 'user@example.com',
        recipientPhone: '+1234567890',
      },
      directContent: {
        subject: 'Test Broadcast',
        body: 'This is a broadcast test',
      },
    };

    it('should send broadcast to all channels successfully', async () => {
      const result = await service.sendBroadcast(baseBroadcastDto, 'system');

      expect(result.success).toBe(true);
      expect(result.totalChannels).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(enrichment.enrichRecipient).toHaveBeenCalledTimes(1);
      expect(processor.processSingleNotification).toHaveBeenCalledTimes(3);
      expect(eventProducer.publishNotificationEvent).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      processor.processSingleNotification
        .mockResolvedValueOnce({
          id: 1,
          uuid: '123',
          channel: 'email',
          recipientUserId: 'user123',
        })
        .mockRejectedValueOnce(new Error('SMS provider failed'))
        .mockResolvedValueOnce({
          id: 3,
          uuid: '456',
          channel: 'database',
          recipientUserId: 'user123',
        });

      const result = await service.sendBroadcast(baseBroadcastDto, 'system');

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results).toHaveLength(3);

      const failedChannel = result.results.find((r) => !r.success);
      expect(failedChannel).toBeDefined();
      expect(failedChannel?.channel).toBe('sms');
      expect(failedChannel?.error).toBeDefined();
    });

    it('should fail when requireAllSuccess is true and any channel fails', async () => {
      processor.processSingleNotification
        .mockResolvedValueOnce({
          id: 1,
          uuid: '123',
          channel: 'email',
          recipientUserId: 'user123',
        })
        .mockRejectedValueOnce(new Error('SMS provider failed'));

      const dtoWithRequireAll: BroadcastNotificationDto = {
        ...baseBroadcastDto,
        options: {
          requireAllSuccess: true,
        },
      };

      await expect(
        service.sendBroadcast(dtoWithRequireAll, 'system'),
      ).rejects.toThrow('Broadcast failed');
    });

    it('should throw error when no channels are specified', async () => {
      const invalidDto: BroadcastNotificationDto = {
        ...baseBroadcastDto,
        channels: [],
      };

      await expect(service.sendBroadcast(invalidDto, 'system')).rejects.toThrow(
        'At least one channel must be specified',
      );
    });

    it('should use provider overrides per channel', async () => {
      const dtoWithProviders: BroadcastNotificationDto = {
        ...baseBroadcastDto,
        options: {
          providers: {
            email: 'sendgrid',
            sms: 'twilio',
          },
        },
      };

      await service.sendBroadcast(dtoWithProviders, 'system');

      expect(processor.processSingleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            provider: 'sendgrid',
          }),
        }),
        'system',
      );
    });

    it('should enrich recipient once for all channels', async () => {
      await service.sendBroadcast(baseBroadcastDto, 'system');

      expect(enrichment.enrichRecipient).toHaveBeenCalledTimes(1);
      expect(enrichment.enrichRecipient).toHaveBeenCalledWith(
        baseBroadcastDto.recipient,
        baseBroadcastDto.tenantId,
      );
    });

    it('should include broadcast metadata in results', async () => {
      const result = await service.sendBroadcast(baseBroadcastDto, 'system');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.broadcastId).toBeDefined();
      expect(result.metadata?.tenantId).toBe(1);
      expect(result.metadata?.recipientUserId).toBe('user123');
    });

    it('should validate each channel request', async () => {
      await service.sendBroadcast(baseBroadcastDto, 'system');

      expect(validator.validateNotificationRequest).toHaveBeenCalledTimes(3);
    });

    it('should handle all channels failing', async () => {
      processor.processSingleNotification.mockRejectedValue(
        new Error('All providers failed'),
      );

      const result = await service.sendBroadcast(baseBroadcastDto, 'system');

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(3);
    });

    it('should add broadcastId to metadata for each channel', async () => {
      await service.sendBroadcast(baseBroadcastDto, 'system');

      const calls = processor.processSingleNotification.mock.calls;

      calls.forEach((call) => {
        const dto = call[0];
        expect(dto.metadata?.broadcastId).toBeDefined();
      });
    });
  });
});
