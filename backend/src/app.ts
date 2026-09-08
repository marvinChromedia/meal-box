import cors from 'cors';
import express from 'express';

import { pool } from './db.js';

export function createApp() {
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

  return app;
}
