import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Notifications API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // In real tests, you would authenticate with Keycloak
    // and get a real JWT token here
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/services/notifications (POST)', () => {
    it('should send a single notification', () => {
      return request(app.getHttpServer())
        .post('/api/v1/services/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tenantId: 1,
          channel: 'email',
          recipient: {
            recipientEmail: 'test@example.com',
          },
          directContent: {
            subject: 'Test Email',
            body: 'This is a test notification',
          },
          priority: 'medium',
        })
        .expect(202);
    });

    it('should create a batch of notifications', () => {
      return request(app.getHttpServer())
        .post('/api/v1/services/notifications/send-batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notifications: [
            {
              tenantId: 1,
              channel: 'email',
              recipient: { recipientEmail: 'user1@example.com' },
              directContent: { subject: 'Test', body: 'Test 1' },
            },
            {
              tenantId: 1,
              channel: 'email',
              recipient: { recipientEmail: 'user2@example.com' },
              directContent: { subject: 'Test', body: 'Test 2' },
            },
          ],
        })
        .expect(202)
        .expect((res) => {
          expect(res.body).toHaveProperty('batchId');
          expect(res.body).toHaveProperty('batchToken');
        });
    });
  });

  describe('/api/v1/users/me/notifications (GET)', () => {
    it('should get user notifications', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should get unread count', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('unreadCount');
        });
    });
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
        });
    });
  });
});
