# Notification Service - Product Requirements Document

## 1. Overview
A multi-tenant notification service that supports multiple delivery channels (SMS, Email, FCM, WhatsApp, Database) with bulk sending capabilities and flexible targeting options.

## 2. Core Requirements

### 2.1 Multi-Tenancy
- All data isolated by tenant
- Tenant-specific configurations and credentials
- Tenant-level rate limiting and quotas

### 2.2 Authentication & Authorization
- Integration with Keycloak for authentication
- Role-based access control (RBAC)
- Service-to-service authentication support
- API key management per tenant

### 2.3 Notification Channels
Support for the following delivery channels:
- **SMS**: Twilio, AWS SNS, or custom providers
- **Email**: SMTP, SendGrid, AWS SES
- **FCM**: Firebase Cloud Messaging for push notifications
- **WhatsApp**: WhatsApp Business API
- **Database**: Store notifications in database for in-app display
- **Extensible**: Plugin architecture for additional channels

### 2.4 Targeting & Recipients

#### Individual Targeting
- Send to specific userId
- Send to specific userType (e.g., admin, customer, vendor)
- Combined targeting (userId AND userType)

#### Bulk Operations
- Bulk send to multiple users
- CSV file upload for recipient lists
- Batch processing with progress tracking
- CSV format: `user_id, email, phone, user_type, custom_field1, custom_field2`

### 2.5 Template Management
- Optional template usage
- Template versioning
- Variable substitution in templates
- Template preview capability
- Multi-language template support
- **Template-less sending**: Support direct message content without templates

### 2.6 Message Composition

#### With Templates
- Reference template by ID
- Pass variables for substitution
- Override template subject/title

#### Without Templates
- Direct message content
- Subject/title specification
- HTML/plain text for email
- Rich media support (images, attachments)

## 3. Functional Requirements

### 3.1 Send Notification API
**Endpoint**: `POST /api/v1/notifications/send`

**Request Body**:
```json
{
  "tenantId": "uuid",
  "channel": "email|sms|fcm|whatsapp|database",
  "recipients": {
    "userIds": ["userId1", "userId2"],
    "userTypes": ["admin", "customer"],
    "filters": {
      "status": "active",
      "region": "US"
    }
  },
  "template": {
    "templateId": "uuid",
    "variables": {
      "userName": "John",
      "orderNumber": "12345"
    }
  },
  "directContent": {
    "subject": "Your order is ready",
    "body": "Hello, your order #12345 is ready for pickup",
    "htmlBody": "<p>Hello, your order <b>#12345</b> is ready</p>",
    "attachments": []
  },
  "priority": "high|medium|low",
  "scheduledAt": "2026-01-15T10:00:00Z",
  "metadata": {
    "campaignId": "campaign123",
    "source": "order-service"
  }
}
```

### 3.2 Bulk Send via CSV
**Endpoint**: `POST /api/v1/notifications/bulk/csv`

**Process**:
1. Upload CSV file
2. Validate CSV structure
3. Create bulk job
4. Process asynchronously
5. Return job ID for tracking

**CSV Validation**:
- Required columns: user_id or email/phone
- Optional columns: user_type, custom fields
- Max file size: 10MB
- Max records: 100,000 per file

### 3.3 Notification History & Tracking
- Delivery status tracking (sent, delivered, failed, bounced)
- Read receipts (where supported)
- Click tracking (for emails)
- Retry mechanism for failed deliveries
- Delivery timeline

### 3.4 Lookup Management
**Lookup Types**:
- notification_status: pending, sent, delivered, failed, bounced
- notification_priority: high, medium, low
- user_type: admin, customer, vendor, etc.
- channel_type: email, sms, fcm, whatsapp, database
- template_type: transactional, marketing, system

**Lookup API**:
- `GET /api/v1/lookups/{type}`
- `POST /api/v1/lookups/{type}` (admin only)

### 3.5 Provider Configuration
Each tenant can configure their own providers:
- Email provider credentials
- SMS gateway settings
- WhatsApp Business API keys
- FCM server keys
- Fallback provider configuration

### 3.6 Rate Limiting & Quotas
- Per-tenant rate limits
- Per-channel rate limits
- Daily/monthly quotas
- Queue management for overflow

## 4. Non-Functional Requirements

### 4.1 Performance
- Support 10,000+ notifications per second
- CSV processing: 100,000 records in < 5 minutes
- API response time: < 200ms (excluding actual delivery)
- Delivery initiation: < 1 second per notification

### 4.2 Scalability
- Horizontal scaling for API servers
- Queue-based architecture (Kafka/RabbitMQ)
- Worker pool for channel-specific delivery
- Database sharding by tenant if needed

### 4.3 Reliability
- At-least-once delivery guarantee
- Retry logic with exponential backoff
- Dead letter queue for persistent failures
- Circuit breaker for provider failures
- Webhook delivery for status updates

### 4.4 Data Retention
- Notification records: 90 days
- Delivery logs: 30 days
- Audit logs: 1 year
- Template versions: Indefinite

### 4.5 Security
- All API calls authenticated via Keycloak
- Tenant data isolation at database level
- Encryption at rest and in transit
- PII data handling compliance
- API key rotation capability
- Webhook signature verification

## 5. Database Design Principles

### 5.1 Key Structure
- **Primary Key**: BIGINT (auto-increment)
- **Secondary Key**: UUID (for external references)
- All timestamps: TIMESTAMPTZ

### 5.2 Tenant Isolation
- Every table includes `tenant_id`
- Row-level security policies
- Tenant-specific indexes

### 5.3 Audit Fields
All tables include:
- `created_at TIMESTAMPTZ`
- `created_by VARCHAR`
- `updated_at TIMESTAMPTZ`
- `updated_by VARCHAR`
- `deleted_at TIMESTAMPTZ` (soft delete)

## 6. API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/notifications/send | Send single/multiple notifications |
| POST | /api/v1/notifications/bulk/csv | Upload CSV for bulk sending |
| GET | /api/v1/notifications/{id} | Get notification details |
| GET | /api/v1/notifications | List notifications with filters |
| GET | /api/v1/notifications/bulk/{jobId} | Get bulk job status |
| POST | /api/v1/templates | Create notification template |
| PUT | /api/v1/templates/{id} | Update template |
| GET | /api/v1/templates | List templates |
| DELETE | /api/v1/templates/{id} | Delete template |
| POST | /api/v1/providers | Configure channel provider |
| GET | /api/v1/providers | List configured providers |
| GET | /api/v1/lookups/{type} | Get lookup values |
| POST | /api/v1/lookups/{type} | Create lookup value |

## 7. Integration Points

### 7.1 Keycloak Integration
- OAuth 2.0 / OpenID Connect
- JWT token validation
- User context extraction
- Service account for system operations

### 7.2 Webhook Support
- Delivery status callbacks
- Configurable webhook URLs per tenant
- Retry logic for webhook failures
- Signature-based verification

### 7.3 External Services
- User service (to fetch user details)
- Audit service (for compliance logging)
- Analytics service (for reporting)

## 8. Monitoring & Observability

### 8.1 Metrics
- Notifications sent per channel
- Delivery success rate
- Average delivery time
- Queue depth
- API latency
- Provider failure rate

### 8.2 Logging
- Structured logging (JSON)
- Request/response logging
- Error logging with stack traces
- Audit trail for sensitive operations

### 8.3 Alerts
- High failure rate
- Queue backup
- Provider unavailability
- Rate limit exceeded
- Unusual activity patterns

## 9. Future Enhancements
- A/B testing for notification content
- Scheduled campaigns
- User preferences management
- Notification subscription center
- Advanced analytics dashboard
- ML-based delivery time optimization
- Multi-step notification workflows
- Localization engine