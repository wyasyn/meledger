import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

/** Injects the user verified by SupabaseAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);
