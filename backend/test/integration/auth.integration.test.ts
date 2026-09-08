import { randomUUID } from 'node:crypto';

import express from 'express';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { requireAuth } from '../../src/middleware/requireAuth.js';
import { requireOwner } from '../../src/middleware/requireOwner.js';
import { authRoutes } from '../../src/routes/authRoutes.js';
import { createTestPool, truncateAll } from './testDb.js';

const pool = createTestPool();

function buildTestApp(sharedPool: Pool) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes(sharedPool));

  // AC5/AC6 proof: this ticket ships requireAuth/requireOwner as the
  // reusable pieces TEST-72/76 must mount on their real recipe and
  // shopping-list routes, which don't exist yet. This one route stands in
  // for "any recipe endpoint" so the enforcement can be proven end-to-end
  // now rather than deferred until those tickets land.
  app.get(
    '/api/recipes/:id',
    requireAuth(sharedPool),
    requireOwner(async (req) => {
      const result = await sharedPool.query('SELECT user_id FROM recipes WHERE id = $1', [
        req.params.id,
      ]);
      return result.rows[0]?.user_id ?? null;
    }),
    (_req, res) => {
      res.status(200).json({ ok: true });
    },
  );

  return app;
}

const app = buildTestApp(pool);

beforeEach(async () => {
  await truncateAll(pool);
});

afterAll(async () => {
  await pool.end();
});

async function registerAndLogin(email: string, password = 'password123') {
  await request(app).post('/api/auth/register').send({ email, password }).expect(201);
  const loginRes = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  const cookie = loginRes.headers['set-cookie'];
  if (!cookie) throw new Error('login did not set a session cookie');
  return { cookie, userId: loginRes.body.user.id as string };
}

describe('auth (integration)', () => {
  it('registers a new account (AC1)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'person@example.com', password: 'password123' })
      .expect(201);

    expect(res.body.user.email).toBe('person@example.com');
    expect(res.body.user.password).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('password123');
  });

  it('rejects a duplicate email registration without revealing account details (AC2)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'taken@example.com', password: 'password123' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'taken@example.com', password: 'different-password' })
      .expect(409);

    expect(res.body).toEqual({
      error: { message: 'that email is already registered', code: 'EMAIL_TAKEN' },
    });
  });

  it('signs in with correct credentials and establishes a session (AC3)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'signin@example.com', password: 'password123' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'signin@example.com', password: 'password123' })
      .expect(200);

    expect(res.body.user.email).toBe('signin@example.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('signs out and invalidates the session (AC3)', async () => {
    const { cookie } = await registerAndLogin('signout@example.com');

    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(200);

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204);

    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
  });

  it('rejects a wrong password with a generic message (AC4)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'wrongpw@example.com', password: 'password123' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrongpw@example.com', password: 'not-the-password' })
      .expect(401);

    expect(res.body).toEqual({
      error: { message: 'incorrect email or password', code: 'INVALID_CREDENTIALS' },
    });
  });

  it('rejects an unknown email with the same generic message (AC4)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' })
      .expect(401);

    expect(res.body).toEqual({
      error: { message: 'incorrect email or password', code: 'INVALID_CREDENTIALS' },
    });
  });

  it('rejects an unauthenticated request to a protected route without touching the database (AC5)', async () => {
    const before = await pool.query('SELECT count(*)::int FROM sessions');

    const res = await request(app).get(`/api/recipes/${randomUUID()}`).expect(401);

    const after = await pool.query('SELECT count(*)::int FROM sessions');
    expect(res.body).toEqual({ error: { message: 'authentication required', code: 'UNAUTHENTICATED' } });
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  it('keeps accounts isolated: another account\'s record id returns 404, not 403 (AC6)', async () => {
    const owner = await registerAndLogin('owner@example.com');
    const other = await registerAndLogin('other@example.com');

    const recipeId = randomUUID();
    await pool.query(
      `INSERT INTO recipes (id, title, user_id) VALUES ($1, 'Owner Recipe', $2)`,
      [recipeId, owner.userId],
    );

    await request(app).get(`/api/recipes/${recipeId}`).set('Cookie', owner.cookie).expect(200);

    const res = await request(app)
      .get(`/api/recipes/${recipeId}`)
      .set('Cookie', other.cookie)
      .expect(404);
    expect(res.body).toEqual({ error: { message: 'not found', code: 'NOT_FOUND' } });
  });

  it('returns 404 for a record that does not exist at all (AC6)', async () => {
    const { cookie } = await registerAndLogin('lonely@example.com');

    await request(app).get(`/api/recipes/${randomUUID()}`).set('Cookie', cookie).expect(404);
  });

  it('stays signed in across a fresh request with the same cookie, simulating a reload (AC7)', async () => {
    const { cookie } = await registerAndLogin('reload@example.com');

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie).expect(200);
    expect(res.body.user.email).toBe('reload@example.com');
  });
});
