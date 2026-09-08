import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';

import { pool as defaultPool } from './db.js';
import { sendError } from './http/errors.js';
import { requireAuth } from './middleware/requireAuth.js';
import { authRoutes } from './routes/authRoutes.js';
import { createRecipesRouter } from './routes/recipesRoutes.js';
import { createShoppingListRouter } from './routes/shoppingListRoutes.js';

export function createApp(pool: Pool = defaultPool) {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/health/db', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch (error) {
      console.error('database health check failed', error);
      res.status(503).json({
        error: { message: 'database unreachable', code: 'DB_UNAVAILABLE' },
      });
    }
  });

  app.use('/api/auth', authRoutes(pool));

  // Every recipe and shopping-list route sits behind auth (AC5). Per-record
  // ownership (AC6) is a separate concern each route applies with requireOwner.
  app.use('/api/recipes', requireAuth(pool), createRecipesRouter(pool));
  app.use('/api/shopping-list', requireAuth(pool), createShoppingListRouter(pool));

  // Catches anything an async route handler forwarded via next(err) — keeps
  // the { error: { message, code } } shape instead of leaking a stack trace.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('unhandled request error', error);
    sendError(res, 500, 'internal server error', 'INTERNAL_ERROR');
  });

  return app;
}
