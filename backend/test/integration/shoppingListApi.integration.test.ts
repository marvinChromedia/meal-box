import type { Recipe, RecipeInput } from '@recipe-box/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { createTestPool, truncateAll } from './testDb.js';

const pool = createTestPool();
const app = createApp(pool);

beforeEach(async () => {
  await truncateAll(pool);
});

afterAll(async () => {
  await pool.end();
});

async function createRecipe(input: RecipeInput): Promise<Recipe> {
  const res = await request(app).post('/api/recipes').send(input);
  return res.body as Recipe;
}

const onionSoup: RecipeInput = {
  title: 'Onion Soup',
  steps: ['Simmer'],
  tags: [],
  ingredients: [{ name: 'Onion', quantity: 1, unit: 'whole' }],
};

const onionTart: RecipeInput = {
  title: 'Onion Tart',
  steps: ['Bake'],
  tags: [],
  ingredients: [{ name: 'Onion', quantity: 1, unit: 'whole' }],
};

describe('POST /api/shopping-list (AC1, AC5)', () => {
  it('AC1 worked example: two recipes each needing 1 onion produce one line item with quantity 2', async () => {
    const r1 = await createRecipe(onionSoup);
    const r2 = await createRecipe(onionTart);

    const res = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id, r2.id] });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ name: 'Onion', quantity: 2, checked: false });
    // AC3
    expect(res.body.items[0].sourceRecipeIds.sort()).toEqual([r1.id, r2.id].sort());
  });

  it('AC2: distinct ingredient names stay as separate line items', async () => {
    const r1 = await createRecipe({
      title: 'Salad',
      steps: ['Toss'],
      tags: [],
      ingredients: [
        { name: 'Lettuce', quantity: 1, unit: 'head' },
        { name: 'Tomato', quantity: 2, unit: 'whole' },
      ],
    });

    const res = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });

    expect(res.body.items).toHaveLength(2);
    expect(res.body.items.map((i: { name: string }) => i.name).sort()).toEqual([
      'Lettuce',
      'Tomato',
    ]);
  });

  it('AC5: generates, persists, and reads back matching the ShoppingList shape', async () => {
    const r1 = await createRecipe(onionSoup);

    const generateRes = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });
    expect(generateRes.status).toBe(200);
    expect(generateRes.body.id).toEqual(expect.any(String));
    expect(generateRes.body.createdAt).toEqual(expect.any(String));

    const readRes = await request(app).get('/api/shopping-list');
    expect(readRes.status).toBe(200);
    expect(readRes.body).toEqual(generateRes.body);
  });
});

describe('AC6: degenerate input', () => {
  it('an empty selection is a well-formed (empty, on first generation) list, not an error', async () => {
    const res = await request(app).post('/api/shopping-list/generate').send({ recipeIds: [] });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('a single recipe generates correctly', async () => {
    const r1 = await createRecipe(onionSoup);
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('a nonexistent recipe id returns 404, not a crash or a half-written list', async () => {
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: ['11111111-1111-1111-1111-111111111111'] });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: expect.any(String), code: 'RECIPE_NOT_FOUND' } });

    const readRes = await request(app).get('/api/shopping-list');
    expect(readRes.status).toBe(404);
  });

  it('rejects a malformed body with 400 before touching the database', async () => {
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: ['not-a-uuid'] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: expect.any(String), code: 'VALIDATION_ERROR' } });
  });
});

describe('GET /api/shopping-list', () => {
  it('returns 404 before any list has ever been generated', async () => {
    const res = await request(app).get('/api/shopping-list');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { message: expect.any(String), code: 'SHOPPING_LIST_NOT_FOUND' },
    });
  });
});

describe('Regeneration merges into the existing list (binding decision on TEST-76)', () => {
  it('rule 1: a non-edited item is freely recalculated on regeneration', async () => {
    const r1 = await createRecipe(onionSoup);
    const first = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });
    expect(first.body.items[0].quantity).toBe(1);

    const r2 = await createRecipe(onionTart);
    const second = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id, r2.id] });

    expect(second.body.id).toBe(first.body.id); // same list, not a new one
    expect(second.body.items).toHaveLength(1);
    expect(second.body.items[0].quantity).toBe(2);
  });

  it('rule 2: a hand-edited quantity survives regeneration, but sourceRecipeIds still refreshes', async () => {
    const r1 = await createRecipe(onionSoup);
    const first = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });
    const itemId = first.body.items[0].id as string;

    // TEST-154 owns the actual edit endpoint; simulate what it will do — set the
    // quantity and the persisted quantity_edited flag directly.
    await pool.query(
      'UPDATE shopping_list_items SET quantity = $1, quantity_edited = true WHERE id = $2',
      [99, itemId],
    );

    const r2 = await createRecipe(onionTart);
    const second = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id, r2.id] });

    expect(second.body.items).toHaveLength(1);
    expect(second.body.items[0].id).toBe(itemId);
    expect(second.body.items[0].quantity).toBe(99); // untouched
    expect(second.body.items[0].sourceRecipeIds.sort()).toEqual([r1.id, r2.id].sort()); // refreshed
  });

  it('rule 3: a manually added item is never touched by regeneration', async () => {
    // No manual-add endpoint exists yet (TEST-77) — seed one directly, matching
    // the shared-types convention that empty sourceRecipeIds means "manual".
    const first = await request(app).post('/api/shopping-list/generate').send({ recipeIds: [] });
    const listId = first.body.id as string;
    await pool.query(
      `INSERT INTO shopping_list_items (id, shopping_list_id, name, quantity, unit, checked, position)
       VALUES (gen_random_uuid(), $1, 'Paper towels', 1, 'pack', false, 0)`,
      [listId],
    );

    const r1 = await createRecipe(onionSoup);
    const second = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });

    const manual = second.body.items.find((i: { name: string }) => i.name === 'Paper towels');
    expect(manual).toBeDefined();
    expect(manual.sourceRecipeIds).toEqual([]);
    expect(second.body.items).toHaveLength(2); // manual item + the generated onion
  });

  it('rule 4: checked state survives regeneration', async () => {
    const r1 = await createRecipe(onionSoup);
    const first = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });
    const itemId = first.body.items[0].id as string;

    await pool.query('UPDATE shopping_list_items SET checked = true WHERE id = $1', [itemId]);

    const r2 = await createRecipe(onionTart);
    const second = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id, r2.id] });

    expect(second.body.items[0].checked).toBe(true);
  });

  it('rule 5: an item no longer required by any selected recipe is dropped if never hand-edited', async () => {
    const r1 = await createRecipe(onionSoup);
    const first = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });
    expect(first.body.items).toHaveLength(1);

    const second = await request(app).post('/api/shopping-list/generate').send({ recipeIds: [] });
    expect(second.body.items).toEqual([]);
  });

  it('rule 5 continued: a no-longer-required item is kept when it was hand-edited', async () => {
    const r1 = await createRecipe(onionSoup);
    const first = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });
    const itemId = first.body.items[0].id as string;

    await pool.query(
      'UPDATE shopping_list_items SET quantity = $1, quantity_edited = true WHERE id = $2',
      [5, itemId],
    );

    const second = await request(app).post('/api/shopping-list/generate').send({ recipeIds: [] });

    expect(second.body.items).toHaveLength(1);
    expect(second.body.items[0].id).toBe(itemId);
    expect(second.body.items[0].quantity).toBe(5);
  });
});
