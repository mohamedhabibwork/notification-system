import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/database/schema/*.schema.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://notification:notification@localhost:5432/notification_db',
  },
  verbose: true,
  strict: true,
  entities: {
    roles: true, // Enable role management for RLS
  },
});

