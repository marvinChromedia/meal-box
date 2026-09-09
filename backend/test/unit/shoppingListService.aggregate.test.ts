import type { Recipe } from '@mealbox/shared';
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

  it('TEST-246 AC2: a count unit and a mass unit on the same name never merge', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Onion', quantity: 1, unit: 'whole' }]),
      recipe('r2', [{ name: 'Onion', quantity: 150, unit: 'g' }]),
    ]);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'Onion', quantity: 1, unit: 'whole', sourceRecipeIds: ['r1'] },
        { name: 'Onion', quantity: 150, unit: 'g', sourceRecipeIds: ['r2'] },
      ]),
    );
  });

  it('TEST-246 AC2: an empty/unrecognized unit never throws and never merges with a metric unit', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Butter', quantity: 1, unit: '' }]),
      recipe('r2', [{ name: 'Butter', quantity: 200, unit: 'g' }]),
      recipe('r3', [{ name: 'Butter', quantity: 2, unit: 'sticks' }]),
    ]);

    expect(result).toHaveLength(3);
  });

  it('TEST-246 AC1: g and kg on the same name combine into one line, below the kg threshold', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Flour', quantity: 200, unit: 'g' }]),
      recipe('r2', [{ name: 'Flour', quantity: 0.3, unit: 'kg' }]),
    ]);

    expect(result).toEqual([
      { name: 'Flour', quantity: 500, unit: 'g', sourceRecipeIds: ['r1', 'r2'] },
    ]);
  });

  it('TEST-246 AC1: a g+g total crossing 1000 displays in kg instead', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Flour', quantity: 700, unit: 'g' }]),
      recipe('r2', [{ name: 'Flour', quantity: 400, unit: 'g' }]),
    ]);

    expect(result).toEqual([
      { name: 'Flour', quantity: 1.1, unit: 'kg', sourceRecipeIds: ['r1', 'r2'] },
    ]);
  });

  it('TEST-246 AC1: ml and l on the same name combine the same way, on the volume side', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Milk', quantity: 250, unit: 'ml' }]),
      recipe('r2', [{ name: 'Milk', quantity: 0.75, unit: 'l' }]),
    ]);

    expect(result).toEqual([{ name: 'Milk', quantity: 1, unit: 'l', sourceRecipeIds: ['r1', 'r2'] }]);
  });

  it('TEST-246 AC5: a conversion producing a repeating decimal rounds to 2 places, round-half-up', () => {
    // 1001 g -> 1.001 kg, which rounds to 1 kg at 2 decimal places.
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Sugar', quantity: 1000, unit: 'g' }]),
      recipe('r2', [{ name: 'Sugar', quantity: 1, unit: 'g' }]),
    ]);

    expect(result).toEqual([{ name: 'Sugar', quantity: 1, unit: 'kg', sourceRecipeIds: ['r1', 'r2'] }]);
  });

  it('TEST-246: unit matching is case-insensitive, same as name matching', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Flour', quantity: 200, unit: 'G' }]),
      recipe('r2', [{ name: 'Flour', quantity: 100, unit: 'g' }]),
    ]);

    expect(result).toEqual([
      { name: 'Flour', quantity: 300, unit: 'g', sourceRecipeIds: ['r1', 'r2'] },
    ]);
  });

  it('TEST-246: identical non-metric units on the same name still combine (literal match, outside the closed set)', () => {
    const result = aggregateIngredients([
      recipe('r1', [{ name: 'Flour', quantity: 1, unit: 'cup' }]),
      recipe('r2', [{ name: 'Flour', quantity: 0.5, unit: 'cup' }]),
    ]);

    expect(result).toEqual([
      { name: 'Flour', quantity: 1.5, unit: 'cup', sourceRecipeIds: ['r1', 'r2'] },
    ]);
  });

  it('TEST-246 AC1: a single metric contributor still normalizes to the larger unit once it warrants it', () => {
    const result = aggregateIngredients([recipe('r1', [{ name: 'Rice', quantity: 1500, unit: 'g' }])]);

    expect(result).toEqual([{ name: 'Rice', quantity: 1.5, unit: 'kg', sourceRecipeIds: ['r1'] }]);
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
