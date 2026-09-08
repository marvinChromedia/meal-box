import type { RecipeInput } from '@recipe-box/shared';
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
    const res = await request(app).post('/api/recipes').send(sampleInput);

    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.createdAt).toEqual(expect.any(String));
    expect(res.body.updatedAt).toEqual(expect.any(String));
    expect(res.body.title).toBe('Tomato Soup');
    expect(res.body.ingredients).toHaveLength(2);
  });

  it('rejects an invalid body with 400 before touching the database (AC5)', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ...sampleInput, title: '' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { message: expect.any(String), code: 'VALIDATION_ERROR' },
    });

    const listRes = await request(app).get('/api/recipes');
    expect(listRes.body).toEqual([]);
  });
});

describe('GET /api/recipes and /api/recipes/:id (AC2)', () => {
  it('lists saved recipes and reads one by id, ingredients in saved order', async () => {
    const created = await request(app).post('/api/recipes').send(sampleInput);

    const listRes = await request(app).get('/api/recipes');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);

    const getRes = await request(app).get(`/api/recipes/${created.body.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.ingredients.map((i: { name: string }) => i.name)).toEqual([
      'Tomato',
      'Onion',
    ]);
  });
});

describe('PUT /api/recipes/:id (AC3)', () => {
  it('replaces the ingredient set with no orphaned rows left behind', async () => {
    const created = await request(app).post('/api/recipes').send(sampleInput);

    const updateInput: RecipeInput = {
      title: 'Tomato Soup (updated)',
      steps: [...sampleInput.steps, 'Season to taste'],
      tags: sampleInput.tags,
      ingredients: [{ name: 'Tomato', quantity: 6, unit: 'whole' }],
    };
    const updateRes = await request(app).put(`/api/recipes/${created.body.id}`).send(updateInput);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Tomato Soup (updated)');
    expect(updateRes.body.steps).toEqual(updateInput.steps);
    expect(updateRes.body.ingredients).toHaveLength(1);
    expect(updateRes.body.ingredients[0].name).toBe('Tomato');

    const reread = await request(app).get(`/api/recipes/${created.body.id}`);
    expect(reread.body.ingredients).toHaveLength(1);
  });

  it('returns 404 for an id that does not exist', async () => {
    const res = await request(app)
      .put('/api/recipes/11111111-1111-1111-1111-111111111111')
      .send(sampleInput);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: expect.any(String), code: 'RECIPE_NOT_FOUND' } });
  });
});

describe('DELETE /api/recipes/:id (AC4)', () => {
  it('deletes a recipe, its ingredients, and 404s on a subsequent read', async () => {
    const created = await request(app).post('/api/recipes').send(sampleInput);

    const deleteRes = await request(app).delete(`/api/recipes/${created.body.id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get(`/api/recipes/${created.body.id}`);
    expect(getRes.status).toBe(404);

    const listRes = await request(app).get('/api/recipes');
    expect(listRes.body).toEqual([]);

    const { rows } = await pool.query('SELECT * FROM recipe_ingredients WHERE recipe_id = $1', [
      created.body.id,
    ]);
    expect(rows).toHaveLength(0);
  });

  it('returns 404 deleting an id that does not exist', async () => {
    const res = await request(app).delete('/api/recipes/11111111-1111-1111-1111-111111111111');
    expect(res.status).toBe(404);
  });
});

describe('AC6: malformed and unknown ids', () => {
  it('returns 400 for a malformed id, not a 500', async () => {
    const res = await request(app).get('/api/recipes/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: expect.any(String), code: 'VALIDATION_ERROR' } });
  });

  it('returns 404 for a well-formed but unknown id', async () => {
    const res = await request(app).get('/api/recipes/11111111-1111-1111-1111-111111111111');
    expect(res.status).toBe(404);
  });
});
