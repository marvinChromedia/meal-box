import { describe, expect, it } from 'vitest';

import { generateSessionToken, hashSessionToken } from '../../src/auth/sessionToken.js';

describe('sessionToken', () => {
  it('generates a high-entropy, unique token each call', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it('hashes a token deterministically', () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it('produces a hash that does not reveal the token', () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).not.toBe(token);
  });

  it('hashes different tokens to different values', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(hashSessionToken(a)).not.toBe(hashSessionToken(b));
  });
});
