import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as recipesRepository from '../../src/repositories/recipesRepository.js';
import * as recipesService from '../../src/services/recipesService.js';

vi.mock('../../src/repositories/recipesRepository.js');

const pool = {} as Pool;

const sampleInput = {
  title: 'Tomato Soup',
  steps: ['Chop', 'Simmer'],
  tags: ['soup'],
  ingredients: [{ name: 'Tomato', quantity: 4, unit: 'whole' }],
};

const sampleRecipe = {
  id: 'r1',
  title: 'Tomato Soup',
  steps: ['Chop', 'Simmer'],
  tags: ['soup'],
  ingredients: [{ id: 'i1', name: 'Tomato', quantity: 4, unit: 'whole' }],
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('recipesService', () => {
  it('createRecipe delegates to the repository and returns its result', async () => {
    vi.mocked(recipesRepository.createRecipe).mockResolvedValue(sampleRecipe);

    const result = await recipesService.createRecipe(pool, sampleInput);

    expect(recipesRepository.createRecipe).toHaveBeenCalledWith(pool, sampleInput);
    expect(result).toEqual(sampleRecipe);
  });

  it('listRecipes delegates to the repository', async () => {
    vi.mocked(recipesRepository.listRecipes).mockResolvedValue([sampleRecipe]);

    const result = await recipesService.listRecipes(pool);

    expect(recipesRepository.listRecipes).toHaveBeenCalledWith(pool);
    expect(result).toEqual([sampleRecipe]);
  });

  it('getRecipe returns the repository result, including null for a missing id', async () => {
    vi.mocked(recipesRepository.getRecipeById).mockResolvedValue(null);

    const result = await recipesService.getRecipe(pool, 'missing-id');

    expect(recipesRepository.getRecipeById).toHaveBeenCalledWith(pool, 'missing-id');
    expect(result).toBeNull();
  });

  it('updateRecipe delegates to the repository, including null for a missing id', async () => {
    vi.mocked(recipesRepository.updateRecipe).mockResolvedValue(null);

    const result = await recipesService.updateRecipe(pool, 'missing-id', sampleInput);

    expect(recipesRepository.updateRecipe).toHaveBeenCalledWith(pool, 'missing-id', sampleInput);
    expect(result).toBeNull();
  });

  it('deleteRecipe returns false when the repository reports no row deleted', async () => {
    vi.mocked(recipesRepository.deleteRecipe).mockResolvedValue(false);

    const result = await recipesService.deleteRecipe(pool, 'missing-id');

    expect(recipesRepository.deleteRecipe).toHaveBeenCalledWith(pool, 'missing-id');
    expect(result).toBe(false);
  });

  it('deleteRecipe returns true when a row was deleted', async () => {
    vi.mocked(recipesRepository.deleteRecipe).mockResolvedValue(true);

    const result = await recipesService.deleteRecipe(pool, sampleRecipe.id);

    expect(result).toBe(true);
  });
});
