import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import type { Env } from '../config/env.js';
import { JWKS, JWT_SETTINGS, remoteJwks, supabaseJwtSettings } from './jwks.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

@Module({
  providers: [
    {
      provide: JWT_SETTINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        supabaseJwtSettings(config.get('SUPABASE_URL', { infer: true })),
    },
    {
      provide: JWKS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url =
          config.get('SUPABASE_JWKS_URL', { infer: true }) ??
          `${config.get('SUPABASE_URL', { infer: true }).replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
        return remoteJwks(url);
      },
    },
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
  ],
})
export class AuthModule {}
