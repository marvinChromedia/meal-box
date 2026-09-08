import type { RecipeInput } from '@recipe-box/shared';

import type { RecipeFormState } from './recipeFormReducer';

/**
 * Mirrors backend/src/schemas/recipeSchemas.ts (TEST-72): non-empty title,
 * at least one ingredient (name required, quantity numeric, unit free text —
 * see the ticket's own note on empty units being valid), at least one
 * non-blank step. Stricter than the API only where the API wouldn't reject
 * the stricter case either (a non-blank step), never looser — per AC5,
 * the form must never accept something the API would reject.
 */
export function validateRecipeForm(state: RecipeFormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!state.title.trim()) {
    errors.title = 'Title is required.';
  }

  if (state.ingredients.length === 0) {
    errors.ingredients = 'Add at least one ingredient.';
  } else {
    for (const ingredient of state.ingredients) {
      if (!ingredient.name.trim()) {
        errors[`ingredient-${ingredient.key}-name`] = 'Ingredient name is required.';
      }
      if (ingredient.quantity.trim() === '' || Number.isNaN(Number(ingredient.quantity))) {
        errors[`ingredient-${ingredient.key}-quantity`] = 'Quantity must be a number.';
      }
    }
  }

  if (state.steps.length === 0 || state.steps.every((step) => !step.value.trim())) {
    errors.steps = 'Add at least one step.';
  } else {
    for (const step of state.steps) {
      if (!step.value.trim()) {
        errors[`step-${step.key}`] = 'Step cannot be empty.';
      }
    }
  }

  return errors;
}

export function toRecipeInput(state: RecipeFormState): RecipeInput {
  return {
    title: state.title.trim(),
    tags: state.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    ingredients: state.ingredients.map((ingredient) => ({
      name: ingredient.name.trim(),
      quantity: Number(ingredient.quantity),
      unit: ingredient.unit.trim(),
    })),
    steps: state.steps.map((step) => step.value.trim()),
  };
}
