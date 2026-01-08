import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ServiceContext {
  clientId: string;
  serviceName: string;
  azp?: string; // authorized party
  scope?: string;
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
  aud?: string | string[];
  exp?: number;
  iat?: number;
}

export const CurrentService = createParamDecorator(
  (
    data: keyof ServiceContext | undefined,
    ctx: ExecutionContext,
  ): ServiceContext | any => {
    const request = ctx.switchToHttp().getRequest();
    const service = request.service as ServiceContext;

    return data ? service?.[data] : service;
  },
);
