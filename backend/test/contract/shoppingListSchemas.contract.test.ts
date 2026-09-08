import { describe, expect, it } from 'vitest';

import { generateShoppingListInputSchema } from '../../src/schemas/shoppingListSchemas.js';

describe('generateShoppingListInputSchema (AC5/AC6: request shape at the boundary)', () => {
  it('accepts a valid list of recipe ids', () => {
    expect(
      generateShoppingListInputSchema.safeParse({
        recipeIds: ['11111111-1111-1111-1111-111111111111'],
      }).success,
    ).toBe(true);
  });

  it('AC6: accepts an empty selection', () => {
    expect(generateShoppingListInputSchema.safeParse({ recipeIds: [] }).success).toBe(true);
  });

  it('rejects a missing recipeIds field', () => {
    expect(generateShoppingListInputSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-uuid recipe id', () => {
    expect(generateShoppingListInputSchema.safeParse({ recipeIds: ['not-a-uuid'] }).success).toBe(
      false,
    );
  });

  it('rejects recipeIds that is not an array', () => {
    expect(
      generateShoppingListInputSchema.safeParse({
        recipeIds: '11111111-1111-1111-1111-111111111111',
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown top-level field', () => {
    expect(generateShoppingListInputSchema.safeParse({ recipeIds: [], notes: 'hi' }).success).toBe(
      false,
    );
  });
});
