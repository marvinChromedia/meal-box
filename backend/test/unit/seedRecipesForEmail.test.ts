import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_RECIPES } from '../../src/services/defaultRecipes.js';
import { UserNotFoundError, seedRecipesForEmail } from '../../src/services/seedRecipesForEmail.js';
import * as recipesRepository from '../../src/repositories/recipesRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';

vi.mock('../../src/repositories/recipesRepository.js', () => ({
  createRecipe: vi.fn(),
  listRecipes: vi.fn(),
}));

vi.mock('../../src/repositories/usersRepository.js', () => ({
  findUserByEmail: vi.fn(),
}));

const pool = {} as Pool;

const user = { id: 'u1', email: 'person@example.com', createdAt: '2026-01-01T00:00:00.000Z' };

function recipe(title: string) {
  return {
    id: 'r-' + title,
    title,
    ingredients: [],
    steps: [],
    tags: [],
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('seedRecipesForEmail', () => {
  it('throws UserNotFoundError for an email with no account, and writes nothing (AC3)', async () => {
    vi.mocked(usersRepository.findUserByEmail).mockResolvedValue(null);

    await expect(seedRecipesForEmail(pool, 'nobody@example.com')).rejects.toBeInstanceOf(UserNotFoundError);
    expect(recipesRepository.createRecipe).not.toHaveBeenCalled();
  });

  it('seeds every default recipe for an account that has none of them (AC1)', async () => {
    vi.mocked(usersRepository.findUserByEmail).mockResolvedValue({ user, passwordHash: 'x' });
    vi.mocked(recipesRepository.listRecipes).mockResolvedValue([]);

    const result = await seedRecipesForEmail(pool, user.email);

    expect(recipesRepository.createRecipe).toHaveBeenCalledTimes(DEFAULT_RECIPES.length);
    for (const defaultRecipe of DEFAULT_RECIPES) {
      expect(recipesRepository.createRecipe).toHaveBeenCalledWith(pool, defaultRecipe, user.id);
    }
    expect(result.seeded.sort()).toEqual(DEFAULT_RECIPES.map((r) => r.title).sort());
    expect(result.alreadyPresent).toEqual([]);
  });

  it('only creates the titles not already present, and reports both lists (AC2)', async () => {
    const alreadyThere = DEFAULT_RECIPES[0]!;
    vi.mocked(usersRepository.findUserByEmail).mockResolvedValue({ user, passwordHash: 'x' });
    vi.mocked(recipesRepository.listRecipes).mockResolvedValue([recipe(alreadyThere.title)]);

    const result = await seedRecipesForEmail(pool, user.email);

    expect(recipesRepository.createRecipe).toHaveBeenCalledTimes(DEFAULT_RECIPES.length - 1);
    expect(recipesRepository.createRecipe).not.toHaveBeenCalledWith(pool, alreadyThere, user.id);
    expect(result.alreadyPresent).toEqual([alreadyThere.title]);
    expect(result.seeded).not.toContain(alreadyThere.title);
  });

  it('creates nothing and reports every title as already present when they all exist (AC2)', async () => {
    vi.mocked(usersRepository.findUserByEmail).mockResolvedValue({ user, passwordHash: 'x' });
    vi.mocked(recipesRepository.listRecipes).mockResolvedValue(DEFAULT_RECIPES.map((r) => recipe(r.title)));

    const result = await seedRecipesForEmail(pool, user.email);

    expect(recipesRepository.createRecipe).not.toHaveBeenCalled();
    expect(result.seeded).toEqual([]);
    expect(result.alreadyPresent.sort()).toEqual(DEFAULT_RECIPES.map((r) => r.title).sort());
  });
});
