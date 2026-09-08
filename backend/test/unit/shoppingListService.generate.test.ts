import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as recipesRepository from '../../src/repositories/recipesRepository.js';
import * as shoppingListsRepository from '../../src/repositories/shoppingListsRepository.js';
import * as shoppingListService from '../../src/services/shoppingListService.js';

vi.mock('../../src/repositories/recipesRepository.js');
vi.mock('../../src/repositories/shoppingListsRepository.js');

const pool = {} as Pool;

const sampleRecipe = {
  id: 'r1',
  title: 'Tomato Soup',
  steps: ['Simmer'],
  tags: [],
  ingredients: [{ id: 'i1', name: 'Onion', quantity: 1, unit: 'whole' }],
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const sampleList = {
  id: 'list-1',
  items: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('generateShoppingList', () => {
  it('AC6: returns null without writing anything when a recipe id does not exist', async () => {
    vi.mocked(recipesRepository.getRecipeById).mockResolvedValue(null);

    const result = await shoppingListService.generateShoppingList(pool, { recipeIds: ['missing'] });

    expect(result).toBeNull();
    expect(shoppingListsRepository.getCurrentShoppingListForMerge).not.toHaveBeenCalled();
    expect(shoppingListsRepository.applyShoppingListMerge).not.toHaveBeenCalled();
  });

  it('deduplicates a repeated recipe id before fetching and aggregating', async () => {
    vi.mocked(recipesRepository.getRecipeById).mockResolvedValue(sampleRecipe);
    vi.mocked(shoppingListsRepository.getCurrentShoppingListForMerge).mockResolvedValue(null);
    vi.mocked(shoppingListsRepository.applyShoppingListMerge).mockResolvedValue(sampleList);

    await shoppingListService.generateShoppingList(pool, { recipeIds: ['r1', 'r1'] });

    expect(recipesRepository.getRecipeById).toHaveBeenCalledTimes(1);
  });

  it('bootstraps a new list (listId null) when none exists yet, and persists the merge result', async () => {
    vi.mocked(recipesRepository.getRecipeById).mockResolvedValue(sampleRecipe);
    vi.mocked(shoppingListsRepository.getCurrentShoppingListForMerge).mockResolvedValue(null);
    vi.mocked(shoppingListsRepository.applyShoppingListMerge).mockResolvedValue(sampleList);

    const result = await shoppingListService.generateShoppingList(pool, { recipeIds: ['r1'] });

    expect(shoppingListsRepository.applyShoppingListMerge).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({
        listId: null,
        upserts: [expect.objectContaining({ name: 'Onion', quantity: 1, sourceRecipeIds: ['r1'] })],
        deletions: [],
      }),
    );
    expect(result).toEqual(sampleList);
  });

  it('merges into the existing list id when one already exists', async () => {
    vi.mocked(recipesRepository.getRecipeById).mockResolvedValue(sampleRecipe);
    vi.mocked(shoppingListsRepository.getCurrentShoppingListForMerge).mockResolvedValue({
      id: 'existing-list',
      items: [],
    });
    vi.mocked(shoppingListsRepository.applyShoppingListMerge).mockResolvedValue(sampleList);

    await shoppingListService.generateShoppingList(pool, { recipeIds: ['r1'] });

    expect(shoppingListsRepository.applyShoppingListMerge).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({ listId: 'existing-list' }),
    );
  });
});

describe('getCurrentShoppingList', () => {
  it('delegates to the repository', async () => {
    vi.mocked(shoppingListsRepository.getCurrentShoppingList).mockResolvedValue(sampleList);

    const result = await shoppingListService.getCurrentShoppingList(pool);

    expect(shoppingListsRepository.getCurrentShoppingList).toHaveBeenCalledWith(pool);
    expect(result).toEqual(sampleList);
  });
});
