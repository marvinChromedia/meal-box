import { describe, expect, it } from 'vitest';

import type { AggregatedIngredient } from '../../src/services/shoppingListService.js';
import { mergeShoppingList } from '../../src/services/shoppingListService.js';
import type { ShoppingListItemForMerge } from '../../src/repositories/shoppingListsRepository.js';

function existingItem(overrides: Partial<ShoppingListItemForMerge>): ShoppingListItemForMerge {
  return {
    id: 'item-1',
    name: 'Onion',
    quantity: 2,
    unit: 'whole',
    checked: false,
    quantityEdited: false,
    sourceRecipeIds: ['r1'],
    position: 0,
    ...overrides,
  };
}

function aggregated(overrides: Partial<AggregatedIngredient>): AggregatedIngredient {
  return { name: 'Onion', quantity: 5, unit: 'whole', sourceRecipeIds: ['r1', 'r2'], ...overrides };
}

describe('mergeShoppingList — binding regeneration decision (TEST-76 Beacon comment)', () => {
  it('rule 1: a generated item never hand-edited is freely overwritten', () => {
    const existing = [existingItem({ quantity: 2, checked: false })];
    const { upserts, deletions } = mergeShoppingList(existing, [aggregated({ quantity: 5 })]);

    expect(deletions).toEqual([]);
    expect(upserts).toEqual([
      {
        id: 'item-1',
        name: 'Onion',
        quantity: 5,
        unit: 'whole',
        checked: false,
        quantityEdited: false,
        sourceRecipeIds: ['r1', 'r2'],
        position: 0,
      },
    ]);
  });

  it('rule 2: a hand-edited quantity is never recalculated, but sourceRecipeIds still refreshes', () => {
    const existing = [
      existingItem({ quantity: 99, quantityEdited: true, sourceRecipeIds: ['r1'] }),
    ];
    const { upserts } = mergeShoppingList(existing, [
      aggregated({ quantity: 5, sourceRecipeIds: ['r1', 'r2'] }),
    ]);

    expect(upserts).toEqual([
      expect.objectContaining({
        id: 'item-1',
        quantity: 99,
        quantityEdited: true,
        sourceRecipeIds: ['r1', 'r2'],
      }),
    ]);
  });

  it('rule 3: a manual item (empty sourceRecipeIds) is never touched, even sharing a name with an aggregated item', () => {
    const existing = [
      existingItem({ id: 'manual-1', sourceRecipeIds: [], quantity: 3, checked: true }),
    ];
    const { upserts, deletions } = mergeShoppingList(existing, [aggregated({ quantity: 5 })]);

    // The manual item never appears — not upserted, not deleted.
    expect(upserts.find((u) => u.id === 'manual-1')).toBeUndefined();
    expect(deletions).not.toContain('manual-1');
    // The aggregated item still produces its own (new) upsert.
    expect(upserts).toHaveLength(1);
    expect(upserts[0]!.id).not.toBe('manual-1');
  });

  it('rule 4: checked state is preserved for a surviving item, edited or not', () => {
    const existing = [existingItem({ checked: true, quantityEdited: false })];
    const { upserts } = mergeShoppingList(existing, [aggregated({})]);

    expect(upserts[0]!.checked).toBe(true);
  });

  it('rule 4 continued: a genuinely new item starts unchecked', () => {
    const { upserts } = mergeShoppingList([], [aggregated({ name: 'Garlic' })]);
    expect(upserts[0]!.checked).toBe(false);
  });

  it('rule 5: a no-longer-required item is dropped when it was never hand-edited', () => {
    const existing = [existingItem({ id: 'gone-1', name: 'Celery', quantityEdited: false })];
    const { upserts, deletions } = mergeShoppingList(existing, []);

    expect(deletions).toEqual(['gone-1']);
    expect(upserts).toEqual([]);
  });

  it('rule 5 continued: a no-longer-required item is kept untouched when it was hand-edited', () => {
    const existing = [
      existingItem({ id: 'kept-1', name: 'Celery', quantityEdited: true, quantity: 7 }),
    ];
    const { upserts, deletions } = mergeShoppingList(existing, []);

    expect(deletions).toEqual([]);
    // Kept means genuinely untouched: not deleted, and not rewritten either.
    expect(upserts.find((u) => u.id === 'kept-1')).toBeUndefined();
  });

  it('a brand-new ingredient not present before is inserted at the next position after existing items', () => {
    const existing = [
      existingItem({ position: 0 }),
      existingItem({ id: 'item-2', name: 'Garlic', position: 1 }),
    ];
    const { upserts } = mergeShoppingList(existing, [
      aggregated({}),
      aggregated({ name: 'Garlic' }),
      aggregated({ name: 'Basil' }),
    ]);

    const basil = upserts.find((u) => u.name === 'Basil');
    expect(basil?.position).toBe(2);
  });

  it('matching against existing items is case-insensitive and trimmed, same as aggregation', () => {
    const existing = [existingItem({ name: '  onion ' })];
    const { upserts, deletions } = mergeShoppingList(existing, [aggregated({ name: 'Onion' })]);

    expect(deletions).toEqual([]);
    expect(upserts).toHaveLength(1);
    expect(upserts[0]!.id).toBe('item-1');
  });

  it('empty aggregation (no recipes selected) drops every non-edited item and keeps every edited one', () => {
    const existing = [
      existingItem({ id: 'drop-me', name: 'Onion', quantityEdited: false }),
      existingItem({ id: 'keep-me', name: 'Garlic', quantityEdited: true }),
    ];
    const { upserts, deletions } = mergeShoppingList(existing, []);

    expect(deletions).toEqual(['drop-me']);
    expect(upserts).toEqual([]);
  });
});
