/**
 * Default templates for new tenants
 * These templates are automatically created when a new tenant is registered
 */

export interface DefaultTemplate {
  name: string;
  templateCode: string;
  channel: string;
  subject?: string;
  bodyTemplate: string;
  htmlTemplate?: string;
  variables: Record<string, any>;
  language: string;
  categoryCode?: string;
}

export const defaultTemplates: DefaultTemplate[] = [
  // Email Templates
  {
    name: 'Welcome Email',
    templateCode: 'WELCOME_EMAIL',
    channel: 'email',
    subject: 'Welcome to {{companyName}}!',
    bodyTemplate: `Hello {{firstName}} {{lastName}},

Welcome to {{companyName}}! We're excited to have you on board.

Your account has been successfully created with the email: {{email}}

Get started by exploring our platform and setting up your preferences.

Best regards,
The {{companyName}} Team`,
    htmlTemplate: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #4CAF50;">Welcome to {{companyName}}!</h1>
    <p>Hello {{firstName}} {{lastName}},</p>
    <p>We're excited to have you on board.</p>
    <p>Your account has been successfully created with the email: <strong>{{email}}</strong></p>
    <p>Get started by exploring our platform and setting up your preferences.</p>
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="color: #666; font-size: 0.9em;">Best regards,<br>The {{companyName}} Team</p>
    </div>
  </div>
</body>
</html>`,
    variables: {
      firstName: 'string',
      lastName: 'string',
      email: 'string',
      companyName: 'string',
    },
    language: 'en',
    categoryCode: 'ACCOUNT',
  },
  {
    name: 'Password Reset Email',
    templateCode: 'PASSWORD_RESET_EMAIL',
    channel: 'email',
    subject: 'Reset Your Password',
    bodyTemplate: `Hello {{firstName}},

We received a request to reset your password for your {{companyName}} account.

Click the link below to reset your password:
{{resetLink}}

This link will expire in {{expiryHours}} hours.

If you didn't request this, please ignore this email.

Best regards,
The {{companyName}} Team`,
    htmlTemplate: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Reset Your Password</h2>
    <p>Hello {{firstName}},</p>
    <p>We received a request to reset your password for your {{companyName}} account.</p>
    <div style="margin: 30px 0;">
      <a href="{{resetLink}}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p>This link will expire in {{expiryHours}} hours.</p>
    <p style="color: #666;">If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>`,
    variables: {
      firstName: 'string',
      resetLink: 'string',
      expiryHours: 'number',
      companyName: 'string',
    },
    language: 'en',
    categoryCode: 'SECURITY',
  },
  {
    name: 'Email Verification',
    templateCode: 'EMAIL_VERIFICATION',
    channel: 'email',
    subject: 'Verify Your Email Address',
    bodyTemplate: `Hello {{firstName}},

Please verify your email address to complete your registration.

Verification code: {{verificationCode}}

Or click this link: {{verificationLink}}

This code will expire in {{expiryMinutes}} minutes.

Best regards,
The {{companyName}} Team`,
    htmlTemplate: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Verify Your Email</h2>
    <p>Hello {{firstName}},</p>
    <p>Please verify your email address to complete your registration.</p>
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 0.9em; color: #666;">Verification Code:</p>
      <p style="font-size: 2em; font-weight: bold; letter-spacing: 0.3em; margin: 10px 0;">{{verificationCode}}</p>
    </div>
    <p>Or click this button:</p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{verificationLink}}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Verify Email
      </a>
    </div>
    <p style="color: #666; font-size: 0.9em;">This code will expire in {{expiryMinutes}} minutes.</p>
  </div>
</body>
</html>`,
    variables: {
      firstName: 'string',
      verificationCode: 'string',
      verificationLink: 'string',
      expiryMinutes: 'number',
      companyName: 'string',
    },
    language: 'en',
    categoryCode: 'SECURITY',
  },
  {
    name: 'Account Activated',
    templateCode: 'ACCOUNT_ACTIVATED',
    channel: 'email',
    subject: 'Your Account is Active',
    bodyTemplate: `Hello {{firstName}},

Great news! Your {{companyName}} account is now active.

You can now access all features and start using our platform.

Login URL: {{loginUrl}}

Best regards,
The {{companyName}} Team`,
    variables: {
      firstName: 'string',
      loginUrl: 'string',
      companyName: 'string',
    },
    language: 'en',
    categoryCode: 'ACCOUNT',
  },

  // SMS Templates
  {
    name: 'SMS Verification Code',
    templateCode: 'SMS_VERIFICATION',
    channel: 'sms',
    bodyTemplate: '{{companyName}}: Your verification code is {{code}}. Valid for {{expiryMinutes}} minutes.',
    variables: {
      code: 'string',
      expiryMinutes: 'number',
      companyName: 'string',
    },
    language: 'en',
    categoryCode: 'SECURITY',
  },
  {
    name: 'SMS Alert',
    templateCode: 'SMS_ALERT',
    channel: 'sms',
    bodyTemplate: '{{companyName}} Alert: {{message}}',
    variables: {
      message: 'string',
      companyName: 'string',
    },
    language: 'en',
    categoryCode: 'ALERTS',
  },

  // FCM Templates
  {
    name: 'Push Notification Alert',
    templateCode: 'FCM_ALERT',
    channel: 'fcm',
    subject: '{{title}}',
    bodyTemplate: '{{message}}',
    variables: {
      title: 'string',
      message: 'string',
    },
    language: 'en',
    categoryCode: 'ALERTS',
  },

  // WhatsApp Templates
  {
    name: 'WhatsApp Notification',
    templateCode: 'WHATSAPP_NOTIFICATION',
    channel: 'whatsapp',
    bodyTemplate: 'Hello {{name}}, {{message}}',
    variables: {
      name: 'string',
      message: 'string',
    },
    language: 'en',
    categoryCode: 'GENERAL',
  },

  // Two-Factor Authentication
  {
    name: 'Two-Factor Authentication',
    templateCode: 'TWO_FACTOR_AUTH',
    channel: 'email',
    subject: 'Your Authentication Code',
    bodyTemplate: `Hello {{firstName}},

Your two-factor authentication code is: {{code}}

This code will expire in {{expiryMinutes}} minutes.

If you didn't request this code, please contact support immediately.

Best regards,
The {{companyName}} Team`,
    variables: {
      firstName: 'string',
      code: 'string',
      expiryMinutes: 'number',
      companyName: 'string',
    },
    language: 'en',
    categoryCode: 'SECURITY',
  },
];

export const defaultCategories = [
  { name: 'Account Management', code: 'ACCOUNT', icon: 'user', color: '#2196F3' },
  { name: 'Security', code: 'SECURITY', icon: 'lock', color: '#F44336' },
  { name: 'Alerts', code: 'ALERTS', icon: 'bell', color: '#FF9800' },
  { name: 'General', code: 'GENERAL', icon: 'info', color: '#9E9E9E' },
  { name: 'Marketing', code: 'MARKETING', icon: 'mail', color: '#4CAF50' },
];
