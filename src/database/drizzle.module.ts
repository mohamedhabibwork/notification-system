import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE_ORM = Symbol('DRIZZLE_ORM');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_ORM,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('database.url');
        if (!databaseUrl) {
          throw new Error(
            'Database URL is required. Set database.url in configuration.',
          );
        }
        const poolMin = configService.get<number>('database.poolMin', 2);
        const poolMax = configService.get<number>('database.poolMax', 10);

        const queryClient = postgres(databaseUrl, {
          max: poolMax,
          idle_timeout: 20,
          max_lifetime: 60 * 30,
        });

        return drizzle(queryClient, { schema });
      },
    },
  ],
  exports: [DRIZZLE_ORM],
})
export class DrizzleModule {}

export type DrizzleDB = PostgresJsDatabase<typeof schema>;
