import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';

import { getUserForToken } from '../services/authService.js';
import { SESSION_COOKIE_NAME, clearSessionCookie } from '../auth/cookie.js';
import { sendError } from '../http/errors.js';

// AC5: rejects unauthenticated requests without touching the database. A
// missing cookie short-circuits before any query runs; only a present cookie
// causes a session lookup.
export function requireAuth(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof token !== 'string' || token.length === 0) {
      sendError(res, 401, 'authentication required', 'UNAUTHENTICATED');
      return;
    }

    const user = await getUserForToken(pool, token);
    if (!user) {
      clearSessionCookie(res);
      sendError(res, 401, 'authentication required', 'UNAUTHENTICATED');
      return;
    }

    req.user = user;
    next();
  };
}
