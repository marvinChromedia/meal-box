import type { RecipeInput } from '@mealbox/shared';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createRecipe,
  deleteRecipe,
  getRecipeById,
  getRecipeOwnerId,
  listRecipes,
  updateRecipe,
} from '../../src/repositories/recipesRepository.js';
import { createUser } from '../../src/repositories/usersRepository.js';
import { createTestPool, truncateAll } from './testDb.js';

const pool = createTestPool();

let userId: string;

beforeEach(async () => {
  await truncateAll(pool);
  const user = await createUser(pool, { email: 'owner@example.com', passwordHash: 'not-a-real-hash' });
  userId = user.id;
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
    const created = await createRecipe(pool, sampleRecipe, userId);

    expect(created.title).toBe('Tomato Soup');
    expect(created.isFavorite).toBe(false);
    expect(created.ingredients).toHaveLength(2);

    const fetched = await getRecipeById(pool, created.id);
    expect(fetched).toEqual(created);
  });

  it('preserves ingredient order', async () => {
    const created = await createRecipe(pool, sampleRecipe, userId);
    expect(created.ingredients.map((i) => i.name)).toEqual(['Tomato', 'Onion']);
  });

  it('lists recipes that were written, for the owning user', async () => {
    await createRecipe(pool, sampleRecipe, userId);
    await createRecipe(pool, { ...sampleRecipe, title: 'Pancakes' }, userId);

    const recipes = await listRecipes(pool, userId);
    expect(recipes.map((r) => r.title).sort()).toEqual(['Pancakes', 'Tomato Soup']);
  });

  it("does not list another user's recipes", async () => {
    await createRecipe(pool, sampleRecipe, userId);
    const otherUser = await createUser(pool, { email: 'someone-else@example.com', passwordHash: 'not-a-real-hash' });

    const recipes = await listRecipes(pool, otherUser.id);
    expect(recipes).toEqual([]);
  });

  it('records the creating user as the owner', async () => {
    const created = await createRecipe(pool, sampleRecipe, userId);
    await expect(getRecipeOwnerId(pool, created.id)).resolves.toBe(userId);
  });

  it('getRecipeOwnerId returns null for an id that does not exist', async () => {
    await expect(
      getRecipeOwnerId(pool, '11111111-1111-1111-1111-111111111111'),
    ).resolves.toBeNull();
  });

  it('cascades: deleting a recipe removes its ingredient rows (AC2)', async () => {
    const created = await createRecipe(pool, sampleRecipe, userId);

    await deleteRecipe(pool, created.id);

    expect(await getRecipeById(pool, created.id)).toBeNull();
    const { rows } = await pool.query('SELECT * FROM recipe_ingredients WHERE recipe_id = $1', [
      created.id,
    ]);
    expect(rows).toHaveLength(0);
  });

  it('updates a recipe, replacing the ingredient set with no orphans left behind (AC3)', async () => {
    const created = await createRecipe(pool, sampleRecipe, userId);

    const updated = await updateRecipe(pool, created.id, {
      title: 'Tomato Soup (updated)',
      steps: [...sampleRecipe.steps, 'Season to taste'],
      tags: sampleRecipe.tags,
      ingredients: [{ name: 'Tomato', quantity: 6, unit: 'whole' }],
    });

    expect(updated?.title).toBe('Tomato Soup (updated)');
    expect(updated?.ingredients).toHaveLength(1);
    expect(updated?.ingredients[0]?.name).toBe('Tomato');

    const { rows } = await pool.query('SELECT * FROM recipe_ingredients WHERE recipe_id = $1', [
      created.id,
    ]);
    expect(rows).toHaveLength(1);
  });

  it('returns null updating an id that does not exist, without writing anything', async () => {
    const result = await updateRecipe(pool, '11111111-1111-1111-1111-111111111111', sampleRecipe);
    expect(result).toBeNull();
  });

  it('survives a fresh connection to the database (AC4)', async () => {
    const created = await createRecipe(pool, sampleRecipe, userId);

    const freshPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    try {
      const reread = await getRecipeById(freshPool, created.id);
      expect(reread).toEqual(created);
    } finally {
      await freshPool.end();
    }
  });
});
