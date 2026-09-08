import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import { getShoppingListById } from '../../src/repositories/shoppingListsRepository.js';

function fakePool(rows: unknown[]): Pool {
  return { query: vi.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}

const validRow = {
  id: '11111111-1111-1111-1111-111111111111',
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-02T00:00:00Z'),
  items: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Onions',
      quantity: 3,
      unit: 'whole',
      checked: false,
      source_recipe_ids: ['33333333-3333-3333-3333-333333333333'],
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Paper towels',
      quantity: 1,
      unit: 'pack',
      checked: true,
      source_recipe_ids: [],
    },
  ],
};

describe('shoppingListsRepository row mapping', () => {
  it('maps a valid row to the shared ShoppingList shape, preserving manual vs generated items', async () => {
    const list = await getShoppingListById(fakePool([validRow]), validRow.id);

    expect(list).toEqual({
      id: validRow.id,
      items: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Onions',
          quantity: 3,
          unit: 'whole',
          checked: false,
          sourceRecipeIds: ['33333333-3333-3333-3333-333333333333'],
        },
        {
          id: '44444444-4444-4444-4444-444444444444',
          name: 'Paper towels',
          quantity: 1,
          unit: 'pack',
          checked: true,
          sourceRecipeIds: [],
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('returns null when no row matches', async () => {
    const list = await getShoppingListById(fakePool([]), 'missing-id');
    expect(list).toBeNull();
  });

  it('throws instead of returning a malformed row (AC6)', async () => {
    const malformedRow = {
      ...validRow,
      items: [{ ...validRow.items[0], quantity: 'not-a-number' }],
    };
    await expect(getShoppingListById(fakePool([malformedRow]), validRow.id)).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});
