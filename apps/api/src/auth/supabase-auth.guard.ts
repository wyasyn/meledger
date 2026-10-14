import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiError } from '@meledger/shared';
import { jwtVerify, type JWTVerifyGetKey } from 'jose';

import type { AuthedRequest } from './auth-user.js';
import { JWKS, JWT_SETTINGS, type JwtSettings } from './jwks.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

const unauthorized = (message: string) =>
  new UnauthorizedException({ code: 'unauthorized', message } satisfies ApiError);

/**
 * Verifies the Supabase access token in `Authorization: Bearer <token>` against the
 * project's JWKS. Supabase Auth owns all users; this guard never issues tokens.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(JWKS) private readonly jwks: JWTVerifyGetKey,
    @Inject(JWT_SETTINGS) private readonly settings: JwtSettings,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw unauthorized('Missing bearer token');

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.settings.issuer,
        audience: this.settings.audience,
      });
      if (!payload.sub) throw unauthorized('Token has no subject');
      request.user = { id: payload.sub };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw unauthorized('Invalid or expired token');
    }
  }
}
