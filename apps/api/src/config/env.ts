import { z } from 'zod';

/** Treats empty strings from `.env` files as unset. */
const blankToUndefined = (v: unknown) => (v === '' ? undefined : v);
const optional = z.preprocess(blankToUndefined, z.string().optional());

export const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.url(),
  /** Defaults to `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`. */
  SUPABASE_JWKS_URL: z.preprocess(blankToUndefined, z.url().optional()),
  /** Server-only secret key (sb_secret_...); bypasses RLS. */
  SUPABASE_SECRET_KEY: optional,
  GOOGLE_GENERATIVE_AI_API_KEY: optional,
  AI_PARSE_MODEL: z.string().default('gemini-3.5-flash-lite'),
  AI_ADVISOR_MODEL: z.string().default('gemini-3.6-flash'),
  SUNBIRD_API_KEY: optional,
  DAILY_PARSE_QUOTA: z.coerce.number().int().positive().default(200),
  DAILY_ASK_QUOTA: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
