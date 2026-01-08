import { Module, DynamicModule } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

/**
 * GraphQL Configuration Module (Optional)
 *
 * This module is disabled by default until GraphQL resolvers are implemented.
 * To enable: Set GRAPHQL_ENABLED=true in .env and uncomment in app.module.ts
 */
@Module({})
export class GraphqlConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: GraphqlConfigModule,
      imports: [
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
          driver: ApolloDriver,
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const enabled = configService.get<boolean>(
              'graphql.enabled',
              false,
            );

            if (!enabled) {
              // Return minimal config that won't initialize GraphQL
              return {
                autoSchemaFile: false,
                include: [],
              } as any;
            }

            return {
              autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
              sortSchema: true,
              playground: false,
              introspection: configService.get('NODE_ENV') !== 'production',
              context: ({ req, res }: any) => {
                // Extract tenant and user info from request
                const tenantId = req.headers['x-tenant-id']
                  ? parseInt(req.headers['x-tenant-id'], 10)
                  : req['tenantId'];

                const user = req['user'];

                return {
                  req,
                  res,
                  tenantId,
                  user,
                };
              },
              formatError: (error: any) => {
                return {
                  message: error.message,
                  code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
                  path: error.path,
                };
              },
              subscriptions: {
                'graphql-ws': {
                  onConnect: (context: any) => {
                    const { connectionParams } = context;
                    // Extract auth from connection params
                    return {
                      tenantId: connectionParams?.tenantId,
                      authorization: connectionParams?.authorization,
                    };
                  },
                },
              },
            };
          },
        }),
      ],
    };
  }
}
