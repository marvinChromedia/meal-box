import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { authRoutes } from '../../src/routes/authRoutes.js';
import { authResponseSchema, errorResponseSchema } from '../../src/schemas/authSchemas.js';
import { createTestPool, truncateAll } from '../integration/testDb.js';

const pool = createTestPool();

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes(pool));
  return app;
}

const app = buildApp();

beforeEach(async () => {
  await truncateAll(pool);
});

afterAll(async () => {
  await pool.end();
});

describe('auth API contract', () => {
  it('a successful register response matches the boundary schema, with no password field of any kind (AC1)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'shape@example.com', password: 'password123' })
      .expect(201);

    // .strict() schemas reject unknown keys, so a leaked password/passwordHash
    // field would fail this parse rather than merely being un-asserted.
    expect(() => authResponseSchema.parse(res.body)).not.toThrow();
  });

  it('a successful login response matches the boundary schema, with no password field of any kind (AC1)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'shape2@example.com', password: 'password123' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'shape2@example.com', password: 'password123' })
      .expect(200);

    expect(() => authResponseSchema.parse(res.body)).not.toThrow();
  });

  it('a duplicate-email error response matches the standard error shape', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dupe@example.com', password: 'password123' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dupe@example.com', password: 'password123' })
      .expect(409);

    expect(() => errorResponseSchema.parse(res.body)).not.toThrow();
  });

  it('an invalid-input error response matches the standard error shape', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email' }).expect(400);

    expect(() => errorResponseSchema.parse(res.body)).not.toThrow();
  });

  it('a wrong-credentials error response matches the standard error shape', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' })
      .expect(401);

    expect(() => errorResponseSchema.parse(res.body)).not.toThrow();
  });

  it('an unauthenticated /me error response matches the standard error shape', async () => {
    const res = await request(app).get('/api/auth/me').expect(401);

    expect(() => errorResponseSchema.parse(res.body)).not.toThrow();
  });
});
