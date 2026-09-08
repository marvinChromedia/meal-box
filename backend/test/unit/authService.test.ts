import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DuplicateEmailError,
  InvalidCredentialsError,
  getUserForToken,
  login,
  register,
} from '../../src/services/authService.js';
import * as sessionsRepository from '../../src/repositories/sessionsRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';

vi.mock('../../src/repositories/usersRepository.js', () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock('../../src/repositories/sessionsRepository.js', () => ({
  createSession: vi.fn(),
  findActiveSessionByTokenHash: vi.fn(),
  deleteSessionByTokenHash: vi.fn(),
}));

const pool = {} as Pool;

const user = { id: 'u1', email: 'person@example.com', createdAt: '2026-01-01T00:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService.register', () => {
  it('creates a user when the email is not already registered', async () => {
    vi.mocked(usersRepository.findUserByEmail).mockResolvedValue(null);
    vi.mocked(usersRepository.createUser).mockResolvedValue(user);

    const created = await register(pool, { email: user.email, password: 'password123' });

    expect(created).toEqual(user);
    expect(usersRepository.createUser).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({ email: user.email }),
    );
  });

  it('never passes the plaintext password to the repository (AC1)', async () => {
    vi.mocked(usersRepository.findUserByEmail).mockResolvedValue(null);
    vi.mocked(usersRepository.createUser).mockResolvedValue(user);

    await register(pool, { email: user.email, password: 'password123' });

    const [, input] = vi.mocked(usersRepository.createUser).mock.calls[0]!;
    expect(input.passwordHash).not.toBe('password123');
  });

  it('rejects a duplicate email (AC2)', async () => {
    vi.mocked(usersRepository.findUserByEmail).mockResolvedValue({ user, passwordHash: 'x' });

    await expect(register(pool, { email: user.email, password: 'password123' })).rejects.toBeInstanceOf(
      DuplicateEmailError,
    );
    expect(usersRepository.createUser).not.toHaveBeenCalled();
  });
});

describe('authService.login', () => {
  it('rejects an unknown email with the generic error (AC4)', async () => {
    vi.mocked(usersRepository.findUserByEmail).mockResolvedValue(null);

    await expect(login(pool, { email: 'nobody@example.com', password: 'password123' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(sessionsRepository.createSession).not.toHaveBeenCalled();
  });

  it('rejects a wrong password with the same generic error (AC4)', async () => {
    const { hashPassword } = await import('../../src/auth/passwordHash.js');
    const passwordHash = await hashPassword('correct-password');
    vi.mocked(usersRepository.findUserByEmail).mockResolvedValue({ user, passwordHash });

    await expect(login(pool, { email: user.email, password: 'wrong-password' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('establishes a session for correct credentials', async () => {
    const { hashPassword } = await import('../../src/auth/passwordHash.js');
    const passwordHash = await hashPassword('correct-password');
    vi.mocked(usersRepository.findUserByEmail).mockResolvedValue({ user, passwordHash });
    vi.mocked(sessionsRepository.createSession).mockResolvedValue({
      tokenHash: 'irrelevant-in-return-value',
      expiresAt: new Date('2026-02-01T00:00:00.000Z'),
    });

    const result = await login(pool, { email: user.email, password: 'correct-password' });

    expect(result.user).toEqual(user);
    expect(result.session.token).toBeTruthy();
    expect(sessionsRepository.createSession).toHaveBeenCalledWith(pool, user.id, expect.any(String));
  });
});

describe('authService.getUserForToken', () => {
  it('returns null when there is no active session for the token', async () => {
    vi.mocked(sessionsRepository.findActiveSessionByTokenHash).mockResolvedValue(null);

    expect(await getUserForToken(pool, 'some-token')).toBeNull();
    expect(usersRepository.findUserById).not.toHaveBeenCalled();
  });

  it('returns the user for an active session', async () => {
    vi.mocked(sessionsRepository.findActiveSessionByTokenHash).mockResolvedValue({ userId: user.id });
    vi.mocked(usersRepository.findUserById).mockResolvedValue(user);

    expect(await getUserForToken(pool, 'some-token')).toEqual(user);
  });
});
