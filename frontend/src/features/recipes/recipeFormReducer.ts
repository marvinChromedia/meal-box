import type { Recipe } from '@mealbox/shared';

let nextKey = 0;
function makeKey(): string {
  nextKey += 1;
  return `row-${nextKey}`;
}

export interface FormIngredient {
  /** Stable identity for this row, independent of its position in the array
   *  — removing a middle row must not shift which row's data another
   *  input displays (AC2). Never sent to the API. */
  key: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface FormStep {
  key: string;
  value: string;
}

export interface RecipeFormState {
  title: string;
  tagsText: string;
  ingredients: FormIngredient[];
  steps: FormStep[];
  errors: Record<string, string>;
  submitError: string | null;
}

export function emptyFormState(): RecipeFormState {
  return {
    title: '',
    tagsText: '',
    ingredients: [{ key: makeKey(), name: '', quantity: '', unit: '' }],
    steps: [{ key: makeKey(), value: '' }],
    errors: {},
    submitError: null,
  };
}

export function formStateFromRecipe(recipe: Recipe): RecipeFormState {
  return {
    title: recipe.title,
    tagsText: recipe.tags.join(', '),
    ingredients: recipe.ingredients.map((ingredient) => ({
      key: makeKey(),
      name: ingredient.name,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit,
    })),
    steps: recipe.steps.map((step) => ({ key: makeKey(), value: step })),
    errors: {},
    submitError: null,
  };
}

export type RecipeFormAction =
  | { type: 'set_title'; title: string }
  | { type: 'set_tags_text'; value: string }
  | { type: 'add_ingredient' }
  | { type: 'remove_ingredient'; key: string }
  | { type: 'update_ingredient'; key: string; field: 'name' | 'quantity' | 'unit'; value: string }
  | { type: 'add_step' }
  | { type: 'remove_step'; key: string }
  | { type: 'update_step'; key: string; value: string }
  | { type: 'move_step'; key: string; direction: 'up' | 'down' }
  | { type: 'set_errors'; errors: Record<string, string> }
  | { type: 'set_submit_error'; message: string | null }
  | { type: 'load'; recipe: Recipe };

export function recipeFormReducer(
  state: RecipeFormState,
  action: RecipeFormAction,
): RecipeFormState {
  switch (action.type) {
    case 'set_title':
      return { ...state, title: action.title };

    case 'set_tags_text':
      return { ...state, tagsText: action.value };

    case 'add_ingredient':
      return {
        ...state,
        ingredients: [...state.ingredients, { key: makeKey(), name: '', quantity: '', unit: '' }],
      };

    case 'remove_ingredient':
      return {
        ...state,
        ingredients: state.ingredients.filter((ingredient) => ingredient.key !== action.key),
      };

    case 'update_ingredient':
      return {
        ...state,
        ingredients: state.ingredients.map((ingredient) =>
          ingredient.key === action.key
            ? { ...ingredient, [action.field]: action.value }
            : ingredient,
        ),
      };

    case 'add_step':
      return { ...state, steps: [...state.steps, { key: makeKey(), value: '' }] };

    case 'remove_step':
      return { ...state, steps: state.steps.filter((step) => step.key !== action.key) };

    case 'update_step':
      return {
        ...state,
        steps: state.steps.map((step) =>
          step.key === action.key ? { ...step, value: action.value } : step,
        ),
      };

    case 'move_step': {
      const index = state.steps.findIndex((step) => step.key === action.key);
      const targetIndex = action.direction === 'up' ? index - 1 : index + 1;
      if (index === -1 || targetIndex < 0 || targetIndex >= state.steps.length) {
        return state;
      }
      const steps = [...state.steps];
      const [moved] = steps.splice(index, 1);
      steps.splice(targetIndex, 0, moved!);
      return { ...state, steps };
    }

    case 'set_errors':
      return { ...state, errors: action.errors };

    case 'set_submit_error':
      return { ...state, submitError: action.message };

    case 'load':
      return formStateFromRecipe(action.recipe);

    default:
      return state;
  }
}
