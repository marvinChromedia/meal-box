import type { RecipeInput } from '@recipe-box/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { createTestPool, truncateAll } from './testDb.js';

const pool = createTestPool();
const app = createApp(pool);

// TEST-159 put every /api/recipes route behind requireAuth, so these
// existing tests now need a signed-in session — a mechanical consequence of
// that change, not a change to recipe behavior itself.
let agent: ReturnType<typeof request.agent>;

beforeEach(async () => {
  await truncateAll(pool);
  agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ email: 'recipes-test@example.com', password: 'password123' });
  await agent
    .post('/api/auth/login')
    .send({ email: 'recipes-test@example.com', password: 'password123' });
});

afterAll(async () => {
  await pool.end();
});

const sampleInput: RecipeInput = {
  title: 'Tomato Soup',
  steps: ['Chop tomatoes', 'Simmer'],
  tags: ['soup', 'vegetarian'],
  ingredients: [
    { name: 'Tomato', quantity: 4, unit: 'whole' },
    { name: 'Onion', quantity: 1, unit: 'whole' },
  ],
};

describe('POST /api/recipes (AC1)', () => {
  it('creates a recipe and returns it with an id and timestamps', async () => {
    const res = await agent.post('/api/recipes').send(sampleInput);

    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.createdAt).toEqual(expect.any(String));
    expect(res.body.updatedAt).toEqual(expect.any(String));
    expect(res.body.title).toBe('Tomato Soup');
    expect(res.body.ingredients).toHaveLength(2);
  });

  it('rejects an invalid body with 400 before touching the database (AC5)', async () => {
    const res = await agent
      .post('/api/recipes')
      .send({ ...sampleInput, title: '' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { message: expect.any(String), code: 'VALIDATION_ERROR' },
    });

    const listRes = await agent.get('/api/recipes');
    expect(listRes.body).toEqual([]);
  });
});

describe('GET /api/recipes and /api/recipes/:id (AC2)', () => {
  it('lists saved recipes and reads one by id, ingredients in saved order', async () => {
    const created = await agent.post('/api/recipes').send(sampleInput);

    const listRes = await agent.get('/api/recipes');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);

    const getRes = await agent.get(`/api/recipes/${created.body.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.ingredients.map((i: { name: string }) => i.name)).toEqual([
      'Tomato',
      'Onion',
    ]);
  });
});

describe('PUT /api/recipes/:id (AC3)', () => {
  it('replaces the ingredient set with no orphaned rows left behind', async () => {
    const created = await agent.post('/api/recipes').send(sampleInput);

    const updateInput: RecipeInput = {
      title: 'Tomato Soup (updated)',
      steps: [...sampleInput.steps, 'Season to taste'],
      tags: sampleInput.tags,
      ingredients: [{ name: 'Tomato', quantity: 6, unit: 'whole' }],
    };
    const updateRes = await agent.put(`/api/recipes/${created.body.id}`).send(updateInput);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Tomato Soup (updated)');
    expect(updateRes.body.steps).toEqual(updateInput.steps);
    expect(updateRes.body.ingredients).toHaveLength(1);
    expect(updateRes.body.ingredients[0].name).toBe('Tomato');

    const reread = await agent.get(`/api/recipes/${created.body.id}`);
    expect(reread.body.ingredients).toHaveLength(1);
  });

  it('returns 404 for an id that does not exist', async () => {
    const res = await agent
      .put('/api/recipes/11111111-1111-1111-1111-111111111111')
      .send(sampleInput);

    expect(res.status).toBe(404);
    // requireOwner (TEST-253) intercepts this before the controller runs — a
    // missing id and someone else's id are deliberately indistinguishable,
    // so both come back as its generic NOT_FOUND, not the controller's own
    // RECIPE_NOT_FOUND.
    expect(res.body).toEqual({ error: { message: expect.any(String), code: 'NOT_FOUND' } });
  });
});

describe('DELETE /api/recipes/:id (AC4)', () => {
  it('deletes a recipe, its ingredients, and 404s on a subsequent read', async () => {
    const created = await agent.post('/api/recipes').send(sampleInput);

    const deleteRes = await agent.delete(`/api/recipes/${created.body.id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await agent.get(`/api/recipes/${created.body.id}`);
    expect(getRes.status).toBe(404);

    const listRes = await agent.get('/api/recipes');
    expect(listRes.body).toEqual([]);

    const { rows } = await pool.query('SELECT * FROM recipe_ingredients WHERE recipe_id = $1', [
      created.body.id,
    ]);
    expect(rows).toHaveLength(0);
  });

  it('returns 404 deleting an id that does not exist', async () => {
    const res = await agent.delete('/api/recipes/11111111-1111-1111-1111-111111111111');
    expect(res.status).toBe(404);
  });
});

describe('AC6: malformed and unknown ids', () => {
  it('returns 400 for a malformed id, not a 500', async () => {
    const res = await agent.get('/api/recipes/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: expect.any(String), code: 'VALIDATION_ERROR' } });
  });

  it('returns 404 for a well-formed but unknown id', async () => {
    const res = await agent.get('/api/recipes/11111111-1111-1111-1111-111111111111');
    expect(res.status).toBe(404);
  });
});

describe('TEST-253: recipes are scoped to the authenticated account', () => {
  async function registerAndLogin(email: string): Promise<ReturnType<typeof request.agent>> {
    const otherAgent = request.agent(app);
    await otherAgent.post('/api/auth/register').send({ email, password: 'password123' });
    await otherAgent.post('/api/auth/login').send({ email, password: 'password123' });
    return otherAgent;
  }

  it("does not list another account's recipes (AC1)", async () => {
    await agent.post('/api/recipes').send(sampleInput);

    const otherAgent = await registerAndLogin('someone-else@example.com');
    const listRes = await otherAgent.get('/api/recipes');

    expect(listRes.status).toBe(200);
    expect(listRes.body).toEqual([]);
  });

  it("returns 404, not the record, reading another account's recipe by id (AC2)", async () => {
    const created = await agent.post('/api/recipes').send(sampleInput);

    const otherAgent = await registerAndLogin('someone-else@example.com');
    const res = await otherAgent.get(`/api/recipes/${created.body.id}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: expect.any(String), code: 'NOT_FOUND' } });
  });

  it("returns 404 updating another account's recipe by id, and does not change it (AC2)", async () => {
    const created = await agent.post('/api/recipes').send(sampleInput);

    const otherAgent = await registerAndLogin('someone-else@example.com');
    const updateRes = await otherAgent
      .put(`/api/recipes/${created.body.id}`)
      .send({ ...sampleInput, title: 'Hijacked' });

    expect(updateRes.status).toBe(404);

    const reread = await agent.get(`/api/recipes/${created.body.id}`);
    expect(reread.body.title).toBe('Tomato Soup');
  });

  it("returns 404 deleting another account's recipe by id, and does not delete it (AC2)", async () => {
    const created = await agent.post('/api/recipes').send(sampleInput);

    const otherAgent = await registerAndLogin('someone-else@example.com');
    const deleteRes = await otherAgent.delete(`/api/recipes/${created.body.id}`);

    expect(deleteRes.status).toBe(404);

    const reread = await agent.get(`/api/recipes/${created.body.id}`);
    expect(reread.status).toBe(200);
  });

  it('a created recipe is owned by the account that created it (AC3)', async () => {
    const created = await agent.post('/api/recipes').send(sampleInput);

    const { rows } = await pool.query('SELECT user_id FROM recipes WHERE id = $1', [created.body.id]);
    const meRes = await agent.get('/api/auth/me');

    expect(rows[0]?.user_id).toBe(meRes.body.user.id);
  });
});
