import type { RecipeInput } from '@recipe-box/shared';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createRecipe,
  deleteRecipe,
  getRecipeById,
  listRecipes,
} from '../../src/repositories/recipesRepository.js';
import { createTestPool, truncateAll } from './testDb.js';

const pool = createTestPool();

beforeEach(async () => {
  await truncateAll(pool);
});

afterAll(async () => {
  await pool.end();
});

const sampleRecipe: RecipeInput = {
  title: 'Tomato Soup',
  steps: ['Chop tomatoes', 'Simmer'],
  tags: ['soup', 'vegetarian'],
  ingredients: [
    { name: 'Tomato', quantity: 4, unit: 'whole' },
    { name: 'Onion', quantity: 1, unit: 'whole' },
  ],
};

describe('recipesRepository (integration)', () => {
  it('writes a recipe through the repository and reads back the same shape (AC3)', async () => {
    const created = await createRecipe(pool, sampleRecipe);

    expect(created.title).toBe('Tomato Soup');
    expect(created.isFavorite).toBe(false);
    expect(created.ingredients).toHaveLength(2);

    const fetched = await getRecipeById(pool, created.id);
    expect(fetched).toEqual(created);
  });

  it('preserves ingredient order', async () => {
    const created = await createRecipe(pool, sampleRecipe);
    expect(created.ingredients.map((i) => i.name)).toEqual(['Tomato', 'Onion']);
  });

  it('lists recipes that were written', async () => {
    await createRecipe(pool, sampleRecipe);
    await createRecipe(pool, { ...sampleRecipe, title: 'Pancakes' });

    const recipes = await listRecipes(pool);
    expect(recipes.map((r) => r.title).sort()).toEqual(['Pancakes', 'Tomato Soup']);
  });

  it('cascades: deleting a recipe removes its ingredient rows (AC2)', async () => {
    const created = await createRecipe(pool, sampleRecipe);

    await deleteRecipe(pool, created.id);

    expect(await getRecipeById(pool, created.id)).toBeNull();
    const { rows } = await pool.query('SELECT * FROM recipe_ingredients WHERE recipe_id = $1', [
      created.id,
    ]);
    expect(rows).toHaveLength(0);
  });

  it('survives a fresh connection to the database (AC4)', async () => {
    const created = await createRecipe(pool, sampleRecipe);

    const freshPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    try {
      const reread = await getRecipeById(freshPool, created.id);
      expect(reread).toEqual(created);
    } finally {
      await freshPool.end();
    }
  });
});
