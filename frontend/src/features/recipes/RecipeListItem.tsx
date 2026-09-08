import type { Recipe } from '@recipe-box/shared';
import { Link } from 'react-router-dom';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';

/**
 * One recipe's row in the list. Kept separate from RecipeBox so TEST-153 can
 * wrap or extend a single row (e.g. adding a selection checkbox) without
 * touching the search/filter logic in useRecipeSearch.
 */
export function RecipeListItem({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <Card className="transition-shadow hover:shadow-md">
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
    </Link>
  );
}
