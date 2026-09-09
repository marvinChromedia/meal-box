import type { Recipe } from '@mealbox/shared';

import { Badge } from '../../components/ui/Badge';

/**
 * A recipe search (useRecipeSearch) is independent of selection state, so a
 * selected recipe filtered out of view stays selected — and counted — with
 * no way to see or remove it. This surfaces those hidden selections as
 * removable chips so they're never invisible.
 */
export function HiddenSelectionSummary({
  recipes,
  onRemove,
}: {
  recipes: Recipe[];
  onRemove: (id: string) => void;
}) {
  if (recipes.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Selected recipes hidden by search"
      className="flex flex-wrap gap-1"
    >
      {recipes.map((recipe) => (
        <Badge key={recipe.id} className="inline-flex items-center gap-1">
          {recipe.title}
          <button
            type="button"
            onClick={() => onRemove(recipe.id)}
            aria-label={`Remove ${recipe.title} from selection`}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ×
          </button>
        </Badge>
      ))}
    </div>
  );
}
