import { Test, TestingModule } from '@nestjs/testing';
import { ProviderFallbackService } from '../services/provider-fallback.service';
import { ProviderRegistry } from '../../../common/providers/registry/provider.registry';

describe('ProviderFallbackService', () => {
  let service: ProviderFallbackService;
  let providerRegistry: jest.Mocked<ProviderRegistry>;

  beforeEach(async () => {
    const mockProviderRegistry = {
      getProvider: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderFallbackService,
        {
          provide: ProviderRegistry,
          useValue: mockProviderRegistry,
        },
      ],
    }).compile();

    service = module.get<ProviderFallbackService>(ProviderFallbackService);
    providerRegistry = module.get(ProviderRegistry);
  });

  describe('executeWithFallback', () => {
    it('should succeed with primary provider', async () => {
      const mockProvider = {
        validate: jest.fn().mockResolvedValue(true),
        send: jest
          .fn()
          .mockResolvedValue({ messageId: 'msg-123', id: 'msg-123' }),
      };

      providerRegistry.getProvider.mockResolvedValue(mockProvider as any);

      const result = await service.executeWithFallback(
        'email',
        { primary: 'sendgrid', fallbacks: ['ses'] },
        {
          recipientEmail: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        {} as any,
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('sendgrid');
      expect(result.messageId).toBe('msg-123');
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].success).toBe(true);
    });

    it('should fallback to secondary provider if primary fails', async () => {
      const mockProvider1 = {
        validate: jest.fn().mockResolvedValue(true),
        send: jest.fn().mockRejectedValue(new Error('Primary failed')),
      };

      const mockProvider2 = {
        validate: jest.fn().mockResolvedValue(true),
        send: jest
          .fn()
          .mockResolvedValue({ messageId: 'msg-456', id: 'msg-456' }),
      };

      providerRegistry.getProvider
        .mockResolvedValueOnce(mockProvider1 as any)
        .mockResolvedValueOnce(mockProvider2 as any);

      const result = await service.executeWithFallback(
        'email',
        { primary: 'sendgrid', fallbacks: ['ses'] },
        {
          recipientEmail: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        {} as any,
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ses');
      expect(result.messageId).toBe('msg-456');
      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0].success).toBe(false);
      expect(result.attempts[1].success).toBe(true);
    });

    it('should fail if all providers fail', async () => {
      const mockProvider = {
        validate: jest.fn().mockResolvedValue(true),
        send: jest.fn().mockRejectedValue(new Error('Provider failed')),
      };

      providerRegistry.getProvider.mockResolvedValue(mockProvider as any);

      const result = await service.executeWithFallback(
        'email',
        { primary: 'sendgrid', fallbacks: ['ses', 'mailgun'] },
        {
          recipientEmail: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        {} as any,
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ALL_PROVIDERS_FAILED');
      expect(result.attempts).toHaveLength(3);
      expect(result.attempts.every((a) => !a.success)).toBe(true);
    });
  });

  describe('validateProviderChain', () => {
    it('should validate valid provider chain', () => {
      const result = service.validateProviderChain({
        primary: 'sendgrid',
        fallbacks: ['ses', 'mailgun'],
      });

      expect(result).toBe(true);
    });

    it('should reject chain without primary', () => {
      const result = service.validateProviderChain({
        primary: '',
        fallbacks: ['ses'],
      });

      expect(result).toBe(false);
    });

    it('should reject chain with duplicate providers', () => {
      const result = service.validateProviderChain({
        primary: 'sendgrid',
        fallbacks: ['ses', 'sendgrid'],
      });

      expect(result).toBe(false);
    });
  });

  describe('getDefaultProvider', () => {
    it('should return default provider for email', () => {
      expect(service.getDefaultProvider('email')).toBe('sendgrid');
    });

    it('should return default provider for sms', () => {
      expect(service.getDefaultProvider('sms')).toBe('twilio');
    });

    it('should return default provider for fcm', () => {
      expect(service.getDefaultProvider('fcm')).toBe('huawei-pushkit');
    });

    it('should return webhook for unknown channel', () => {
      expect(service.getDefaultProvider('unknown')).toBe('webhook');
    });
  });

  describe('getAvailableProvidersForChannel', () => {
    it('should return available email providers', () => {
      const providers = service.getAvailableProvidersForChannel('email');

      expect(providers).toContain('sendgrid');
      expect(providers).toContain('ses');
      expect(providers).toContain('mailgun');
    });

    it('should return available sms providers', () => {
      const providers = service.getAvailableProvidersForChannel('sms');

      expect(providers).toContain('twilio');
      expect(providers).toContain('vonage');
    });

    it('should return empty array for unknown channel', () => {
      const providers = service.getAvailableProvidersForChannel('unknown');

      expect(providers).toEqual([]);
    });
  });
});
