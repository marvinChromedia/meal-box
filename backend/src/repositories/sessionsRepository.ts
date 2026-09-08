import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import type { Queryable } from '../db/queryable.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const sessionRowSchema = z.object({
  user_id: z.string().uuid(),
  expires_at: z.date(),
});

export interface CreatedSession {
  tokenHash: string;
  expiresAt: Date;
}

export async function createSession(db: Queryable, userId: string, tokenHash: string): Promise<CreatedSession> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, tokenHash, expiresAt],
  );
  return { tokenHash, expiresAt };
}

export interface ActiveSession {
  userId: string;
}

export async function findActiveSessionByTokenHash(
  db: Queryable,
  tokenHash: string,
): Promise<ActiveSession | null> {
  const result = await db.query('SELECT user_id, expires_at FROM sessions WHERE token_hash = $1', [
    tokenHash,
  ]);
  const [row] = result.rows;
  if (!row) return null;

  const parsed = sessionRowSchema.parse(row);
  if (parsed.expires_at.getTime() <= Date.now()) return null;

  return { userId: parsed.user_id };
}

export async function deleteSessionByTokenHash(db: Queryable, tokenHash: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}
