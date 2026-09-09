import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import {
  getRecipeById,
  getRecipeOwnerId,
  listRecipes,
  setRecipeFavorite,
} from '../../src/repositories/recipesRepository.js';

function fakePool(rows: unknown[]): Pool {
  return { query: vi.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}

const validRow = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Pancakes',
  steps: ['Mix', 'Cook'],
  tags: ['breakfast'],
  is_favorite: true,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-02T00:00:00Z'),
  ingredients: [
    { id: '22222222-2222-2222-2222-222222222222', name: 'Flour', quantity: 2, unit: 'cup' },
  ],
};

describe('recipesRepository row mapping', () => {
  it('maps a valid row to the shared Recipe shape', async () => {
    const recipe = await getRecipeById(fakePool([validRow]), validRow.id);

    expect(recipe).toEqual({
      id: validRow.id,
      title: 'Pancakes',
      ingredients: [{ id: validRow.ingredients[0]!.id, name: 'Flour', quantity: 2, unit: 'cup' }],
      steps: ['Mix', 'Cook'],
      tags: ['breakfast'],
      isFavorite: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('returns null when no row matches', async () => {
    const recipe = await getRecipeById(fakePool([]), 'missing-id');
    expect(recipe).toBeNull();
  });

  it('maps every row returned for a list', async () => {
    const recipes = await listRecipes(
      fakePool([validRow, { ...validRow, id: '33333333-3333-3333-3333-333333333333' }]),
      'user-1',
    );
    expect(recipes).toHaveLength(2);
  });

  it('throws instead of returning a malformed row (AC6)', async () => {
    const malformedRow = { ...validRow, is_favorite: null };
    await expect(getRecipeById(fakePool([malformedRow]), validRow.id)).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});

describe('recipesRepository ownership scoping', () => {
  it('listRecipes filters by user_id, not just maps whatever comes back', async () => {
    const pool = fakePool([validRow]);
    await listRecipes(pool, 'user-42');

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('user_id'), ['user-42']);
  });

  it('getRecipeOwnerId returns the row\'s user_id', async () => {
    const pool = fakePool([{ user_id: 'user-42' }]);
    await expect(getRecipeOwnerId(pool, validRow.id)).resolves.toBe('user-42');
  });

  it('getRecipeOwnerId returns null when no recipe matches', async () => {
    const pool = fakePool([]);
    await expect(getRecipeOwnerId(pool, 'missing-id')).resolves.toBeNull();
  });
});

describe('recipesRepository.setRecipeFavorite', () => {
  it('sets is_favorite and returns the updated recipe', async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...validRow, is_favorite: true }] }),
    } as unknown as Pool;

    const recipe = await setRecipeFavorite(pool, validRow.id, true);

    expect(pool.query).toHaveBeenNthCalledWith(1, expect.stringContaining('is_favorite'), [
      validRow.id,
      true,
    ]);
    expect(recipe?.isFavorite).toBe(true);
  });

  it('returns null when no recipe matches the id', async () => {
    const pool = { query: vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] }) } as unknown as Pool;

    const recipe = await setRecipeFavorite(pool, 'missing-id', true);

    expect(recipe).toBeNull();
  });
});
