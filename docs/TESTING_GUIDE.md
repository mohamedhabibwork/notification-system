# Testing Guide

## Overview

This document provides a comprehensive guide for testing the Multi-Tenant Notification System.

## Test Structure

```
test/
├── unit/                      # Unit tests
│   ├── services/
│   ├── controllers/
│   └── processors/
├── integration/               # Integration tests
│   ├── notifications/
│   ├── webhooks/
│   └── websocket/
├── e2e/                      # End-to-end tests
│   ├── notifications.e2e-spec.ts
│   ├── user-notifications.e2e-spec.ts
│   └── bulk-jobs.e2e-spec.ts
└── fixtures/                 # Test data fixtures
    ├── notifications.json
    └── templates.json
```

## Running Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e

# Debug tests
npm run test:debug
```

## Test Categories

### 1. Unit Tests

Test individual services, controllers, and processors in isolation with mocked dependencies.

**Example**:
```typescript
describe('NotificationsService', () => {
  it('should send a single notification', async () => {
    // Arrange
    const dto = { /* ... */ };
    
    // Act
    const result = await service.sendSingle(dto, 'user-123');
    
    // Assert
    expect(result).toHaveProperty('uuid');
    expect(mockProcessor.processSingleNotification).toHaveBeenCalled();
  });
});
```

### 2. Integration Tests

Test module interactions with real or test database connections.

**Key Areas**:
- Database operations with Drizzle ORM
- Queue processing with BullMQ
- WebSocket connections
- Kafka event publishing/consuming
- User Service client integration

### 3. E2E Tests

Test complete user flows through the API.

**Critical Flows**:
1. **Notification Lifecycle**:
   - Create notification → Queue → Process → Deliver → Update status
   
2. **Batch Chunking**:
   - Create batch → Send chunks → Track progress → Complete
   
3. **User Self-Service**:
   - Authenticate → List notifications → Mark as read → Delete
   
4. **Bulk CSV Upload**:
   - Upload CSV → Validate → Process → Track progress → Complete

5. **WebSocket Real-time**:
   - Connect → Authenticate → Receive notifications → Disconnect

## Test Data Management

### Fixtures

Create reusable test data:

```typescript
// test/fixtures/notifications.json
{
  "validEmailNotification": {
    "tenantId": 1,
    "channel": "email",
    "recipient": {
      "recipientEmail": "test@example.com"
    },
    "directContent": {
      "subject": "Test Email",
      "body": "Test body"
    }
  }
}
```

### Database Seeding for Tests

```typescript
beforeAll(async () => {
  await seedTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
});
```

## Mocking Strategies

### 1. Mock External Services

```typescript
jest.mock('@sendgrid/mail');
jest.mock('twilio');
jest.mock('firebase-admin');
```

### 2. Mock Kafka

```typescript
const mockKafkaProducer = {
  send: jest.fn().mockResolvedValue({}),
};
```

### 3. Mock User Service

```typescript
const mockUserService = {
  getUserById: jest.fn().mockResolvedValue({
    id: 'user-123',
    email: 'test@example.com',
  }),
};
```

## Testing Microservices Integration

### Kafka Event Testing

```typescript
describe('Kafka Event Consumer', () => {
  it('should consume order.created event and create notification', async () => {
    const event = {
      eventType: 'order.created',
      orderId: '12345',
      userId: 'user-123',
    };
    
    await eventConsumer.handleOrderCreated(event);
    
    expect(notificationsService.sendSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: expect.objectContaining({ recipientUserId: 'user-123' }),
      }),
      expect.any(String)
    );
  });
});
```

### Service Account Authentication Testing

```typescript
describe('Service Authentication', () => {
  it('should authenticate with service account', async () => {
    const serviceToken = await getServiceAccountToken();
    
    const response = await request(app.getHttpServer())
      .post('/api/v1/services/notifications/send')
      .set('Authorization', `Bearer ${serviceToken}`)
      .send(notificationDto)
      .expect(202);
  });
});
```

## Testing Best Practices

### 1. Test Isolation

Each test should be independent and not rely on the state from other tests.

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 2. Use Descriptive Test Names

```typescript
it('should return 400 when recipient email is missing for email channel', async () => {
  // ...
});
```

### 3. Test Error Cases

```typescript
it('should handle User Service failure gracefully', async () => {
  mockUserService.getUserById.mockRejectedValue(new Error('Service unavailable'));
  
  const result = await service.sendSingle(dto, 'user-123');
  
  // Should continue with provided data
  expect(result).toBeDefined();
});
```

### 4. Test Security

```typescript
describe('Authorization', () => {
  it('should deny access without authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/me/notifications')
      .expect(401);
  });
  
  it('should deny access to other users notifications', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/me/notifications/999')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404); // Or 403
  });
});
```

## Coverage Goals

| **Module** | **Target Coverage** |
|------------|---------------------|
| Services | 90%+ |
| Controllers | 85%+ |
| Processors | 80%+ |
| Gateways | 75%+ |
| Overall | 80%+ |

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:cov
      - run: npm run test:e2e
```

## Additional Testing Tools

### 1. Supertest (E2E HTTP Testing)
```bash
npm install --save-dev supertest
```

### 2. jest-mock-extended (Enhanced Mocking)
```bash
npm install --save-dev jest-mock-extended
```

### 3. faker (Test Data Generation)
```bash
npm install --save-dev @faker-js/faker
```

## Test Implementation Checklist

- [ ] Unit tests for all services
- [ ] Unit tests for all controllers
- [ ] Unit tests for all processors
- [ ] Integration tests for database operations
- [ ] Integration tests for queue processing
- [ ] Integration tests for WebSocket
- [ ] Integration tests for webhooks
- [ ] E2E tests for notification lifecycle
- [ ] E2E tests for batch operations
- [ ] E2E tests for user self-service
- [ ] E2E tests for bulk CSV upload
- [ ] Security tests for authentication
- [ ] Security tests for authorization
- [ ] Performance tests for bulk operations
- [ ] Load tests for WebSocket connections
- [ ] Error handling tests
- [ ] Edge case tests
- [ ] Kafka integration tests
- [ ] User Service client tests

---

**Next Steps**: Implement tests progressively, starting with critical paths (notification sending, user self-service), then expanding to edge cases and integration scenarios.

