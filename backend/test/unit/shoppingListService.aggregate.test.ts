import type { Recipe } from '@recipe-box/shared';
import { describe, expect, it } from 'vitest';

import { aggregateIngredients } from '../../src/services/shoppingListService.js';

function recipe(
  id: string,
  ingredients: { name: string; quantity: number; unit: string }[],
): Recipe {
  return {
    id,
    title: `recipe-${id}`,
    ingredients: ingredients.map((ingredient, i) => ({ id: `ing-${id}-${i}`, ...ingredient })),
    steps: ['step'],
    tags: [],
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('aggregateIngredients', () => {
  it('AC1 / DoD "duplicate names": sums quantities for the same ingredient across recipes', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Onion', quantity: 1, unit: 'whole' }]),
      recipe('r2', [{ name: 'Onion', quantity: 1, unit: 'whole' }]),
    ]);

    expect(result).toEqual([
      { name: 'Onion', quantity: 2, unit: 'whole', sourceRecipeIds: ['r1', 'r2'] },
    ]);
  });

  it('AC2: non-matching ingredient names stay as separate line items', () => {
    const result = aggregateIngredients([
      recipe('r1', [
        { name: 'Onion', quantity: 1, unit: 'whole' },
        { name: 'Garlic', quantity: 2, unit: 'clove' },
      ]),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name).sort()).toEqual(['Garlic', 'Onion']);
  });

  it('AC3: records every contributing recipe id on the combined item', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Onion', quantity: 1, unit: 'whole' }]),
      recipe('r2', [{ name: 'Onion', quantity: 1, unit: 'whole' }]),
      recipe('r3', [{ name: 'Onion', quantity: 1, unit: 'whole' }]),
    ]);

    expect(result[0]!.sourceRecipeIds).toEqual(['r1', 'r2', 'r3']);
  });

  it('matches case-insensitively and trims whitespace, keeping the first-seen display casing', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: '  Onion ', quantity: 1, unit: 'whole' }]),
      recipe('r2', [{ name: 'onion', quantity: 1, unit: 'whole' }]),
    ]);

    expect(result).toEqual([
      { name: 'Onion', quantity: 2, unit: 'whole', sourceRecipeIds: ['r1', 'r2'] },
    ]);
  });

  it('DoD "differing units on the same name": still combines by name only (AC4), summing raw quantities', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Onion', quantity: 1, unit: 'whole' }]),
      recipe('r2', [{ name: 'Onion', quantity: 150, unit: 'g' }]),
    ]);

    expect(result).toEqual([
      { name: 'Onion', quantity: 151, unit: 'whole', sourceRecipeIds: ['r1', 'r2'] },
    ]);
  });

  it('AC4: genuinely different ingredient names are never merged, even describing the same food', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: '1 onion', quantity: 1, unit: '' }]),
      recipe('r2', [{ name: '150g onion', quantity: 1, unit: '' }]),
    ]);

    expect(result).toHaveLength(2);
  });

  it('DoD "empty selection": no recipes produces no items', () => {
    expect(aggregateIngredients([])).toEqual([]);
  });

  it('DoD "single recipe": aggregates a single recipe correctly', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Onion', quantity: 1, unit: 'whole' }]),
    ]);
    expect(result).toEqual([
      { name: 'Onion', quantity: 1, unit: 'whole', sourceRecipeIds: ['r1'] },
    ]);
  });

  it('DoD "recipe with no ingredients": contributes nothing, does not throw', () => {
    const result = aggregateIngredients([
      recipe('r1', []),
      recipe('r2', [{ name: 'Onion', quantity: 1, unit: 'whole' }]),
    ]);
    expect(result).toEqual([
      { name: 'Onion', quantity: 1, unit: 'whole', sourceRecipeIds: ['r2'] },
    ]);
  });

  it('DoD "non-integer sum": quantities can sum to a non-integer', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Flour', quantity: 1.5, unit: 'cup' }]),
      recipe('r2', [{ name: 'Flour', quantity: 1, unit: 'cup' }]),
    ]);

    expect(result[0]!.quantity).toBe(2.5);
  });

  it('does not double-count a recipe id when the same recipe lists an ingredient name twice', () => {
    const result = aggregateIngredients([
      recipe('r1', [
        { name: 'Salt', quantity: 1, unit: 'tsp' },
        { name: 'Salt', quantity: 1, unit: 'tsp' },
      ]),
    ]);

    expect(result[0]!.sourceRecipeIds).toEqual(['r1']);
    expect(result[0]!.quantity).toBe(2);
  });
});
