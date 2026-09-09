import { randomUUID } from 'node:crypto';

import type { User } from '@mealbox/shared';
import { z } from 'zod';

import type { Queryable } from '../db/queryable.js';

const userRowSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  created_at: z.date(),
});

function mapRowToUser(row: z.infer<typeof userRowSchema>): User {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at.toISOString(),
  };
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export async function createUser(db: Queryable, input: CreateUserInput): Promise<User> {
  const id = randomUUID();
  const result = await db.query(
    `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)
     RETURNING id, email, created_at`,
    [id, input.email, input.passwordHash],
  );
  return mapRowToUser(userRowSchema.parse(result.rows[0]));
}

// Returns the password hash alongside the shared User shape so the auth
// service can verify credentials without a second query. Not exported as
// part of the public User type — callers outside auth must not see it.
const userWithPasswordHashRowSchema = userRowSchema.extend({
  password_hash: z.string(),
});

export interface UserWithPasswordHash {
  user: User;
  passwordHash: string;
}

export async function findUserByEmail(
  db: Queryable,
  email: string,
): Promise<UserWithPasswordHash | null> {
  const result = await db.query(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email],
  );
  const [row] = result.rows;
  if (!row) return null;
  const parsed = userWithPasswordHashRowSchema.parse(row);
  return { user: mapRowToUser(parsed), passwordHash: parsed.password_hash };
}

export async function findUserById(db: Queryable, id: string): Promise<User | null> {
  const result = await db.query('SELECT id, email, created_at FROM users WHERE id = $1', [id]);
  const [row] = result.rows;
  if (!row) return null;
  return mapRowToUser(userRowSchema.parse(row));
}
