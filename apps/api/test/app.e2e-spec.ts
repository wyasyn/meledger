import type { Server } from 'node:http';

import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { type AuthUser, CurrentUser } from '../src/auth/auth-user.js';
import { JWKS, JWT_SETTINGS, supabaseJwtSettings } from '../src/auth/jwks.js';
import { createTestKeys, TEST_SUPABASE_URL, type TestKeys } from './jwt-helpers.js';

@Controller('test-protected')
class ProtectedController {
  @Get()
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

describe('API (e2e)', () => {
  let app: INestApplication<Server>;
  let keys: TestKeys;

  beforeAll(async () => {
    // Satisfies env validation when no apps/api/.env exists (e.g. CI).
    process.env.SUPABASE_URL ??= TEST_SUPABASE_URL;
    keys = await createTestKeys();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtectedController],
    })
      .overrideProvider(JWKS)
      .useValue(keys.jwks)
      .overrideProvider(JWT_SETTINGS)
      .useValue(supabaseJwtSettings(TEST_SUPABASE_URL))
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health is public', () =>
    request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok' }));

  it('protected route returns 401 with the shared error shape when no token is sent', () =>
    request(app.getHttpServer())
      .get('/api/test-protected')
      .expect(401)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'unauthorized', message: 'Missing bearer token' });
      }));

  it('protected route returns the user for a valid Supabase token', async () => {
    const token = await keys.sign({ sub: 'user-xyz' });
    await request(app.getHttpServer())
      .get('/api/test-protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ id: 'user-xyz' });
  });
});
