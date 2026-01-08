import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  tenants,
  notificationTemplates,
  lookupTypes,
  lookups,
} from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Fetch template type lookup IDs from the database
 */
async function getTemplateTypeIds(db: ReturnType<typeof drizzle>) {
  // Get template_type lookup type
  const [templateTypeLookupType] = await db
    .select()
    .from(lookupTypes)
    .where(eq(lookupTypes.typeName, 'template_type'))
    .limit(1);

  if (!templateTypeLookupType) {
    throw new Error(
      'Template type lookup type not found. Please run lookup seeders first.',
    );
  }

  // Get all template type lookups
  const templateTypeLookups = await db
    .select()
    .from(lookups)
    .where(eq(lookups.lookupTypeId, templateTypeLookupType.id));

  const typeIds: Record<string, number> = {};
  for (const lookup of templateTypeLookups) {
    typeIds[lookup.code] = lookup.id;
  }

  return typeIds;
}

export async function seedTemplates(connectionString: string) {
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('🌱 Seeding notification templates...');

  // Get default tenant
  const [tenant] = await db.select().from(tenants).limit(1);

  if (!tenant) {
    console.log('  ⚠ No tenant found, skipping template seeding');
    await client.end();
    return;
  }

  // Fetch template type lookup IDs
  const templateTypeIds = await getTemplateTypeIds(db);

  // Comprehensive template definitions
  const templates = [
    // ============================================
    // AUTHENTICATION & SECURITY TEMPLATES
    // ============================================

    // OTP Templates
    {
      tenantId: tenant.id,
      name: 'OTP Email',
      templateCode: 'OTP_EMAIL',
      templateTypeId: templateTypeIds['transactional'],
      channel: 'email',
      subject: 'Your {{appName}} verification code',
      bodyTemplate:
        "Hello {{userName}},\n\nYour verification code is: {{code}}\n\nThis code will expire in {{expirationMinutes}} minutes.\n\nIf you didn't request this code, please ignore this email.",
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello {{userName}},</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            {{code}}
          </div>
          <p>This code will expire in <strong>{{expirationMinutes}} minutes</strong>.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
      variables: {
        userName: 'string',
        code: 'string',
        appName: 'string',
        expirationMinutes: 'number',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'OTP SMS',
      templateCode: 'OTP_SMS',
      templateTypeId: templateTypeIds['transactional'],
      channel: 'sms',
      subject: null,
      bodyTemplate:
        'Your {{appName}} verification code is {{code}}. Valid for {{expirationMinutes}} minutes.',
      htmlTemplate: null,
      variables: {
        code: 'string',
        appName: 'string',
        expirationMinutes: 'number',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'OTP Push Notification',
      templateCode: 'OTP_FCM',
      templateTypeId: templateTypeIds['transactional'],
      channel: 'fcm',
      subject: 'Verification Code',
      bodyTemplate:
        'Your verification code is {{code}}. Valid for {{expirationMinutes}} minutes.',
      htmlTemplate: null,
      variables: { code: 'string', expirationMinutes: 'number' },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'OTP WhatsApp',
      templateCode: 'OTP_WHATSAPP',
      templateTypeId: templateTypeIds['transactional'],
      channel: 'whatsapp',
      subject: null,
      bodyTemplate:
        "Your {{appName}} verification code is *{{code}}*\n\nValid for {{expirationMinutes}} minutes.\n\nIf you didn't request this, please ignore.",
      htmlTemplate: null,
      variables: {
        code: 'string',
        appName: 'string',
        expirationMinutes: 'number',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },

    // Email Verification
    {
      tenantId: tenant.id,
      name: 'Email Verification',
      templateCode: 'VERIFY_EMAIL',
      templateTypeId: templateTypeIds['system'],
      channel: 'email',
      subject: 'Verify your email address',
      bodyTemplate:
        "Hello {{userName}},\n\nPlease verify your email address by clicking the link below:\n\n{{verificationLink}}\n\nThis link will expire in {{expirationMinutes}} minutes.\n\nIf you didn't create an account, please ignore this email.",
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello {{userName}},</h2>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationLink}}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">{{verificationLink}}</p>
          <p style="color: #666; font-size: 12px;">This link will expire in <strong>{{expirationMinutes}} minutes</strong>.</p>
          <p style="color: #666; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
        </div>
      `,
      variables: {
        userName: 'string',
        verificationLink: 'string',
        expirationMinutes: 'number',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Email Verification SMS',
      templateCode: 'VERIFY_EMAIL_SMS',
      templateTypeId: templateTypeIds['system'],
      channel: 'sms',
      subject: null,
      bodyTemplate:
        'Your {{appName}} email verification code is {{code}}. Valid for {{expirationMinutes}} minutes.',
      htmlTemplate: null,
      variables: {
        code: 'string',
        appName: 'string',
        expirationMinutes: 'number',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },

    // Password Reset (Enhanced)
    {
      tenantId: tenant.id,
      name: 'Password Reset',
      templateCode: 'PASSWORD_RESET',
      templateTypeId: templateTypeIds['system'],
      channel: 'email',
      subject: 'Password Reset Request',
      bodyTemplate:
        "Hello {{userName}},\n\nWe received a request to reset your password. Click the link below to reset it:\n\n{{resetLink}}\n\nThis link will expire in {{expirationMinutes}} minutes.\n\nIf you didn't request a password reset, please ignore this email and your password will remain unchanged.",
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello {{userName}},</h2>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetLink}}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">{{resetLink}}</p>
          <p style="color: #666; font-size: 12px;">This link will expire in <strong>{{expirationMinutes}} minutes</strong>.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
      `,
      variables: {
        userName: 'string',
        resetLink: 'string',
        expirationMinutes: 'number',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Password Changed',
      templateCode: 'PASSWORD_CHANGED',
      templateTypeId: templateTypeIds['system'],
      channel: 'email',
      subject: 'Your password has been changed',
      bodyTemplate:
        "Hello {{userName}},\n\nYour password was successfully changed on {{date}} at {{time}}.\n\nIf you didn't make this change, please contact support immediately.",
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello {{userName}},</h2>
          <p>Your password was successfully changed on <strong>{{date}}</strong> at <strong>{{time}}</strong>.</p>
          <p style="color: #dc3545;">If you didn't make this change, please contact support immediately.</p>
        </div>
      `,
      variables: { userName: 'string', date: 'string', time: 'string' },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },

    // Security Alerts
    {
      tenantId: tenant.id,
      name: 'Account Locked',
      templateCode: 'ACCOUNT_LOCKED',
      templateTypeId: templateTypeIds['alert'],
      channel: 'email',
      subject: 'Your account has been locked',
      bodyTemplate:
        'Hello {{userName}},\n\nYour account has been temporarily locked due to multiple failed login attempts.\n\nLocked at: {{date}} {{time}}\n\nFor security reasons, your account will remain locked for {{lockDuration}} minutes. You can try logging in again after this period.\n\nIf you believe this is an error, please contact support.',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Account Locked</h2>
          <p>Hello {{userName}},</p>
          <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
          <p><strong>Locked at:</strong> {{date}} {{time}}</p>
          <p>For security reasons, your account will remain locked for <strong>{{lockDuration}} minutes</strong>. You can try logging in again after this period.</p>
          <p style="color: #dc3545;">If you believe this is an error, please contact support.</p>
        </div>
      `,
      variables: {
        userName: 'string',
        date: 'string',
        time: 'string',
        lockDuration: 'number',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Login Alert',
      templateCode: 'LOGIN_ALERT',
      templateTypeId: templateTypeIds['alert'],
      channel: 'email',
      subject: 'New login detected',
      bodyTemplate:
        "Hello {{userName}},\n\nWe detected a new login to your account:\n\nDate: {{date}}\nTime: {{time}}\nDevice: {{deviceInfo}}\nIP Address: {{ipAddress}}\n\nIf this wasn't you, please secure your account immediately.",
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Login Detected</h2>
          <p>Hello {{userName}},</p>
          <p>We detected a new login to your account:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Date:</strong> {{date}}</p>
            <p><strong>Time:</strong> {{time}}</p>
            <p><strong>Device:</strong> {{deviceInfo}}</p>
            <p><strong>IP Address:</strong> {{ipAddress}}</p>
          </div>
          <p style="color: #dc3545;">If this wasn't you, please secure your account immediately.</p>
        </div>
      `,
      variables: {
        userName: 'string',
        date: 'string',
        time: 'string',
        deviceInfo: 'string',
        ipAddress: 'string',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Security Alert',
      templateCode: 'SECURITY_ALERT',
      templateTypeId: templateTypeIds['alert'],
      channel: 'email',
      subject: 'Security Alert: Suspicious activity detected',
      bodyTemplate:
        "Hello {{userName}},\n\nWe detected suspicious activity on your account:\n\nActivity: {{activityDescription}}\nDate: {{date}}\nTime: {{time}}\nIP Address: {{ipAddress}}\n\nIf this wasn't you, please contact support immediately and change your password.",
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Security Alert</h2>
          <p>Hello {{userName}},</p>
          <p>We detected suspicious activity on your account:</p>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>Activity:</strong> {{activityDescription}}</p>
            <p><strong>Date:</strong> {{date}}</p>
            <p><strong>Time:</strong> {{time}}</p>
            <p><strong>IP Address:</strong> {{ipAddress}}</p>
          </div>
          <p style="color: #dc3545;">If this wasn't you, please contact support immediately and change your password.</p>
        </div>
      `,
      variables: {
        userName: 'string',
        activityDescription: 'string',
        date: 'string',
        time: 'string',
        ipAddress: 'string',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },

    // ============================================
    // WELCOME & ONBOARDING TEMPLATES
    // ============================================

    {
      tenantId: tenant.id,
      name: 'Welcome Email',
      templateCode: 'WELCOME_EMAIL',
      templateTypeId: templateTypeIds['system'],
      channel: 'email',
      subject: 'Welcome to {{appName}}!',
      bodyTemplate:
        "Hello {{userName}},\n\nWelcome to {{appName}}! We're thrilled to have you on board.\n\nYour account has been successfully created. Here's what you can do next:\n\n1. Complete your profile\n2. Explore our features\n3. Get started with your first task\n\nIf you have any questions, our support team is here to help.\n\nBest regards,\nThe {{appName}} Team",
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #007bff;">Welcome to {{appName}}!</h1>
          <p>Hello {{userName}},</p>
          <p>We're thrilled to have you on board. Your account has been successfully created.</p>
          <h3>Here's what you can do next:</h3>
          <ul>
            <li>Complete your profile</li>
            <li>Explore our features</li>
            <li>Get started with your first task</li>
          </ul>
          <p>If you have any questions, our support team is here to help.</p>
          <p>Best regards,<br>The {{appName}} Team</p>
        </div>
      `,
      variables: { userName: 'string', appName: 'string' },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Welcome SMS',
      templateCode: 'WELCOME_SMS',
      templateTypeId: templateTypeIds['system'],
      channel: 'sms',
      subject: null,
      bodyTemplate:
        'Welcome to {{appName}}, {{userName}}! Your account is ready. Get started at {{appUrl}}',
      htmlTemplate: null,
      variables: { userName: 'string', appName: 'string', appUrl: 'string' },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Account Activated',
      templateCode: 'ACCOUNT_ACTIVATED',
      templateTypeId: templateTypeIds['system'],
      channel: 'email',
      subject: 'Your account has been activated',
      bodyTemplate:
        'Hello {{userName}},\n\nGreat news! Your account has been successfully activated.\n\nYou can now access all features of {{appName}}. Log in to get started:\n\n{{loginUrl}}\n\nWelcome aboard!\n\nThe {{appName}} Team',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Account Activated</h2>
          <p>Hello {{userName}},</p>
          <p>Great news! Your account has been successfully activated.</p>
          <p>You can now access all features of {{appName}}. <a href="{{loginUrl}}">Log in</a> to get started.</p>
          <p>Welcome aboard!</p>
          <p>The {{appName}} Team</p>
        </div>
      `,
      variables: { userName: 'string', appName: 'string', loginUrl: 'string' },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },

    // ============================================
    // TRANSACTIONAL TEMPLATES
    // ============================================

    {
      tenantId: tenant.id,
      name: 'Order Confirmation',
      templateCode: 'ORDER_CONFIRMATION',
      templateTypeId: templateTypeIds['transactional'],
      channel: 'email',
      subject: 'Order Confirmation #{{orderNumber}}',
      bodyTemplate:
        "Hello {{userName}},\n\nThank you for your order!\n\nOrder Number: {{orderNumber}}\nOrder Date: {{orderDate}}\nTotal Amount: ${{orderTotal}}\n\nWe'll send you another email when your order ships.\n\nView your order: {{orderUrl}}",
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Order Confirmation</h2>
          <p>Hello {{userName}},</p>
          <p>Thank you for your order!</p>
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> {{orderNumber}}</p>
            <p><strong>Order Date:</strong> {{orderDate}}</p>
            <p><strong>Total Amount:</strong> ${'{{orderTotal}}'}</p>
          </div>
          <p>We'll send you another email when your order ships.</p>
          <p><a href="{{orderUrl}}">View your order</a></p>
        </div>
      `,
      variables: {
        userName: 'string',
        orderNumber: 'string',
        orderDate: 'string',
        orderTotal: 'number',
        orderUrl: 'string',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Payment Confirmation',
      templateCode: 'PAYMENT_CONFIRMATION',
      templateTypeId: templateTypeIds['transactional'],
      channel: 'email',
      subject: 'Payment Confirmation - ${{amount}}',
      bodyTemplate:
        'Hello {{userName}},\n\nYour payment has been successfully processed.\n\nPayment Details:\nAmount: ${{amount}}\nTransaction ID: {{transactionId}}\nDate: {{paymentDate}}\n\nThank you for your payment!',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Payment Confirmation</h2>
          <p>Hello {{userName}},</p>
          <p>Your payment has been successfully processed.</p>
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Amount:</strong> ${'{{amount}}'}</p>
            <p><strong>Transaction ID:</strong> {{transactionId}}</p>
            <p><strong>Date:</strong> {{paymentDate}}</p>
          </div>
          <p>Thank you for your payment!</p>
        </div>
      `,
      variables: {
        userName: 'string',
        amount: 'number',
        transactionId: 'string',
        paymentDate: 'string',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Invoice',
      templateCode: 'INVOICE',
      templateTypeId: templateTypeIds['transactional'],
      channel: 'email',
      subject: 'Invoice #{{invoiceNumber}}',
      bodyTemplate:
        'Hello {{userName}},\n\nPlease find your invoice attached.\n\nInvoice Number: {{invoiceNumber}}\nInvoice Date: {{invoiceDate}}\nAmount Due: ${{amountDue}}\nDue Date: {{dueDate}}\n\nView invoice: {{invoiceUrl}}',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice #{{invoiceNumber}}</h2>
          <p>Hello {{userName}},</p>
          <p>Please find your invoice details below.</p>
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
            <p><strong>Invoice Date:</strong> {{invoiceDate}}</p>
            <p><strong>Amount Due:</strong> ${'{{amountDue}}'}</p>
            <p><strong>Due Date:</strong> {{dueDate}}</p>
          </div>
          <p><a href="{{invoiceUrl}}">View full invoice</a></p>
        </div>
      `,
      variables: {
        userName: 'string',
        invoiceNumber: 'string',
        invoiceDate: 'string',
        amountDue: 'number',
        dueDate: 'string',
        invoiceUrl: 'string',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Shipping Notification',
      templateCode: 'SHIPPING_NOTIFICATION',
      templateTypeId: templateTypeIds['transactional'],
      channel: 'email',
      subject: 'Your order #{{orderNumber}} has shipped!',
      bodyTemplate:
        'Hello {{userName}},\n\nGreat news! Your order #{{orderNumber}} has shipped.\n\nTracking Number: {{trackingNumber}}\nCarrier: {{carrier}}\nEstimated Delivery: {{estimatedDelivery}}\n\nTrack your package: {{trackingUrl}}',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Your Order Has Shipped!</h2>
          <p>Hello {{userName}},</p>
          <p>Great news! Your order #{{orderNumber}} has shipped.</p>
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
            <p><strong>Carrier:</strong> {{carrier}}</p>
            <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
          </div>
          <p><a href="{{trackingUrl}}">Track your package</a></p>
        </div>
      `,
      variables: {
        userName: 'string',
        orderNumber: 'string',
        trackingNumber: 'string',
        carrier: 'string',
        estimatedDelivery: 'string',
        trackingUrl: 'string',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Delivery Confirmation',
      templateCode: 'DELIVERY_CONFIRMATION',
      templateTypeId: templateTypeIds['transactional'],
      channel: 'email',
      subject: 'Your order #{{orderNumber}} has been delivered',
      bodyTemplate:
        'Hello {{userName}},\n\nYour order #{{orderNumber}} has been delivered!\n\nDelivered on: {{deliveryDate}}\n\nWe hope you enjoy your purchase. If you have any questions, please contact us.',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Order Delivered!</h2>
          <p>Hello {{userName}},</p>
          <p>Your order #{{orderNumber}} has been delivered!</p>
          <p><strong>Delivered on:</strong> {{deliveryDate}}</p>
          <p>We hope you enjoy your purchase. If you have any questions, please contact us.</p>
        </div>
      `,
      variables: {
        userName: 'string',
        orderNumber: 'string',
        deliveryDate: 'string',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },

    // ============================================
    // SYSTEM & ALERTS TEMPLATES
    // ============================================

    {
      tenantId: tenant.id,
      name: 'System Maintenance',
      templateCode: 'SYSTEM_MAINTENANCE',
      templateTypeId: templateTypeIds['system'],
      channel: 'email',
      subject: 'Scheduled System Maintenance',
      bodyTemplate:
        'Hello {{userName}},\n\nWe will be performing scheduled maintenance on {{appName}}.\n\nMaintenance Window:\nStart: {{startTime}}\nEnd: {{endTime}}\n\nDuring this time, {{appName}} may be temporarily unavailable. We apologize for any inconvenience.',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ffc107;">Scheduled System Maintenance</h2>
          <p>Hello {{userName}},</p>
          <p>We will be performing scheduled maintenance on {{appName}}.</p>
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>Maintenance Window:</strong></p>
            <p><strong>Start:</strong> {{startTime}}</p>
            <p><strong>End:</strong> {{endTime}}</p>
          </div>
          <p>During this time, {{appName}} may be temporarily unavailable. We apologize for any inconvenience.</p>
        </div>
      `,
      variables: {
        userName: 'string',
        appName: 'string',
        startTime: 'string',
        endTime: 'string',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Feature Update',
      templateCode: 'FEATURE_UPDATE',
      templateTypeId: templateTypeIds['system'],
      channel: 'email',
      subject: 'New Feature: {{featureName}}',
      bodyTemplate:
        "Hello {{userName}},\n\nWe're excited to announce a new feature: {{featureName}}\n\n{{featureDescription}}\n\nTry it out: {{featureUrl}}\n\nThank you for being a valued member of {{appName}}!",
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">New Feature: {{featureName}}</h2>
          <p>Hello {{userName}},</p>
          <p>We're excited to announce a new feature: <strong>{{featureName}}</strong></p>
          <p>{{featureDescription}}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{featureUrl}}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Try it out</a>
          </div>
          <p>Thank you for being a valued member of {{appName}}!</p>
        </div>
      `,
      variables: {
        userName: 'string',
        featureName: 'string',
        featureDescription: 'string',
        featureUrl: 'string',
        appName: 'string',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      tenantId: tenant.id,
      name: 'Account Suspended',
      templateCode: 'ACCOUNT_SUSPENDED',
      templateTypeId: templateTypeIds['alert'],
      channel: 'email',
      subject: 'Your account has been suspended',
      bodyTemplate:
        'Hello {{userName}},\n\nYour account has been suspended due to: {{suspensionReason}}\n\nSuspended on: {{suspensionDate}}\n\nIf you believe this is an error or would like to appeal, please contact our support team.\n\nSupport: {{supportUrl}}',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Account Suspended</h2>
          <p>Hello {{userName}},</p>
          <p>Your account has been suspended due to: <strong>{{suspensionReason}}</strong></p>
          <p><strong>Suspended on:</strong> {{suspensionDate}}</p>
          <p>If you believe this is an error or would like to appeal, please contact our support team.</p>
          <p><a href="{{supportUrl}}">Contact Support</a></p>
        </div>
      `,
      variables: {
        userName: 'string',
        suspensionReason: 'string',
        suspensionDate: 'string',
        supportUrl: 'string',
      },
      language: 'en',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    const [existing] = await db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.tenantId, tenant.id),
          eq(notificationTemplates.templateCode, template.templateCode),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(notificationTemplates).values(template as any);
      console.log(`  ✓ Created template: ${template.name}`);
      created++;
    } else {
      console.log(`  ⊙ Skipped existing: ${template.name}`);
      skipped++;
    }
  }

  await client.end();
  console.log(`✅ Templates seeded: ${created} created, ${skipped} skipped\n`);
}
