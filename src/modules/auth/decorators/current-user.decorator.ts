import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserContext {
  sub: string; // userId
  email?: string;
  preferred_username?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
  tenant_id?: string;
  user_type?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof UserContext | undefined,
    ctx: ExecutionContext,
  ): UserContext | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserContext;

    return data ? user?.[data] : user;
  },
);
