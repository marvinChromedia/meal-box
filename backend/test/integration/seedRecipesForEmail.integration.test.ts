import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { listRecipes } from '../../src/repositories/recipesRepository.js';
import { createUser } from '../../src/repositories/usersRepository.js';
import { DEFAULT_RECIPES } from '../../src/services/defaultRecipes.js';
import { UserNotFoundError, seedRecipesForEmail } from '../../src/services/seedRecipesForEmail.js';
import { createTestPool, truncateAll } from './testDb.js';

const pool = createTestPool();

beforeEach(async () => {
  await truncateAll(pool);
});

afterAll(async () => {
  await pool.end();
});

describe('seedRecipesForEmail (integration)', () => {
  it('backfills every default recipe for a real existing account (AC1)', async () => {
    const user = await createUser(pool, { email: 'backfill@example.com', passwordHash: 'not-a-real-hash' });

    const result = await seedRecipesForEmail(pool, user.email);

    expect(result.seeded.sort()).toEqual(DEFAULT_RECIPES.map((r) => r.title).sort());
    expect(result.alreadyPresent).toEqual([]);

    const recipes = await listRecipes(pool, user.id);
    expect(recipes.map((r) => r.title).sort()).toEqual(DEFAULT_RECIPES.map((r) => r.title).sort());
  });

  it('running it twice does not create duplicates (AC2)', async () => {
    const user = await createUser(pool, { email: 'rerun@example.com', passwordHash: 'not-a-real-hash' });

    await seedRecipesForEmail(pool, user.email);
    const second = await seedRecipesForEmail(pool, user.email);

    expect(second.seeded).toEqual([]);
    expect(second.alreadyPresent.sort()).toEqual(DEFAULT_RECIPES.map((r) => r.title).sort());

    const recipes = await listRecipes(pool, user.id);
    expect(recipes).toHaveLength(DEFAULT_RECIPES.length);
  });

  it('rejects an email with no matching account, without writing anything (AC3)', async () => {
    await expect(seedRecipesForEmail(pool, 'nobody@example.com')).rejects.toBeInstanceOf(UserNotFoundError);

    const { rows } = await pool.query('SELECT count(*)::int FROM recipes');
    expect(rows[0].count).toBe(0);
  });
});
