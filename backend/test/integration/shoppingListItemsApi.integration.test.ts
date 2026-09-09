import type { Recipe, RecipeInput } from '@mealbox/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { createTestPool, truncateAll } from './testDb.js';

const pool = createTestPool();
const app = createApp(pool);

// TEST-159 put every /api/shopping-list route behind requireAuth, so these
// existing tests now need a signed-in session — a mechanical consequence of
// that change, not a change to shopping-list behavior itself.
let agent: ReturnType<typeof request.agent>;

beforeEach(async () => {
  await truncateAll(pool);
  agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ email: 'shopping-list-items-test@example.com', password: 'password123' });
  await agent
    .post('/api/auth/login')
    .send({ email: 'shopping-list-items-test@example.com', password: 'password123' });
});

afterAll(async () => {
  await pool.end();
});

async function createRecipe(input: RecipeInput): Promise<Recipe> {
  const res = await agent.post('/api/recipes').send(input);
  return res.body as Recipe;
}

const onionSoup: RecipeInput = {
  title: 'Onion Soup',
  steps: ['Simmer'],
  tags: [],
  ingredients: [{ name: 'Onion', quantity: 1, unit: 'whole' }],
};

describe('POST /api/shopping-list/items (AC2)', () => {
  it('adds a manual item with an empty sourceRecipeIds, bootstrapping the list if none exists yet', async () => {
    const res = await agent
      .post('/api/shopping-list/items')
      .send({ name: 'Paper towels', quantity: 1, unit: 'pack' });

    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      name: 'Paper towels',
      quantity: 1,
      unit: 'pack',
      checked: false,
      sourceRecipeIds: [],
    });

    const readRes = await agent.get('/api/shopping-list');
    expect(readRes.body).toEqual(res.body);
  });

  it('adds to an existing generated list rather than replacing it', async () => {
    const r1 = await createRecipe(onionSoup);
    await agent
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });

    const res = await agent
      .post('/api/shopping-list/items')
      .send({ name: 'Paper towels', quantity: 1, unit: 'pack' });

    expect(res.status).toBe(201);
    expect(res.body.items.map((i: { name: string }) => i.name).sort()).toEqual([
      'Onion',
      'Paper towels',
    ]);
  });

  it('AC7: rejects a malformed body with 400 before touching the database', async () => {
    const res = await agent
      .post('/api/shopping-list/items')
      .send({ name: '', quantity: 1, unit: 'pack' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: expect.any(String), code: 'VALIDATION_ERROR' } });

    const readRes = await agent.get('/api/shopping-list');
    expect(readRes.status).toBe(404);
  });

  it('AC7: rejects a negative quantity', async () => {
    const res = await agent
      .post('/api/shopping-list/items')
      .send({ name: 'Paper towels', quantity: -1, unit: 'pack' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/shopping-list/items/:id (AC1, AC4, AC5)', () => {
  it('AC1: checks an item off and reflects it on the next read', async () => {
    const added = await agent
      .post('/api/shopping-list/items')
      .send({ name: 'Paper towels', quantity: 1, unit: 'pack' });
    const itemId = added.body.items[0].id as string;

    const res = await agent
      .patch(`/api/shopping-list/items/${itemId}`)
      .send({ checked: true });
    expect(res.status).toBe(200);
    expect(res.body.items[0].checked).toBe(true);

    const readRes = await agent.get('/api/shopping-list');
    expect(readRes.body.items[0].checked).toBe(true);
  });

  it('AC1: unchecks an item', async () => {
    const added = await agent
      .post('/api/shopping-list/items')
      .send({ name: 'Paper towels', quantity: 1, unit: 'pack' });
    const itemId = added.body.items[0].id as string;
    await agent.patch(`/api/shopping-list/items/${itemId}`).send({ checked: true });

    const res = await agent
      .patch(`/api/shopping-list/items/${itemId}`)
      .send({ checked: false });
    expect(res.body.items[0].checked).toBe(false);
  });

  it('AC4: changing quantity persists it and flags the item hand-edited (so regeneration will not overwrite it)', async () => {
    const r1 = await createRecipe(onionSoup);
    const generated = await agent
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });
    const itemId = generated.body.items[0].id as string;

    const patchRes = await agent
      .patch(`/api/shopping-list/items/${itemId}`)
      .send({ quantity: 99 });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.items[0].quantity).toBe(99);

    // Regenerating from the same recipe must not recalculate the edited quantity.
    const regenerated = await agent
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });
    expect(regenerated.body.items[0].quantity).toBe(99);
  });

  it('AC5: a quantity edit bumps the parent list updated_at', async () => {
    const added = await agent
      .post('/api/shopping-list/items')
      .send({ name: 'Onion', quantity: 1, unit: 'whole' });
    const itemId = added.body.items[0].id as string;
    const before = added.body.updatedAt as string;

    await new Promise((resolve) => setTimeout(resolve, 50));
    const res = await agent
      .patch(`/api/shopping-list/items/${itemId}`)
      .send({ quantity: 2 });

    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it('checking an item off (no quantity in the patch) does not bump the parent list updated_at', async () => {
    const added = await agent
      .post('/api/shopping-list/items')
      .send({ name: 'Onion', quantity: 1, unit: 'whole' });
    const itemId = added.body.items[0].id as string;
    const before = added.body.updatedAt as string;

    await new Promise((resolve) => setTimeout(resolve, 10));
    const res = await agent
      .patch(`/api/shopping-list/items/${itemId}`)
      .send({ checked: true });

    expect(res.body.updatedAt).toBe(before);
  });

  it('AC7: returns 404 for an unknown item id', async () => {
    const res = await agent
      .patch('/api/shopping-list/items/11111111-1111-1111-1111-111111111111')
      .send({ checked: true });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { message: expect.any(String), code: 'SHOPPING_LIST_ITEM_NOT_FOUND' },
    });
  });

  it('AC7: returns 400 for a malformed item id', async () => {
    const res = await agent
      .patch('/api/shopping-list/items/not-a-uuid')
      .send({ checked: true });
    expect(res.status).toBe(400);
  });

  it('AC7: rejects an empty patch body', async () => {
    const added = await agent
      .post('/api/shopping-list/items')
      .send({ name: 'Onion', quantity: 1, unit: 'whole' });
    const itemId = added.body.items[0].id as string;

    const res = await agent.patch(`/api/shopping-list/items/${itemId}`).send({});
    expect(res.status).toBe(400);
  });

  it('AC7: rejects an invalid quantity and leaves the previous value in place', async () => {
    const added = await agent
      .post('/api/shopping-list/items')
      .send({ name: 'Onion', quantity: 1, unit: 'whole' });
    const itemId = added.body.items[0].id as string;

    const res = await agent
      .patch(`/api/shopping-list/items/${itemId}`)
      .send({ quantity: -5 });
    expect(res.status).toBe(400);

    const readRes = await agent.get('/api/shopping-list');
    expect(readRes.body.items[0].quantity).toBe(1);
  });
});

describe('DELETE /api/shopping-list/items/:id (AC3)', () => {
  it('removes a manually added item', async () => {
    const added = await agent
      .post('/api/shopping-list/items')
      .send({ name: 'Paper towels', quantity: 1, unit: 'pack' });
    const itemId = added.body.items[0].id as string;

    const res = await agent.delete(`/api/shopping-list/items/${itemId}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);

    const readRes = await agent.get('/api/shopping-list');
    expect(readRes.body.items).toEqual([]);
  });

  it('removes a generated item', async () => {
    const r1 = await createRecipe(onionSoup);
    const generated = await agent
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [r1.id] });
    const itemId = generated.body.items[0].id as string;

    const res = await agent.delete(`/api/shopping-list/items/${itemId}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('AC7: returns 404 for an unknown item id', async () => {
    const res = await agent.delete(
      '/api/shopping-list/items/11111111-1111-1111-1111-111111111111',
    );
    expect(res.status).toBe(404);
  });

  it('AC7: returns 400 for a malformed item id', async () => {
    const res = await agent.delete('/api/shopping-list/items/not-a-uuid');
    expect(res.status).toBe(400);
  });
});
