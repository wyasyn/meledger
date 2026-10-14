import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from 'jose';

export const TEST_SUPABASE_URL = 'https://test-project.supabase.co';
export const TEST_ISSUER = `${TEST_SUPABASE_URL}/auth/v1`;

export interface TestKeys {
  jwks: JWTVerifyGetKey;
  sign: (claims?: {
    sub?: string;
    iss?: string;
    aud?: string;
    exp?: string | number;
  }) => Promise<string>;
}

/** Generates a local ES256 key pair, standing in for the Supabase project's signing key. */
export async function createTestKeys(): Promise<TestKeys> {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'ES256' };
  const jwks = createLocalJWKSet({ keys: [jwk] });

  const sign: TestKeys['sign'] = async (claims = {}) => {
    const jwt = new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuedAt()
      .setIssuer(claims.iss ?? TEST_ISSUER)
      .setAudience(claims.aud ?? 'authenticated')
      .setExpirationTime(claims.exp ?? '1h');
    if (claims.sub !== '') jwt.setSubject(claims.sub ?? 'user-123');
    return jwt.sign(privateKey);
  };

  return { jwks, sign };
}
