import { clsx } from 'clsx';
import type { Recipe } from '@mealbox/shared';
import { Link } from 'react-router-dom';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/Checkbox';

export interface RecipeSelectionState {
  selected: boolean;
  onToggle: () => void;
}

/**
 * One recipe's row in the list. Kept separate from RecipeBox so TEST-153 can
 * wrap or extend a single row (e.g. adding a selection checkbox) without
 * touching the search/filter logic in useRecipeSearch.
 *
 * With `selection` set (TEST-153's selection mode), the row toggles instead
 * of navigating — a checkbox carries the selected state (per AC1, not colour
 * alone) alongside a highlighted border as a secondary cue. The checkbox's
 * own label is visually hidden (`hideLabel`) since the card right next to it
 * already shows the recipe title — it stays the checkbox's accessible name.
 */
export function RecipeListItem({
  recipe,
  selection,
  onToggleFavorite,
}: {
  recipe: Recipe;
  selection?: RecipeSelectionState;
  onToggleFavorite?: (recipe: Recipe) => void;
}) {
  const card = (
    <Card
      className={clsx(
        'transition-shadow hover:shadow-md',
        selection?.selected && 'ring-2 ring-accent',
      )}
    >
      <CardHeader className="flex items-start justify-between gap-2">
        <span>{recipe.title}</span>
        {onToggleFavorite ? (
          <button
            type="button"
            aria-pressed={recipe.isFavorite}
            aria-label={recipe.isFavorite ? `Unfavorite ${recipe.title}` : `Favorite ${recipe.title}`}
            className={clsx(
              'relative z-10 -m-1 shrink-0 rounded-md p-1 text-xl leading-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              recipe.isFavorite ? 'text-accent' : 'text-ink-subtle',
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite(recipe);
            }}
          >
            {recipe.isFavorite ? '★' : '☆'}
          </button>
        ) : null}
      </CardHeader>
      <CardBody>
        <p>
          {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? '' : 's'} ·{' '}
          {recipe.steps.length} step{recipe.steps.length === 1 ? '' : 's'}
        </p>
        {recipe.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );

  if (selection) {
    const checkboxId = `recipe-checkbox-${recipe.id}`;
    return (
      <div className="relative flex items-start gap-3 rounded-card focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2">
        <Checkbox
          id={checkboxId}
          label={recipe.title}
          hideLabel
          checked={selection.selected}
          onChange={selection.onToggle}
          size="lg"
          className="mt-4 shrink-0"
        />
        {/* Stretched label: makes the whole row one click/tap target and one
            tab stop, instead of a separate wrapping <button> duplicating the
            checkbox's own toggle (and its own tab stop). */}
        <label
          htmlFor={checkboxId}
          aria-hidden="true"
          className="absolute inset-0 cursor-pointer rounded-card"
        />
        <div className="flex-1">{card}</div>
      </div>
    );
  }

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
}
