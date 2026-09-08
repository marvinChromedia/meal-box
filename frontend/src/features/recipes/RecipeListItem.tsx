import { clsx } from 'clsx';
import type { Recipe } from '@recipe-box/shared';
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
 * alone) alongside a highlighted border as a secondary cue.
 */
export function RecipeListItem({ recipe, selection }: { recipe: Recipe; selection?: RecipeSelectionState }) {
  const card = (
    <Card
      className={clsx('transition-shadow hover:shadow-md', selection?.selected && 'ring-2 ring-blue-600')}
    >
      <CardHeader>{recipe.title}</CardHeader>
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
    return (
      <div className="flex items-start gap-3">
        <Checkbox
          label={recipe.title}
          checked={selection.selected}
          onChange={selection.onToggle}
          className="mt-4 h-5 w-5 shrink-0"
        />
        <button
          type="button"
          onClick={selection.onToggle}
          className="flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {card}
        </button>
      </div>
    );
  }

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
}
