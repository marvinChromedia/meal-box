import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as shoppingListsRepository from '../../src/repositories/shoppingListsRepository.js';
import * as shoppingListService from '../../src/services/shoppingListService.js';

vi.mock('../../src/repositories/shoppingListsRepository.js');

const pool = {} as Pool;

const sampleList = {
  id: 'list-1',
  items: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('addShoppingListItem', () => {
  it('delegates to the repository and returns the full list', async () => {
    vi.mocked(shoppingListsRepository.addShoppingListItem).mockResolvedValue(sampleList);

    const result = await shoppingListService.addShoppingListItem(pool, {
      name: 'Paper towels',
      quantity: 1,
      unit: 'pack',
    });

    expect(shoppingListsRepository.addShoppingListItem).toHaveBeenCalledWith(pool, {
      name: 'Paper towels',
      quantity: 1,
      unit: 'pack',
    });
    expect(result).toEqual(sampleList);
  });
});

describe('updateShoppingListItem', () => {
  it('returns null (for a 404) without re-fetching when the item does not exist', async () => {
    vi.mocked(shoppingListsRepository.updateShoppingListItem).mockResolvedValue(false);

    const result = await shoppingListService.updateShoppingListItem(pool, 'missing-id', {
      quantity: 5,
    });

    expect(result).toBeNull();
    expect(shoppingListsRepository.getCurrentShoppingList).not.toHaveBeenCalled();
  });

  it('returns the refreshed list when the update succeeds', async () => {
    vi.mocked(shoppingListsRepository.updateShoppingListItem).mockResolvedValue(true);
    vi.mocked(shoppingListsRepository.getCurrentShoppingList).mockResolvedValue(sampleList);

    const result = await shoppingListService.updateShoppingListItem(pool, 'item-1', {
      checked: true,
    });

    expect(shoppingListsRepository.updateShoppingListItem).toHaveBeenCalledWith(pool, 'item-1', {
      checked: true,
    });
    expect(result).toEqual(sampleList);
  });
});

describe('removeShoppingListItem', () => {
  it('returns null (for a 404) when the item does not exist', async () => {
    vi.mocked(shoppingListsRepository.removeShoppingListItem).mockResolvedValue(false);

    const result = await shoppingListService.removeShoppingListItem(pool, 'missing-id');

    expect(result).toBeNull();
    expect(shoppingListsRepository.getCurrentShoppingList).not.toHaveBeenCalled();
  });

  it('returns the refreshed list when the removal succeeds', async () => {
    vi.mocked(shoppingListsRepository.removeShoppingListItem).mockResolvedValue(true);
    vi.mocked(shoppingListsRepository.getCurrentShoppingList).mockResolvedValue(sampleList);

    const result = await shoppingListService.removeShoppingListItem(pool, 'item-1');

    expect(result).toEqual(sampleList);
  });
});
