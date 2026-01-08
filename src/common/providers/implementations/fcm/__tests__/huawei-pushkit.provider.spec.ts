import { HuaweiPushKitProvider } from '../huawei-pushkit.provider';
import { HuaweiPushKitCredentials } from '../../../interfaces/credentials.interface';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HuaweiPushKitProvider', () => {
  let provider: HuaweiPushKitProvider;
  let credentials: HuaweiPushKitCredentials;

  beforeEach(() => {
    credentials = {
      providerType: 'huawei-pushkit',
      channel: 'fcm',
      enabled: true,
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      projectId: 'test-project-id',
    };

    provider = new HuaweiPushKitProvider(credentials);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate credentials successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });

      const result = await provider.validate();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://oauth-login.cloud.huawei.com/oauth2/v3/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
    });

    it('should fail validation with invalid credentials', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Invalid credentials'));

      const result = await provider.validate();

      expect(result).toBe(false);
    });

    it('should fail validation when required credentials are missing', async () => {
      const invalidCredentials = {
        ...credentials,
        clientId: '',
      };

      const invalidProvider = new HuaweiPushKitProvider(invalidCredentials);
      const result = await invalidProvider.validate();

      expect(result).toBe(false);
    });
  });

  describe('send', () => {
    beforeEach(() => {
      // Mock OAuth token request
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });
    });

    it('should send push notification successfully', async () => {
      // Mock push notification send request
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            access_token: 'test-token',
            expires_in: 3600,
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            code: '80000000',
            msg: 'Success',
            requestId: 'req-123',
          },
        });

      const result = await provider.send({
        recipient: {
          deviceToken: 'test-device-token',
        },
        content: {
          subject: 'Test Notification',
          body: 'This is a test',
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('req-123');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle send failure', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            access_token: 'test-token',
            expires_in: 3600,
          },
        })
        .mockRejectedValueOnce({
          response: {
            data: {
              code: '80300008',
              msg: 'Invalid token',
            },
          },
        });

      const result = await provider.send({
        recipient: {
          deviceToken: 'invalid-token',
        },
        content: {
          body: 'Test',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw error when device token is missing', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-token',
          expires_in: 3600,
        },
      });

      const result = await provider.send({
        recipient: {},
        content: {
          body: 'Test',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Device token is required');
    });
  });

  describe('getRequiredCredentials', () => {
    it('should return required credential fields', () => {
      const required = provider.getRequiredCredentials();

      expect(required).toEqual([
        'appId',
        'appSecret',
        'clientId',
        'clientSecret',
      ]);
    });
  });

  describe('getChannel', () => {
    it('should return fcm channel', () => {
      expect(provider.getChannel()).toBe('fcm');
    });
  });

  describe('getProviderName', () => {
    it('should return huawei-pushkit', () => {
      expect(provider.getProviderName()).toBe('huawei-pushkit');
    });
  });

  describe('getMetadata', () => {
    it('should return provider metadata', () => {
      const metadata = provider.getMetadata();

      expect(metadata.displayName).toBe('Huawei Push Kit');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.supportedFeatures).toContain('push-notification');
      expect(metadata.rateLimit).toBeDefined();
    });
  });

  describe('formatPayload', () => {
    it('should format payload with notification', async () => {
      // Access protected method via type assertion
      const formatted = (provider as any).formatPayload({
        recipient: {
          deviceToken: 'test-token',
        },
        content: {
          subject: 'Test',
          body: 'Test body',
        },
      });

      expect(formatted.message.notification).toBeDefined();
      expect(formatted.message.notification.title).toBe('Test');
      expect(formatted.message.notification.body).toBe('Test body');
      expect(formatted.message.token).toEqual(['test-token']);
    });

    it('should format payload with custom data', async () => {
      const formatted = (provider as any).formatPayload({
        recipient: {
          deviceToken: 'test-token',
        },
        content: {
          subject: 'Test',
          body: 'Test body',
          data: {
            action: 'open',
            url: 'https://example.com',
          },
        },
      });

      expect(formatted.message.data).toBeDefined();
      expect(JSON.parse(formatted.message.data)).toEqual({
        action: 'open',
        url: 'https://example.com',
      });
    });

    it('should format payload with custom options', async () => {
      const formatted = (provider as any).formatPayload({
        recipient: {
          deviceToken: 'test-token',
        },
        content: {
          body: 'Test body',
        },
        options: {
          priority: 'normal',
          ttl: 3600,
          sound: 'custom.mp3',
          badge: 5,
        },
      });

      expect(formatted.message.android.urgency).toBe('NORMAL');
      expect(formatted.message.android.ttl).toBe('3600s');
      expect(formatted.message.android.notification.sound).toBe('custom.mp3');
      expect(formatted.message.android.notification.badge.add_num).toBe(5);
    });
  });
});
