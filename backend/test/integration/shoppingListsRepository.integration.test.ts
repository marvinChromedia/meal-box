import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createRecipe, deleteRecipe } from '../../src/repositories/recipesRepository.js';
import {
  createShoppingList,
  getShoppingListById,
} from '../../src/repositories/shoppingListsRepository.js';
import { createTestPool, truncateAll } from './testDb.js';

const pool = createTestPool();

beforeEach(async () => {
  await truncateAll(pool);
});

afterAll(async () => {
  await pool.end();
});

describe('shoppingListsRepository (integration)', () => {
  it('writes a shopping list through the repository and reads back the same shape (AC3)', async () => {
    const recipe = await createRecipe(pool, {
      title: 'Tomato Soup',
      steps: ['Simmer'],
      tags: [],
      ingredients: [{ name: 'Tomato', quantity: 4, unit: 'whole' }],
    });

    const created = await createShoppingList(pool, [
      { name: 'Tomato', quantity: 4, unit: 'whole', sourceRecipeIds: [recipe.id] },
      { name: 'Paper towels', quantity: 1, unit: 'pack' },
    ]);

    expect(created.items).toHaveLength(2);
    expect(created.items[0]).toMatchObject({ name: 'Tomato', sourceRecipeIds: [recipe.id] });
    expect(created.items[1]).toMatchObject({ name: 'Paper towels', sourceRecipeIds: [] });

    const fetched = await getShoppingListById(pool, created.id);
    expect(fetched).toEqual(created);
  });

  it('a manually added item keeps an empty sourceRecipeIds', async () => {
    const created = await createShoppingList(pool, [
      { name: 'Paper towels', quantity: 1, unit: 'pack' },
    ]);
    expect(created.items[0]!.sourceRecipeIds).toEqual([]);
  });

  it('still records the source recipe after that recipe is deleted (AC2)', async () => {
    const recipe = await createRecipe(pool, {
      title: 'Tomato Soup',
      steps: ['Simmer'],
      tags: [],
      ingredients: [{ name: 'Tomato', quantity: 4, unit: 'whole' }],
    });

    const list = await createShoppingList(pool, [
      { name: 'Tomato', quantity: 4, unit: 'whole', sourceRecipeIds: [recipe.id] },
    ]);

    await deleteRecipe(pool, recipe.id);

    const fetched = await getShoppingListById(pool, list.id);
    expect(fetched?.items[0]?.sourceRecipeIds).toEqual([recipe.id]);
  });
});
