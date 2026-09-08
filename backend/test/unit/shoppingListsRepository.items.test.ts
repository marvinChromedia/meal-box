import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  removeShoppingListItem,
  updateShoppingListItem,
} from '../../src/repositories/shoppingListsRepository.js';

function fakeTransactionalPool(
  queryImpl: (text: string, values?: unknown[]) => { rows: unknown[] },
) {
  const query = vi.fn(queryImpl);
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;
  return { pool, query };
}

describe('updateShoppingListItem', () => {
  it('sets only checked when that is the only field in the patch', async () => {
    const { pool, query } = fakeTransactionalPool((text) =>
      text.includes('shopping_list_items')
        ? { rows: [{ shopping_list_id: 'list-1' }] }
        : { rows: [] },
    );

    const result = await updateShoppingListItem(pool, 'item-1', { checked: true });

    expect(result).toBe(true);
    const itemUpdateCall = query.mock.calls.find(([text]) =>
      (text as string).includes('shopping_list_items'),
    );
    expect(itemUpdateCall?.[0]).toContain('checked = $2');
    expect(itemUpdateCall?.[0]).not.toContain('quantity_edited');
    expect(itemUpdateCall?.[1]).toEqual(['item-1', true]);
    // checked-only must not touch the parent list's timestamp (AC5 is quantity-specific).
    expect(query.mock.calls.some(([text]) => (text as string).includes('shopping_lists'))).toBe(
      false,
    );
  });

  it('AC4/AC5: a quantity patch sets quantity_edited and bumps the parent list updated_at', async () => {
    const { pool, query } = fakeTransactionalPool((text) =>
      text.includes('UPDATE shopping_list_items')
        ? { rows: [{ shopping_list_id: 'list-1' }] }
        : { rows: [] },
    );

    const result = await updateShoppingListItem(pool, 'item-1', { quantity: 5 });

    expect(result).toBe(true);
    const itemUpdateCall = query.mock.calls.find(([text]) =>
      (text as string).includes('UPDATE shopping_list_items'),
    );
    expect(itemUpdateCall?.[0]).toContain('quantity = $2');
    expect(itemUpdateCall?.[0]).toContain('quantity_edited = true');

    const listUpdateCall = query.mock.calls.find(([text]) =>
      (text as string).includes('UPDATE shopping_lists'),
    );
    expect(listUpdateCall?.[0]).toContain('updated_at = now()');
    expect(listUpdateCall?.[1]).toEqual(['list-1']);
  });

  it('combines checked, quantity and unit into one statement when all three are patched', async () => {
    const { pool, query } = fakeTransactionalPool(() => ({
      rows: [{ shopping_list_id: 'list-1' }],
    }));

    await updateShoppingListItem(pool, 'item-1', { checked: true, quantity: 2, unit: 'g' });

    const itemUpdateCall = query.mock.calls.find(([text]) =>
      (text as string).includes('UPDATE shopping_list_items'),
    );
    expect(itemUpdateCall?.[1]).toEqual(['item-1', true, 2, 'g']);
  });

  it('returns false and never touches shopping_lists when the item does not exist', async () => {
    const { pool, query } = fakeTransactionalPool(() => ({ rows: [] }));

    const result = await updateShoppingListItem(pool, 'missing-id', { quantity: 5 });

    expect(result).toBe(false);
    expect(
      query.mock.calls.some(([text]) => (text as string).includes('UPDATE shopping_lists')),
    ).toBe(false);
  });
});

describe('removeShoppingListItem', () => {
  it('returns true when a row was deleted', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rowCount: 1 }) } as unknown as Pool;
    expect(await removeShoppingListItem(pool, 'item-1')).toBe(true);
  });

  it('returns false when no row matched', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rowCount: 0 }) } as unknown as Pool;
    expect(await removeShoppingListItem(pool, 'missing-id')).toBe(false);
  });
});
