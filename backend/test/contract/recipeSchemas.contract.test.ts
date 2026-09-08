import { describe, expect, it } from 'vitest';

import { recipeIdParamSchema, recipeInputSchema } from '../../src/schemas/recipeSchemas.js';

const validInput = {
  title: 'Tomato Soup',
  steps: ['Chop tomatoes', 'Simmer'],
  tags: ['soup', 'vegetarian'],
  ingredients: [{ name: 'Tomato', quantity: 4, unit: 'whole' }],
};

describe('recipeInputSchema (AC5: rejected at the boundary)', () => {
  it('accepts a valid RecipeInput', () => {
    expect(recipeInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('accepts an empty unit — free text, valid for countable ingredients', () => {
    const input = { ...validInput, ingredients: [{ name: 'Onion', quantity: 2, unit: '' }] };
    expect(recipeInputSchema.safeParse(input).success).toBe(true);
  });

  it('rejects a missing title', () => {
    const { title, ...rest } = validInput;
    void title;
    expect(recipeInputSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an empty title', () => {
    expect(recipeInputSchema.safeParse({ ...validInput, title: '' }).success).toBe(false);
  });

  it('rejects a non-numeric quantity', () => {
    const input = {
      ...validInput,
      ingredients: [{ name: 'Tomato', quantity: 'four', unit: 'whole' }],
    };
    expect(recipeInputSchema.safeParse(input).success).toBe(false);
  });

  it('rejects an unknown top-level field', () => {
    expect(recipeInputSchema.safeParse({ ...validInput, notes: 'delicious' }).success).toBe(false);
  });

  it('rejects an unknown ingredient field', () => {
    const input = {
      ...validInput,
      ingredients: [{ name: 'Tomato', quantity: 4, unit: 'whole', brand: 'Heinz' }],
    };
    expect(recipeInputSchema.safeParse(input).success).toBe(false);
  });

  it('rejects an empty ingredients list', () => {
    expect(recipeInputSchema.safeParse({ ...validInput, ingredients: [] }).success).toBe(false);
  });

  it('rejects an empty steps list', () => {
    expect(recipeInputSchema.safeParse({ ...validInput, steps: [] }).success).toBe(false);
  });

  it('accepts an empty tags list — tags are optional', () => {
    expect(recipeInputSchema.safeParse({ ...validInput, tags: [] }).success).toBe(true);
  });
});

describe('recipeIdParamSchema (AC6: malformed id)', () => {
  it('accepts a valid uuid', () => {
    expect(
      recipeIdParamSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111' }).success,
    ).toBe(true);
  });

  it('rejects a non-uuid id', () => {
    expect(recipeIdParamSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });
});
