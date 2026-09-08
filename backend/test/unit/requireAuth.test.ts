import type { Request, Response } from 'express';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAuth } from '../../src/middleware/requireAuth.js';
import * as authService from '../../src/services/authService.js';

vi.mock('../../src/services/authService.js', () => ({
  getUserForToken: vi.fn(),
}));

function fakeReqRes(cookies: Record<string, string>) {
  const req = { cookies } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn();
  return { req, res, next };
}

const pool = {} as Pool;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireAuth', () => {
  it('responds 401 without querying the database when no session cookie is present (AC5)', async () => {
    const { req, res, next } = fakeReqRes({});
    const middleware = requireAuth(pool);

    await middleware(req, res, next);

    expect(authService.getUserForToken).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 and clears the cookie when the session token is invalid or expired', async () => {
    vi.mocked(authService.getUserForToken).mockResolvedValue(null);
    const { req, res, next } = fakeReqRes({ session_token: 'stale-token' });
    const middleware = requireAuth(pool);

    await middleware(req, res, next);

    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.user and calls next for a valid session', async () => {
    const user = { id: 'u1', email: 'a@example.com', createdAt: '2026-01-01T00:00:00.000Z' };
    vi.mocked(authService.getUserForToken).mockResolvedValue(user);
    const { req, res, next } = fakeReqRes({ session_token: 'good-token' });
    const middleware = requireAuth(pool);

    await middleware(req, res, next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
