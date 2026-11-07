import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../filters/types/jwt-payload.type.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);