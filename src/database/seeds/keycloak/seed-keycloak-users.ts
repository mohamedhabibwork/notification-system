#!/usr/bin/env ts-node

/**
 * Keycloak User Seeding Script
 * 
 * Creates admin users, test users, and service accounts in Keycloak.
 * User data is defined in: src/database/seeds/seed-users.ts
 */

import * as dotenv from 'dotenv';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import { adminUsers, testUsers, serviceAccounts } from '../seed-users';

dotenv.config();

const KEYCLOAK_SERVER_URL = process.env.KEYCLOAK_SERVER_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'notification-realm';
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

async function main() {
  console.log('🔐 Starting Keycloak user seeding...\n');

  const kcAdminClient = new KcAdminClient({
    baseUrl: KEYCLOAK_SERVER_URL,
    realmName: 'master',
  });

  try {
    // Authenticate
    await kcAdminClient.auth({
      username: KEYCLOAK_ADMIN_USERNAME,
      password: KEYCLOAK_ADMIN_PASSWORD,
      grantType: 'password',
      clientId: 'admin-cli',
    });

    kcAdminClient.setConfig({ realmName: KEYCLOAK_REALM });

    // ============================================================================
    // 1. SEED ADMIN USERS
    // ============================================================================
    console.log('👤 Seeding admin users...');
    
    for (const user of adminUsers) {
      try {
        // Check if user exists
        const existingUsers = await kcAdminClient.users.find({
          email: user.email,
          realm: KEYCLOAK_REALM,
        });

        if (existingUsers.length === 0) {
          await kcAdminClient.users.create({
            realm: KEYCLOAK_REALM,
            username: user.email,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            enabled: user.isActive !== false,
            emailVerified: true,
            credentials: [
              {
                type: 'password',
                value: user.password,
                temporary: false,
              },
            ],
            attributes: {
              role: [user.role],
            },
          });

          console.log(`  ✅ Created admin user: ${user.email} (${user.role})`);
        } else {
          console.log(`  ⏭️  Skipped (exists): ${user.email}`);
        }
      } catch (error: any) {
        console.error(`  ❌ Failed to create ${user.email}:`, error.message);
      }
    }

    // ============================================================================
    // 2. SEED TEST USERS
    // ============================================================================
    console.log('\n👥 Seeding test users...');
    
    for (const user of testUsers) {
      try {
        const existingUsers = await kcAdminClient.users.find({
          email: user.email,
          realm: KEYCLOAK_REALM,
        });

        if (existingUsers.length === 0) {
          await kcAdminClient.users.create({
            realm: KEYCLOAK_REALM,
            username: user.email,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            enabled: user.isActive !== false,
            emailVerified: true,
            credentials: [
              {
                type: 'password',
                value: user.password,
                temporary: false,
              },
            ],
            attributes: {
              role: [user.role],
            },
          });

          console.log(`  ✅ Created test user: ${user.email} (${user.role})`);
        } else {
          console.log(`  ⏭️  Skipped (exists): ${user.email}`);
        }
      } catch (error: any) {
        console.error(`  ❌ Failed to create ${user.email}:`, error.message);
      }
    }

    // ============================================================================
    // 3. SEED SERVICE ACCOUNTS
    // ============================================================================
    console.log('\n🔧 Seeding service accounts (OAuth2 clients)...');
    
    for (const service of serviceAccounts) {
      try {
        // Check if client exists
        const existingClients = await kcAdminClient.clients.find({
          clientId: service.clientId,
          realm: KEYCLOAK_REALM,
        });

        if (existingClients.length === 0) {
          await kcAdminClient.clients.create({
            realm: KEYCLOAK_REALM,
            clientId: service.clientId,
            secret: service.clientSecret,
            description: service.description,
            enabled: service.isActive !== false,
            serviceAccountsEnabled: true,
            standardFlowEnabled: false,
            directAccessGrantsEnabled: false,
            publicClient: false,
            protocol: 'openid-connect',
            attributes: {
              roles: service.roles.join(','),
            },
          });

          console.log(`  ✅ Created service account: ${service.clientId}`);
          console.log(`     Roles: ${service.roles.join(', ')}`);
        } else {
          console.log(`  ⏭️  Skipped (exists): ${service.clientId}`);
        }
      } catch (error: any) {
        console.error(`  ❌ Failed to create ${service.clientId}:`, error.message);
      }
    }

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('\n📊 Keycloak Seeding Summary:');
    console.log(`  ✅ Admin Users: ${adminUsers.length}`);
    console.log(`  ✅ Test Users: ${testUsers.length}`);
    console.log(`  ✅ Service Accounts: ${serviceAccounts.length}`);
    console.log('\n✨ Keycloak seeding complete!');
    console.log('\n📝 Login credentials:');
    console.log('  Admin users:');
    adminUsers.forEach(u => {
      console.log(`    - ${u.email} / ${u.password}`);
    });

  } catch (error) {
    console.error('❌ Keycloak seeding failed:', error);
    process.exit(1);
  }
}

main();
