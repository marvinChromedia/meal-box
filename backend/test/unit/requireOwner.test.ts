import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { requireOwner } from '../../src/middleware/requireOwner.js';

function fakeReqRes(userId: string | undefined) {
  const req = { user: userId ? { id: userId } : undefined } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('requireOwner', () => {
  it('calls next when the resource owner matches the signed-in user', async () => {
    const { req, res, next } = fakeReqRes('user-1');
    const middleware = requireOwner(async () => 'user-1');

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 404, not 403, when the resource belongs to someone else (AC6)', async () => {
    const { req, res, next } = fakeReqRes('user-1');
    const middleware = requireOwner(async () => 'someone-elses-id');

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'not found', code: 'NOT_FOUND' } });
  });

  it('responds 404 when the resource does not exist at all', async () => {
    const { req, res, next } = fakeReqRes('user-1');
    const middleware = requireOwner(async () => null);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
