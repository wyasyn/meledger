import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { createTestKeys, TEST_SUPABASE_URL, type TestKeys } from '../../test/jwt-helpers.js';
import type { AuthedRequest } from './auth-user.js';
import { supabaseJwtSettings } from './jwks.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

function contextFor(request: Partial<AuthedRequest>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SupabaseAuthGuard', () => {
  let keys: TestKeys;
  let guard: SupabaseAuthGuard;
  let reflector: Reflector;

  beforeAll(async () => {
    keys = await createTestKeys();
  });

  beforeEach(() => {
    reflector = new Reflector();
    guard = new SupabaseAuthGuard(reflector, keys.jwks, supabaseJwtSettings(TEST_SUPABASE_URL));
  });

  const withToken = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });

  it('accepts a valid token and attaches the user id', async () => {
    const request = withToken(await keys.sign({ sub: 'user-abc' })) as AuthedRequest;
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-abc' });
  });

  it('rejects a missing token', async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a non-bearer scheme', async () => {
    const token = await keys.sign();
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: `Basic ${token}` } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const token = await keys.sign({ exp: Math.floor(Date.now() / 1000) - 60 });
    await expect(guard.canActivate(contextFor(withToken(token)))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token from another issuer', async () => {
    const token = await keys.sign({ iss: 'https://other.supabase.co/auth/v1' });
    await expect(guard.canActivate(contextFor(withToken(token)))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token with the wrong audience', async () => {
    const token = await keys.sign({ aud: 'anon' });
    await expect(guard.canActivate(contextFor(withToken(token)))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token signed by a different key', async () => {
    const other = await createTestKeys();
    const token = await other.sign();
    await expect(guard.canActivate(contextFor(withToken(token)))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token without a subject', async () => {
    const token = await keys.sign({ sub: '' });
    await expect(guard.canActivate(contextFor(withToken(token)))).rejects.toThrow(
      'Token has no subject',
    );
  });

  it('lets @Public() routes through without a token', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(true);
  });
});
