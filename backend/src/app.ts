import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';

import { pool as defaultPool } from './db.js';
import { createRecipesRouter } from './routes/recipesRoutes.js';

export function createApp(pool: Pool = defaultPool) {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    }),
  );
  app.use(express.json());

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

  app.use('/api/recipes', createRecipesRouter(pool));

  // Catches anything an async route handler forwarded via next(err) — keeps
  // the { error: { message, code } } shape instead of leaking a stack trace.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next; // Express identifies error middleware by arity (4 params) — this one is unused.
    console.error('unhandled request error', err);
    res.status(500).json({ error: { message: 'internal server error', code: 'INTERNAL_ERROR' } });
  });

  return app;
}
