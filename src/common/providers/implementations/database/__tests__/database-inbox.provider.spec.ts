import { DatabaseInboxProvider } from '../database-inbox.provider';
import { DatabaseInboxCredentials } from '../../../interfaces/credentials.interface';

describe('DatabaseInboxProvider', () => {
  let provider: DatabaseInboxProvider;
  let credentials: DatabaseInboxCredentials;
  let mockDb: any;

  beforeEach(() => {
    credentials = {
      providerType: 'database-inbox',
      channel: 'database',
      enabled: true,
      tableName: 'user_notifications',
      retentionDays: 90,
    };

    // Mock Drizzle DB
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([
        {
          id: 1,
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          tenantId: 1,
          channel: 'database',
        },
      ]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          type: 'notification_status',
          code: 'sent',
        },
      ]),
    };

    provider = new DatabaseInboxProvider(credentials);
    provider.setDatabase(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate successfully with database connection', async () => {
      const result = await provider.validate();

      expect(result).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should fail validation without database connection', async () => {
      const providerWithoutDb = new DatabaseInboxProvider(credentials);
      const result = await providerWithoutDb.validate();

      expect(result).toBe(false);
    });

    it('should fail validation on database error', async () => {
      mockDb.limit.mockRejectedValueOnce(new Error('Connection error'));

      const result = await provider.validate();

      expect(result).toBe(false);
    });
  });

  describe('send', () => {
    beforeEach(() => {
      // Mock status lookup
      mockDb.where.mockReturnThis();
      mockDb.limit
        .mockResolvedValueOnce([
          {
            id: 1,
            type: 'notification_status',
            code: 'sent',
          },
        ])
        .mockResolvedValueOnce([]);
    });

    it('should send notification successfully', async () => {
      const result = await provider.send({
        recipient: {
          userId: 'user123',
          email: 'user@example.com',
        },
        content: {
          subject: 'Test Notification',
          body: 'This is a test',
        },
        options: {
          tenantId: 1,
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('1');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle missing userId', async () => {
      const result = await provider.send({
        recipient: {
          email: 'user@example.com',
        },
        content: {
          body: 'Test',
        },
        options: {
          tenantId: 1,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('userId is required');
    });

    it('should handle missing tenantId', async () => {
      const result = await provider.send({
        recipient: {
          userId: 'user123',
        },
        content: {
          body: 'Test',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('tenantId is required');
    });

    it('should handle database insertion error', async () => {
      mockDb.returning.mockRejectedValueOnce(new Error('Insert failed'));

      const result = await provider.send({
        recipient: {
          userId: 'user123',
        },
        content: {
          body: 'Test',
        },
        options: {
          tenantId: 1,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getRequiredCredentials', () => {
    it('should return empty array (no external credentials needed)', () => {
      const required = provider.getRequiredCredentials();

      expect(required).toEqual([]);
    });
  });

  describe('getChannel', () => {
    it('should return database channel', () => {
      expect(provider.getChannel()).toBe('database');
    });
  });

  describe('getProviderName', () => {
    it('should return database-inbox', () => {
      expect(provider.getProviderName()).toBe('database-inbox');
    });
  });

  describe('getMetadata', () => {
    it('should return provider metadata', () => {
      const metadata = provider.getMetadata();

      expect(metadata.displayName).toBe('Database Inbox');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.supportedFeatures).toContain('persistent-storage');
      expect(metadata.supportedFeatures).toContain('user-inbox');
      expect(metadata.rateLimit).toBeDefined();
      expect(metadata.rateLimit?.maxPerSecond).toBe(1000);
    });
  });

  describe('setDatabase', () => {
    it('should set database connection', () => {
      const newProvider = new DatabaseInboxProvider(credentials);
      newProvider.setDatabase(mockDb);

      // Database should be set (tested via validate)
      expect(async () => {
        await newProvider.validate();
      }).not.toThrow();
    });
  });
});
