import { describe, expect, it } from 'vitest';

import { emptyFormState, formStateFromRecipe, recipeFormReducer } from './recipeFormReducer';

const sampleRecipe = {
  id: 'r1',
  title: 'Tomato Soup',
  ingredients: [
    { id: 'i1', name: 'Tomato', quantity: 4, unit: 'whole' },
    { id: 'i2', name: 'Onion', quantity: 1, unit: 'whole' },
  ],
  steps: ['Chop', 'Simmer'],
  tags: ['soup', 'vegetarian'],
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('formStateFromRecipe', () => {
  it('pre-fills every field, including tags joined and quantities as strings (AC4)', () => {
    const state = formStateFromRecipe(sampleRecipe);
    expect(state.title).toBe('Tomato Soup');
    expect(state.tagsText).toBe('soup, vegetarian');
    expect(state.ingredients.map((i) => [i.name, i.quantity, i.unit])).toEqual([
      ['Tomato', '4', 'whole'],
      ['Onion', '1', 'whole'],
    ]);
    expect(state.steps.map((s) => s.value)).toEqual(['Chop', 'Simmer']);
  });
});

describe('recipeFormReducer — ingredient rows (AC2)', () => {
  it('removing a middle row keeps the other rows exactly as they were, by stable key not index', () => {
    let state = emptyFormState();
    state = recipeFormReducer(state, {
      type: 'update_ingredient',
      key: state.ingredients[0]!.key,
      field: 'name',
      value: 'First',
    });
    state = recipeFormReducer(state, { type: 'add_ingredient' });
    state = recipeFormReducer(state, {
      type: 'update_ingredient',
      key: state.ingredients[1]!.key,
      field: 'name',
      value: 'Middle',
    });
    state = recipeFormReducer(state, { type: 'add_ingredient' });
    state = recipeFormReducer(state, {
      type: 'update_ingredient',
      key: state.ingredients[2]!.key,
      field: 'name',
      value: 'Last',
    });

    expect(state.ingredients.map((i) => i.name)).toEqual(['First', 'Middle', 'Last']);

    const middleKey = state.ingredients[1]!.key;
    state = recipeFormReducer(state, { type: 'remove_ingredient', key: middleKey });

    expect(state.ingredients.map((i) => i.name)).toEqual(['First', 'Last']);
    expect(state.ingredients.find((i) => i.key === middleKey)).toBeUndefined();
  });

  it('add_ingredient appends a blank row without touching existing ones', () => {
    const before = emptyFormState();
    const after = recipeFormReducer(before, { type: 'add_ingredient' });
    expect(after.ingredients).toHaveLength(2);
    expect(after.ingredients[0]).toEqual(before.ingredients[0]);
    expect(after.ingredients[1]).toMatchObject({ name: '', quantity: '', unit: '' });
  });
});

describe('recipeFormReducer — steps (AC3)', () => {
  it('move_step swaps order without losing or duplicating a step', () => {
    let state = emptyFormState();
    state = recipeFormReducer(state, { type: 'add_step' });
    state = recipeFormReducer(state, { type: 'add_step' });
    state = recipeFormReducer(state, {
      type: 'update_step',
      key: state.steps[0]!.key,
      value: 'First',
    });
    state = recipeFormReducer(state, {
      type: 'update_step',
      key: state.steps[1]!.key,
      value: 'Second',
    });
    state = recipeFormReducer(state, {
      type: 'update_step',
      key: state.steps[2]!.key,
      value: 'Third',
    });

    const secondKey = state.steps[1]!.key;
    state = recipeFormReducer(state, { type: 'move_step', key: secondKey, direction: 'up' });

    expect(state.steps.map((s) => s.value)).toEqual(['Second', 'First', 'Third']);
    expect(state.steps).toHaveLength(3);
  });

  it('move_step is a no-op at the boundaries', () => {
    const state = emptyFormState();
    const firstKey = state.steps[0]!.key;
    const up = recipeFormReducer(state, { type: 'move_step', key: firstKey, direction: 'up' });
    expect(up).toEqual(state);
  });

  it('remove_step drops exactly the targeted step by key', () => {
    let state = emptyFormState();
    state = recipeFormReducer(state, { type: 'add_step' });
    const [first, second] = state.steps;
    state = recipeFormReducer(state, { type: 'remove_step', key: first!.key });
    expect(state.steps).toEqual([second]);
  });
});

describe('recipeFormReducer — errors and submit state', () => {
  it('set_errors and set_submit_error update independently of form fields', () => {
    let state = emptyFormState();
    state = recipeFormReducer(state, { type: 'set_errors', errors: { title: 'required' } });
    expect(state.errors).toEqual({ title: 'required' });

    state = recipeFormReducer(state, { type: 'set_submit_error', message: 'network down' });
    expect(state.submitError).toBe('network down');
    expect(state.errors).toEqual({ title: 'required' });
  });
});
