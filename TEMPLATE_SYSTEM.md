# Template System Guide

## Overview

The notification system includes a comprehensive template hierarchy that provides:

- **System Templates** (tenantId = 0): Professional, email-client-compatible HTML templates that serve as defaults for all tenants
- **Tenant Templates**: Custom templates that tenants can create to override system defaults
- **Fallback Logic**: Automatic fallback from tenant templates to system templates

## Architecture

### Template Hierarchy

```
┌─────────────────────────────────────┐
│   Notification Request              │
│   (templateCode: "WELCOME_EMAIL")   │
└────────────┬────────────────────────┘
             │
             ▼
     ┌───────────────┐
     │ Lookup Logic  │
     └───────┬───────┘
             │
             ├─── Try: Tenant Template (tenantId = X)
             │    └─── If found → Use it
             │
             └─── Fallback: System Template (tenantId = 0)
                  └─── Always available
```

### File Structure

```
src/modules/templates/html-templates/
├── services/
│   ├── handlebars-config.service.ts    # Handlebars engine configuration
│   └── template-loader.service.ts      # Loads .hbs files from filesystem
├── components/
│   ├── layouts/                         # Reusable layout components
│   │   ├── base.hbs
│   │   ├── header.hbs
│   │   ├── footer.hbs
│   │   └── button.hbs
│   └── partials/                        # Reusable partial components
│       ├── hero.hbs
│       ├── content-block.hbs
│       ├── alert.hbs
│       └── divider.hbs
├── transactional/                       # Transactional templates
│   ├── authentication/                  # 7 templates
│   ├── account/                         # 7 templates
│   └── notifications/                   # 6 templates
├── marketing/                           # Marketing templates
│   ├── campaigns/                       # 6 templates
│   ├── engagement/                      # 8 templates
│   ├── promotional/                     # 7 templates
│   └── educational/                     # 5 templates
└── templates.metadata.ts                # Template definitions
```

## Available System Templates

### Transactional Templates (20 templates)

#### Authentication (7)
- `WELCOME_EMAIL`: Welcome new users after registration
- `EMAIL_VERIFICATION`: Email verification with code and link
- `PASSWORD_RESET`: Password reset request with secure link
- `PASSWORD_CHANGED`: Confirmation of password change
- `TWO_FACTOR_AUTH`: 2FA code delivery
- `TWO_FACTOR_ENABLED`: 2FA setup confirmation
- `LOGIN_NOTIFICATION`: New device/location login alert

#### Account Management (7)
- `ACCOUNT_ACTIVATED`: Account activation confirmation
- `ACCOUNT_SUSPENDED`: Account suspension notice
- `ACCOUNT_DELETED`: Account deletion confirmation
- `PROFILE_UPDATED`: Profile changes confirmation
- `SETTINGS_CHANGED`: Settings modification notice
- `EMAIL_CHANGED`: Email address change verification
- `PHONE_CHANGED`: Phone number change verification

#### System Notifications (6)
- `SYSTEM_ALERT`: Critical system alerts
- `MAINTENANCE_NOTICE`: Scheduled maintenance notifications
- `SECURITY_ALERT`: Security-related warnings
- `PAYMENT_REMINDER`: Payment due reminders
- `SUBSCRIPTION_EXPIRING`: Subscription expiration notice
- `TASK_REMINDER`: Task/deadline reminders

### Marketing Templates (26 templates)

#### Campaigns (6)
- `NEWSLETTER_STANDARD`: Standard newsletter layout
- `NEWSLETTER_DIGEST`: Digest/roundup format
- `PRODUCT_ANNOUNCEMENT`: New product/feature launch
- `PRODUCT_UPDATE`: Feature updates and improvements
- `COMPANY_NEWS`: Company announcements
- `BLOG_DIGEST`: Blog post roundup

#### Engagement (8)
- `WELCOME_SERIES_1`: First onboarding email
- `WELCOME_SERIES_2`: Second onboarding email
- `WELCOME_SERIES_3`: Third onboarding email
- `RE_ENGAGEMENT`: Win back inactive users
- `REFERRAL_INVITE`: Referral program invitation
- `FEEDBACK_REQUEST`: Survey/feedback request
- `REVIEW_REQUEST`: Product/service review request
- `USER_MILESTONE`: Achievement/milestone celebration

#### Promotional (7)
- `SPECIAL_OFFER`: Limited time offers
- `DISCOUNT_CODE`: Discount code delivery
- `SEASONAL_SALE`: Holiday/seasonal promotions
- `FLASH_SALE`: Urgent flash sales
- `EVENT_INVITATION`: Event invitations
- `WEBINAR_INVITATION`: Webinar registration
- `ABANDONED_CART`: Cart abandonment recovery

#### Educational (5)
- `TIPS_AND_TRICKS`: Tips series for users
- `HOW_TO_GUIDE`: Step-by-step guides
- `BEST_PRACTICES`: Best practices content
- `CASE_STUDY`: Customer success stories
- `RESOURCE_ROUNDUP`: Resource collections

## Using Templates

### By Template ID (Traditional)

```json
{
  "tenantId": 1,
  "channel": "email",
  "recipient": {
    "recipientEmail": "user@example.com"
  },
  "templateId": 123,
  "templateVariables": {
    "firstName": "John",
    "companyName": "Acme Corp"
  }
}
```

### By Template Code (Recommended)

```json
{
  "tenantId": 1,
  "channel": "email",
  "recipient": {
    "recipientEmail": "user@example.com"
  },
  "templateCode": "WELCOME_EMAIL",
  "templateVariables": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "companyName": "Acme Corp",
    "loginUrl": "https://app.example.com/login"
  }
}
```

## Template Variables

Each template requires specific variables. Missing variables will be kept as `{{variableName}}` in the output for visibility.

### Common Variables

Most templates use these standard variables:

- `firstName`: User's first name
- `lastName`: User's last name
- `email`: User's email address
- `companyName`: Company/brand name
- `year`: Current year (auto-injected)

### Template-Specific Variables

Check `templates.metadata.ts` for each template's required variables:

```typescript
{
  name: 'Welcome Email',
  templateCode: 'WELCOME_EMAIL',
  variables: {
    firstName: 'string - User first name',
    lastName: 'string - User last name',
    email: 'string - User email address',
    companyName: 'string - Company name',
    loginUrl: 'string - Login page URL',
  },
}
```

## Overriding System Templates

Tenants can override system templates by creating their own with the same `templateCode`:

1. **Create a custom template** via API with the same `templateCode`
2. **Set tenantId** to your tenant's ID
3. **Template will be used** automatically instead of the system default

Example:

```http
POST /api/v1/admin/templates
Content-Type: application/json

{
  "tenantId": 1,
  "name": "Custom Welcome Email",
  "templateCode": "WELCOME_EMAIL",
  "channel": "email",
  "subject": "Welcome to {{companyName}} - Custom Version",
  "bodyTemplate": "...",
  "htmlTemplate": "..."
}
```

Now when `WELCOME_EMAIL` is requested for tenant 1, the custom version will be used instead of the system default.

## Preview Templates

### Preview System Template

```http
POST /api/v1/admin/templates/system/WELCOME_EMAIL/preview
Content-Type: application/json

{
  "variables": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "companyName": "Acme Corp",
    "loginUrl": "https://app.example.com/login"
  }
}
```

### Preview with Tenant Fallback

```http
POST /api/v1/admin/templates/WELCOME_EMAIL/preview/1
Content-Type: application/json

{
  "variables": {
    "firstName": "John",
    "companyName": "Acme Corp"
  }
}
```

This will use the tenant's override if it exists, otherwise the system template.

## Email Client Compatibility

All system templates are designed for maximum compatibility:

- ✅ Gmail
- ✅ Outlook (Desktop & Web)
- ✅ Apple Mail
- ✅ Yahoo Mail
- ✅ Thunderbird
- ✅ Mobile clients (iOS Mail, Android Gmail)

### Compatibility Features

- **Table-based layouts**: Required for Outlook compatibility
- **Inline CSS**: All styles are inline (no `<style>` tags)
- **MSO conditionals**: Special handling for Outlook-specific rendering
- **Font fallbacks**: System font stacks for universal support
- **Safe colors**: Web-safe color palette

## Handlebars Helpers

The template engine includes custom helpers:

### Date Formatting

```handlebars
{{formatDate loginTime}}
```

### Currency Formatting

```handlebars
{{currency amount "USD"}}
```

### Text Transformation

```handlebars
{{uppercase companyName}}
{{lowercase email}}
```

### Default Values

```handlebars
{{default firstName "Valued Customer"}}
```

### Conditionals

```handlebars
{{#if logoUrl}}
  <img src="{{logoUrl}}" alt="Logo" />
{{/if}}
```

## Best Practices

### 1. Always Provide Required Variables

Check template metadata and provide all required variables to avoid `{{variableName}}` appearing in emails.

### 2. Use Template Codes for Flexibility

Using `templateCode` instead of `templateId` allows tenants to override templates without changing your code.

### 3. Test with Real Data

Always preview templates with realistic data before sending to users.

### 4. Keep It Simple

System templates are designed to be clean and professional. When overriding, maintain simplicity for best deliverability.

### 5. Mobile-First

Always test on mobile devices - over 60% of emails are opened on mobile.

## Seeding Templates

System templates are automatically seeded when running:

```bash
npm run seed
```

This loads all `.hbs` files from the filesystem and inserts them into the database with `tenantId = 0`.

## Troubleshooting

### Template Not Found

**Error**: `Template 'WELCOME_EMAIL' not found for tenant 1 or in system templates`

**Solution**: Run the seeder to create system templates:
```bash
npm run seed
```

### Missing Variables

**Issue**: Email shows `{{variableName}}` instead of values

**Solution**: Check `templates.metadata.ts` for required variables and ensure all are provided in `templateVariables`.

### Rendering Issues

**Issue**: Template renders incorrectly in certain email clients

**Solution**: System templates are tested for compatibility. If using custom templates, ensure you follow table-based layout patterns and inline CSS.

## API Endpoints

### Get All System Templates

```http
GET /api/v1/admin/templates/system/list
Authorization: Bearer <token>
```

### Get System Template by Code

```http
GET /api/v1/admin/templates/system/:templateCode
Authorization: Bearer <token>
```

### Preview System Template

```http
POST /api/v1/admin/templates/system/:templateCode/preview
Authorization: Bearer <token>
Content-Type: application/json

{
  "variables": { ... }
}
```

### Preview with Tenant Fallback

```http
POST /api/v1/admin/templates/:templateCode/preview/:tenantId
Authorization: Bearer <token>
Content-Type: application/json

{
  "variables": { ... }
}
```

## Support

For issues or questions about the template system:

1. Check this documentation
2. Review `templates.metadata.ts` for template specifications
3. Examine `.hbs` files in `src/modules/templates/html-templates/` for template structure
4. Contact the development team
