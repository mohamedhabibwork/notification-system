/**
 * User Seeding Data
 * 
 * Define admin users, test users, and their configurations here.
 * This file is used by the seeding process.
 */

export interface SeedUser {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
}

/**
 * Admin Users
 * These users will have full administrative access
 */
export const adminUsers: SeedUser[] = [
  {
    email: 'admin@yourdomain.com',
    password: 'AdminPass123!',
    role: 'admin',
    firstName: 'System',
    lastName: 'Admin',
    isActive: true,
  },
  {
    email: 'superadmin@yourdomain.com',
    password: 'SuperPass123!',
    role: 'superadmin',
    firstName: 'Super',
    lastName: 'Admin',
    isActive: true,
  },
];

/**
 * Test Users
 * These users are for testing and development purposes
 */
export const testUsers: SeedUser[] = [
  {
    email: 'user1@test.com',
    password: 'User123!',
    role: 'user',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
  },
  {
    email: 'user2@test.com',
    password: 'User123!',
    role: 'user',
    firstName: 'Demo',
    lastName: 'User',
    isActive: true,
  },
  {
    email: 'viewer@test.com',
    password: 'User123!',
    role: 'viewer',
    firstName: 'Read Only',
    lastName: 'User',
    isActive: true,
  },
];

/**
 * Service Accounts
 * OAuth2 client credentials for service-to-service authentication
 */
export interface SeedServiceAccount {
  clientId: string;
  clientSecret: string;
  roles: string[];
  description: string;
  isActive?: boolean;
}

export const serviceAccounts: SeedServiceAccount[] = [
  {
    clientId: 'order-service',
    clientSecret: 'order-secret-change-in-production',
    roles: ['notification:send', 'notification:read'],
    description: 'Order Management Service',
    isActive: true,
  },
  {
    clientId: 'payment-service',
    clientSecret: 'payment-secret-change-in-production',
    roles: ['notification:send'],
    description: 'Payment Processing Service',
    isActive: true,
  },
  {
    clientId: 'user-service',
    clientSecret: 'user-secret-change-in-production',
    roles: ['notification:send', 'user:manage'],
    description: 'User Management Service',
    isActive: true,
  },
  {
    clientId: 'analytics-service',
    clientSecret: 'analytics-secret-change-in-production',
    roles: ['notification:read', 'metrics:read'],
    description: 'Analytics Service (read-only)',
    isActive: true,
  },
];

/**
 * Default Tenants
 * Initial tenant organizations to be created
 */
export interface SeedTenant {
  name: string;
  domain: string;
  isActive: boolean;
  settings?: Record<string, any>;
}

export const defaultTenants: SeedTenant[] = [
  {
    name: 'Default Tenant',
    domain: 'default.local',
    isActive: true,
    settings: {
      timezone: 'UTC',
      language: 'en',
    },
  },
  {
    name: 'Demo Company',
    domain: 'demo.com',
    isActive: true,
    settings: {
      timezone: 'America/New_York',
      language: 'en',
    },
  },
];
