import type { Recipe } from '@mealbox/shared';
import type { FormEvent } from 'react';
import { useReducer } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { Textarea } from '../../components/ui/Textarea';
import { ApiClientError } from '../../lib/api/http';
import { useCreateRecipe, useRecipe, useUpdateRecipe } from './hooks';
import type { FormIngredient, FormStep } from './recipeFormReducer';
import { emptyFormState, formStateFromRecipe, recipeFormReducer } from './recipeFormReducer';
import { toRecipeInput, validateRecipeForm } from './validateRecipeForm';

function IngredientRow({
  ingredient,
  errors,
  onChange,
  onRemove,
  removable,
}: {
  ingredient: FormIngredient;
  errors: Record<string, string>;
  onChange: (field: 'name' | 'quantity' | 'unit', value: string) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line p-3 sm:flex-row sm:items-end sm:gap-3">
      <div className="flex-1">
        <Input
          label="Ingredient name"
          value={ingredient.name}
          onChange={(event) => onChange('name', event.target.value)}
          error={errors[`ingredient-${ingredient.key}-name`]}
        />
      </div>
      <div className="w-full sm:w-28">
        <Input
          label="Quantity"
          inputMode="decimal"
          value={ingredient.quantity}
          onChange={(event) => onChange('quantity', event.target.value)}
          error={errors[`ingredient-${ingredient.key}-quantity`]}
        />
      </div>
      <div className="w-full sm:w-28">
        <Input
          label="Unit"
          value={ingredient.unit}
          onChange={(event) => onChange('unit', event.target.value)}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={!removable}
        aria-label={`Remove ${ingredient.name || 'ingredient'} row`}
      >
        Remove
      </Button>
    </div>
  );
}

function StepRow({
  step,
  index,
  total,
  error,
  onChange,
  onRemove,
  onMove,
  removable,
}: {
  step: FormStep;
  index: number;
  total: number;
  error?: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  removable: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line p-3 sm:flex-row sm:items-start sm:gap-3">
      <div className="flex-1">
        <Textarea
          label={`Step ${index + 1}`}
          value={step.value}
          onChange={(event) => onChange(event.target.value)}
          error={error}
        />
      </div>
      <div className="flex gap-2 sm:flex-col">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMove('up')}
          disabled={index === 0}
          aria-label={`Move step ${index + 1} up`}
        >
          &uarr;
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMove('down')}
          disabled={index === total - 1}
          aria-label={`Move step ${index + 1} down`}
        >
          &darr;
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={!removable}
          aria-label={`Remove step ${index + 1}`}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

function RecipeFormFields({
  mode,
  initialRecipe,
}: {
  mode: 'create' | 'edit';
  initialRecipe?: Recipe;
}) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(recipeFormReducer, initialRecipe, (recipe) =>
    recipe ? formStateFromRecipe(recipe) : emptyFormState(),
  );
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const isSaving = createRecipe.isPending || updateRecipe.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateRecipeForm(state);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'set_errors', errors });
      return;
    }
    dispatch({ type: 'set_errors', errors: {} });
    dispatch({ type: 'set_submit_error', message: null });

    const input = toRecipeInput(state);
    const onError = (error: unknown) => {
      dispatch({
        type: 'set_submit_error',
        message: error instanceof Error ? error.message : 'Could not save the recipe.',
      });
    };

    if (mode === 'edit' && initialRecipe) {
      updateRecipe.mutate(
        { id: initialRecipe.id, input },
        { onSuccess: () => navigate(`/recipes/${initialRecipe.id}`), onError },
      );
    } else {
      createRecipe.mutate(input, {
        onSuccess: (recipe) => navigate(`/recipes/${recipe.id}`),
        onError,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title={mode === 'edit' ? 'Edit recipe' : 'Add a recipe'} />

      {state.submitError ? (
        <ErrorState title="Couldn't save the recipe" message={state.submitError} />
      ) : null}

      <Input
        label="Title"
        value={state.title}
        onChange={(event) => dispatch({ type: 'set_title', title: event.target.value })}
        error={state.errors.title}
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Ingredients</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: 'add_ingredient' })}
          >
            Add ingredient
          </Button>
        </div>
        {state.errors.ingredients ? (
          <p className="text-sm text-red-600">{state.errors.ingredients}</p>
        ) : null}
        <div className="flex flex-col gap-3">
          {state.ingredients.map((ingredient) => (
            <IngredientRow
              key={ingredient.key}
              ingredient={ingredient}
              errors={state.errors}
              onChange={(field, value) =>
                dispatch({ type: 'update_ingredient', key: ingredient.key, field, value })
              }
              onRemove={() => dispatch({ type: 'remove_ingredient', key: ingredient.key })}
              removable={state.ingredients.length > 1}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Steps</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: 'add_step' })}
          >
            Add step
          </Button>
        </div>
        {state.errors.steps ? <p className="text-sm text-red-600">{state.errors.steps}</p> : null}
        <div className="flex flex-col gap-3">
          {state.steps.map((step, index) => (
            <StepRow
              key={step.key}
              step={step}
              index={index}
              total={state.steps.length}
              error={state.errors[`step-${step.key}`]}
              onChange={(value) => dispatch({ type: 'update_step', key: step.key, value })}
              onRemove={() => dispatch({ type: 'remove_step', key: step.key })}
              onMove={(direction) => dispatch({ type: 'move_step', key: step.key, direction })}
              removable={state.steps.length > 1}
            />
          ))}
        </div>
      </section>

      <Input
        label="Tags (comma separated)"
        placeholder="e.g. quick, vegetarian"
        value={state.tagsText}
        onChange={(event) => dispatch({ type: 'set_tags_text', value: event.target.value })}
      />

      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save recipe'}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function RecipeForm() {
  const { id } = useParams<{ id: string }>();
  const query = useRecipe(id ?? '');

  if (!id) {
    return <RecipeFormFields mode="create" />;
  }

  if (query.isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <LoadingState label="Loading recipe…" rows={3} />
      </div>
    );
  }

  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 404) {
      return (
        <div className="mx-auto w-full max-w-2xl">
          <EmptyState
            title="Recipe not found"
            description="This recipe doesn't exist, or it was deleted."
          />
        </div>
      );
    }
    return (
      <div className="mx-auto w-full max-w-2xl">
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      </div>
    );
  }

  return <RecipeFormFields mode="edit" initialRecipe={query.data} key={query.data.id} />;
}
