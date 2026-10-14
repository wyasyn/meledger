import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';

/** Injection token for the key resolver, so tests can swap in a local key set. */
export const JWKS = Symbol('JWKS');

export interface JwtSettings {
  issuer: string;
  audience: string;
}

export const JWT_SETTINGS = Symbol('JWT_SETTINGS');

export function supabaseJwtSettings(supabaseUrl: string): JwtSettings {
  return { issuer: `${supabaseUrl.replace(/\/$/, '')}/auth/v1`, audience: 'authenticated' };
}

export function remoteJwks(url: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(url));
}
