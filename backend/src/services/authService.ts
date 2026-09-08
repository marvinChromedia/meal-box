import type { AuthCredentials, User } from '@recipe-box/shared';
import type { Pool } from 'pg';

import { hashPassword, verifyPassword } from '../auth/passwordHash.js';
import { generateSessionToken, hashSessionToken } from '../auth/sessionToken.js';
import { createRecipe } from '../repositories/recipesRepository.js';
import { createSession, deleteSessionByTokenHash, findActiveSessionByTokenHash } from '../repositories/sessionsRepository.js';
import { createUser, findUserByEmail, findUserById } from '../repositories/usersRepository.js';
import { DEFAULT_RECIPES } from './defaultRecipes.js';

export class DuplicateEmailError extends Error {}
export class InvalidCredentialsError extends Error {}

// A hash of a password nobody will ever type, used to keep verifyPassword's
// runtime similar whether or not the email exists — otherwise a fast
// "unknown email" path versus a slow "wrong password" path leaks which
// emails are registered through response timing (AC4).
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeOxRy/BJHhY9y0iP5T6Wc6qC.WgWa1s0O';

export interface Session {
  token: string;
  expiresAt: Date;
}

export async function register(pool: Pool, credentials: AuthCredentials): Promise<User> {
  const existing = await findUserByEmail(pool, credentials.email);
  if (existing) {
    throw new DuplicateEmailError();
  }

  const passwordHash = await hashPassword(credentials.password);
  let user: User;
  try {
    user = await createUser(pool, { email: credentials.email, passwordHash });
  } catch (error) {
    // Belt-and-braces against a race between the check above and the insert:
    // the unique index on users.email is the real guarantee (23505 = unique_violation).
    if (isUniqueViolation(error)) {
      throw new DuplicateEmailError();
    }
    throw error;
  }

  await seedDefaultRecipes(pool, user.id);
  return user;
}

// TEST-254: best-effort — a new account is real and usable the moment it's
// created; a failure here is logged, not thrown, so a seeding hiccup can
// never turn into a failed registration.
async function seedDefaultRecipes(pool: Pool, userId: string): Promise<void> {
  try {
    await Promise.all(DEFAULT_RECIPES.map((recipe) => createRecipe(pool, recipe, userId)));
  } catch (error) {
    console.error(`failed to seed default recipes for user ${userId}`, error);
  }
}

export async function login(
  pool: Pool,
  credentials: AuthCredentials,
): Promise<{ user: User; session: Session }> {
  const found = await findUserByEmail(pool, credentials.email);

  const passwordMatches = await verifyPassword(
    credentials.password,
    found?.passwordHash ?? DUMMY_HASH,
  );
  if (!found || !passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const token = generateSessionToken();
  const created = await createSession(pool, found.user.id, hashSessionToken(token));

  return { user: found.user, session: { token, expiresAt: created.expiresAt } };
}

export async function logout(pool: Pool, token: string): Promise<void> {
  await deleteSessionByTokenHash(pool, hashSessionToken(token));
}

export async function getUserForToken(pool: Pool, token: string): Promise<User | null> {
  const session = await findActiveSessionByTokenHash(pool, hashSessionToken(token));
  if (!session) return null;
  return findUserById(pool, session.userId);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
