import { describe, expect, it } from 'vitest';

import { emptyFormState, recipeFormReducer } from './recipeFormReducer';
import { toRecipeInput, validateRecipeForm } from './validateRecipeForm';

function filledState() {
  let state = emptyFormState();
  state = recipeFormReducer(state, { type: 'set_title', title: 'Tomato Soup' });
  state = recipeFormReducer(state, {
    type: 'update_ingredient',
    key: state.ingredients[0]!.key,
    field: 'name',
    value: 'Tomato',
  });
  state = recipeFormReducer(state, {
    type: 'update_ingredient',
    key: state.ingredients[0]!.key,
    field: 'quantity',
    value: '4',
  });
  state = recipeFormReducer(state, {
    type: 'update_ingredient',
    key: state.ingredients[0]!.key,
    field: 'unit',
    value: 'whole',
  });
  state = recipeFormReducer(state, {
    type: 'update_step',
    key: state.steps[0]!.key,
    value: 'Simmer',
  });
  return state;
}

describe('validateRecipeForm (AC5, mirrors backend/src/schemas/recipeSchemas.ts)', () => {
  it('a fully filled-in form has no errors', () => {
    expect(validateRecipeForm(filledState())).toEqual({});
  });

  it('requires a title', () => {
    const state = recipeFormReducer(filledState(), { type: 'set_title', title: '  ' });
    expect(validateRecipeForm(state).title).toBeDefined();
  });

  it('requires every ingredient row to have a name', () => {
    const state = filledState();
    const withBlankName = recipeFormReducer(state, {
      type: 'update_ingredient',
      key: state.ingredients[0]!.key,
      field: 'name',
      value: '',
    });
    expect(Object.keys(validateRecipeForm(withBlankName)).some((k) => k.endsWith('-name'))).toBe(
      true,
    );
  });

  it('rejects a non-numeric quantity', () => {
    const state = filledState();
    const withBadQuantity = recipeFormReducer(state, {
      type: 'update_ingredient',
      key: state.ingredients[0]!.key,
      field: 'quantity',
      value: 'four',
    });
    const errors = validateRecipeForm(withBadQuantity);
    expect(Object.keys(errors).some((k) => k.endsWith('-quantity'))).toBe(true);
  });

  it('accepts an empty unit — free text, valid for countable ingredients', () => {
    const state = filledState();
    const withEmptyUnit = recipeFormReducer(state, {
      type: 'update_ingredient',
      key: state.ingredients[0]!.key,
      field: 'unit',
      value: '',
    });
    expect(validateRecipeForm(withEmptyUnit)).toEqual({});
  });

  it('requires at least one non-blank step', () => {
    const state = filledState();
    const withBlankStep = recipeFormReducer(state, {
      type: 'update_step',
      key: state.steps[0]!.key,
      value: '   ',
    });
    expect(validateRecipeForm(withBlankStep).steps).toBeDefined();
  });
});

describe('toRecipeInput', () => {
  it('trims and splits tags, parses quantity to a number, trims steps', () => {
    let state = filledState();
    state = recipeFormReducer(state, { type: 'set_tags_text', value: ' soup ,vegetarian ,' });
    state = recipeFormReducer(state, {
      type: 'update_step',
      key: state.steps[0]!.key,
      value: '  Simmer gently  ',
    });

    const input = toRecipeInput(state);

    expect(input).toEqual({
      title: 'Tomato Soup',
      tags: ['soup', 'vegetarian'],
      ingredients: [{ name: 'Tomato', quantity: 4, unit: 'whole' }],
      steps: ['Simmer gently'],
    });
  });
});
