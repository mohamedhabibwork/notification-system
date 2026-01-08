import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import { NotificationValidatorService } from './services/notification-validator.service';
import { UserEnrichmentService } from './services/user-enrichment.service';
import { NotificationProcessorService } from './services/notification-processor.service';
import { EventProducerService } from '../events/event-producer.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockDb: any;
  let mockValidator: any;
  let mockEnrichment: any;
  let mockProcessor: any;
  let mockEventProducer: any;

  beforeEach(async () => {
    // Create mocks
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnValue([]),
    };

    mockValidator = {
      validateNotificationRequest: jest.fn(),
    };

    mockEnrichment = {
      enrichRecipient: jest.fn().mockResolvedValue({
        recipientEmail: 'test@example.com',
      }),
    };

    mockProcessor = {
      processSingleNotification: jest.fn().mockResolvedValue({
        id: 1,
        uuid: 'test-uuid',
      }),
      createBatch: jest.fn().mockResolvedValue({
        batchId: 'batch-123',
        batchToken: 'token-456',
      }),
      updateBatchStats: jest.fn().mockResolvedValue(undefined),
    };

    mockEventProducer = {
      publishNotificationQueued: jest.fn().mockResolvedValue(undefined),
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
          useValue: mockValidator,
        },
        {
          provide: UserEnrichmentService,
          useValue: mockEnrichment,
        },
        {
          provide: NotificationProcessorService,
          useValue: mockProcessor,
        },
        {
          provide: EventProducerService,
          useValue: mockEventProducer,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendSingle', () => {
    it('should send a single notification', async () => {
      const dto = {
        tenantId: 1,
        channel: 'email' as any,
        recipient: {
          recipientEmail: 'test@example.com',
        },
        directContent: {
          subject: 'Test',
          body: 'Test body',
        },
      };

      const result = await service.sendSingle(dto, 'user-123');

      expect(result).toHaveProperty('uuid');
      expect(result).toHaveProperty('status', 'queued');
      expect(mockValidator.validateNotificationRequest).toHaveBeenCalledWith(
        dto,
      );
      expect(mockEnrichment.enrichRecipient).toHaveBeenCalled();
      expect(mockProcessor.processSingleNotification).toHaveBeenCalled();
      expect(mockEventProducer.publishNotificationQueued).toHaveBeenCalled();
    });
  });

  describe('sendBatch', () => {
    it('should create a batch and queue notifications', async () => {
      const dto = {
        notifications: [
          {
            tenantId: 1,
            channel: 'email' as any,
            recipient: { recipientEmail: 'user1@test.com' },
            directContent: { subject: 'Test', body: 'Body 1' },
          },
          {
            tenantId: 1,
            channel: 'email' as any,
            recipient: { recipientEmail: 'user2@test.com' },
            directContent: { subject: 'Test', body: 'Body 2' },
          },
        ],
      };

      const result = await service.sendBatch(dto, 'user-123');

      expect(result).toHaveProperty('batchId');
      expect(result).toHaveProperty('batchToken');
      expect(mockProcessor.createBatch).toHaveBeenCalled();
      expect(mockProcessor.processSingleNotification).toHaveBeenCalledTimes(2);
      expect(mockProcessor.updateBatchStats).toHaveBeenCalled();
    });
  });
});
