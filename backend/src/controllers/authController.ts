import type { AuthCredentials } from '@mealbox/shared';
import type { Request, Response } from 'express';
import type { Pool } from 'pg';

import { clearSessionCookie, setSessionCookie, SESSION_COOKIE_NAME } from '../auth/cookie.js';
import { sendError } from '../http/errors.js';
import { DuplicateEmailError, InvalidCredentialsError, login, logout, register } from '../services/authService.js';

export function createAuthController(pool: Pool) {
  return {
    async register(req: Request<object, unknown, AuthCredentials>, res: Response): Promise<void> {
      try {
        const user = await register(pool, req.body);
        res.status(201).json({ user });
      } catch (error) {
        if (error instanceof DuplicateEmailError) {
          sendError(res, 409, 'that email is already registered', 'EMAIL_TAKEN');
          return;
        }
        throw error;
      }
    },

    async login(req: Request<object, unknown, AuthCredentials>, res: Response): Promise<void> {
      try {
        const { user, session } = await login(pool, req.body);
        setSessionCookie(res, session.token, session.expiresAt);
        res.status(200).json({ user });
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          // AC4: identical message whether the email is unknown or the
          // password is wrong — never reveal which.
          sendError(res, 401, 'incorrect email or password', 'INVALID_CREDENTIALS');
          return;
        }
        throw error;
      }
    },

    async logout(req: Request, res: Response): Promise<void> {
      const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];
      if (typeof token === 'string' && token.length > 0) {
        await logout(pool, token);
      }
      clearSessionCookie(res);
      res.status(204).end();
    },

    me(req: Request, res: Response): void {
      // Mounted behind requireAuth, so req.user is always set here.
      res.status(200).json({ user: req.user });
    },
  };
}
