import { describe, expect, it } from 'vitest';

import {
  addShoppingListItemInputSchema,
  generateShoppingListInputSchema,
  shoppingListItemIdParamSchema,
  updateShoppingListItemInputSchema,
} from '../../src/schemas/shoppingListSchemas.js';

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

describe('addShoppingListItemInputSchema (AC2/AC7: manual item at the boundary)', () => {
  const valid = { name: 'Paper towels', quantity: 1, unit: 'pack' };

  it('accepts a valid manual item', () => {
    expect(addShoppingListItemInputSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an empty unit — free text, valid for a countable item', () => {
    expect(addShoppingListItemInputSchema.safeParse({ ...valid, unit: '' }).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(addShoppingListItemInputSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('AC7: rejects a zero quantity', () => {
    expect(addShoppingListItemInputSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
  });

  it('AC7: rejects a negative quantity', () => {
    expect(addShoppingListItemInputSchema.safeParse({ ...valid, quantity: -1 }).success).toBe(
      false,
    );
  });

  it('AC7: rejects a non-numeric quantity', () => {
    expect(addShoppingListItemInputSchema.safeParse({ ...valid, quantity: 'one' }).success).toBe(
      false,
    );
  });

  it('AC7: rejects a missing quantity ("empty")', () => {
    const { quantity, ...rest } = valid;
    void quantity;
    expect(addShoppingListItemInputSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an unknown field, such as a caller trying to set sourceRecipeIds directly', () => {
    expect(
      addShoppingListItemInputSchema.safeParse({ ...valid, sourceRecipeIds: ['x'] }).success,
    ).toBe(false);
  });
});

describe('updateShoppingListItemInputSchema (AC1/AC4/AC7: patch shape at the boundary)', () => {
  it('accepts checked alone', () => {
    expect(updateShoppingListItemInputSchema.safeParse({ checked: true }).success).toBe(true);
  });

  it('accepts quantity alone', () => {
    expect(updateShoppingListItemInputSchema.safeParse({ quantity: 5 }).success).toBe(true);
  });

  it('accepts unit alone', () => {
    expect(updateShoppingListItemInputSchema.safeParse({ unit: 'g' }).success).toBe(true);
  });

  it('accepts all three together', () => {
    expect(
      updateShoppingListItemInputSchema.safeParse({ checked: true, quantity: 2, unit: 'g' })
        .success,
    ).toBe(true);
  });

  it('rejects an empty body — nothing to patch', () => {
    expect(updateShoppingListItemInputSchema.safeParse({}).success).toBe(false);
  });

  it('AC7: rejects a zero quantity', () => {
    expect(updateShoppingListItemInputSchema.safeParse({ quantity: 0 }).success).toBe(false);
  });

  it('AC7: rejects a negative quantity', () => {
    expect(updateShoppingListItemInputSchema.safeParse({ quantity: -1 }).success).toBe(false);
  });

  it('AC7: rejects a non-numeric quantity', () => {
    expect(updateShoppingListItemInputSchema.safeParse({ quantity: 'five' }).success).toBe(false);
  });

  it('rejects an unknown field', () => {
    expect(updateShoppingListItemInputSchema.safeParse({ checked: true, name: 'x' }).success).toBe(
      false,
    );
  });
});

describe('shoppingListItemIdParamSchema (AC7: malformed item id)', () => {
  it('accepts a valid uuid', () => {
    expect(
      shoppingListItemIdParamSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111' })
        .success,
    ).toBe(true);
  });

  it('rejects a non-uuid id', () => {
    expect(shoppingListItemIdParamSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });
});
