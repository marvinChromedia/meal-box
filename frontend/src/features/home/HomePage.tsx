import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { useRecipes } from '../recipes/hooks';
import { useShoppingList } from '../shopping-list/hooks';
import { getGreeting } from './greeting';

const RECENT_RECIPE_COUNT = 5;

// Independent of the recipes section below (AC4) — a slow or failed shopping
// list request never blanks out the recipe stats, and vice versa.
function ShoppingListSummary() {
  const listQuery = useShoppingList();

  if (listQuery.isPending) {
    return <LoadingState label="Loading your shopping list…" rows={1} />;
  }

  if (listQuery.isError) {
    // The real API 404s with this code for "no list has ever been
    // generated" — by design, per docs/api.md. That's a normal empty state,
    // not a failure (AC3); anything else is a real error.
    if (listQuery.error.code === 'SHOPPING_LIST_NOT_FOUND') {
      return <p className="text-sm text-ink-muted">No shopping list yet — generate one from your recipe box.</p>;
    }
    return (
      <ErrorState
        title="Couldn't load your shopping list"
        message={listQuery.error.message}
        code={listQuery.error.code}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const items = listQuery.data.items;
  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <p className="text-sm text-ink-muted">
      Shopping list: {items.length} item{items.length === 1 ? '' : 's'}, {checkedCount} done.
    </p>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const recipesQuery = useRecipes();
  const greeting = getGreeting(new Date());

  // Default to [] rather than narrowing on `isSuccess` inline, so `recipes`
  // stays a plain array everywhere below (matches the pattern already used
  // in ShoppingList.tsx) instead of fighting TypeScript's control-flow
  // narrowing across two separately-computed booleans.
  const recipes = recipesQuery.data ?? [];
  const isFirstRun = recipesQuery.isSuccess && recipes.length === 0;
  const isPopulated = recipesQuery.isSuccess && recipes.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="font-display text-3xl font-bold text-ink">{greeting}</h1>

      {recipesQuery.isPending ? (
        <LoadingState label="Loading your recipe box…" />
      ) : recipesQuery.isError ? (
        <ErrorState
          title="Couldn't load your recipe box"
          message={recipesQuery.error.message}
          onRetry={() => recipesQuery.refetch()}
        />
      ) : isFirstRun ? (
        <EmptyState
          title="Let's fill your recipe box"
          description="Save your first recipe to start tracking what you can cook and build a shopping list from it."
          action={
            <Button size="sm" onClick={() => navigate('/recipes/new')}>
              Add your first recipe
            </Button>
          }
        />
      ) : (
        <p className="text-sm text-ink-muted">
          {recipes.length} recipe{recipes.length === 1 ? '' : 's'} saved.
        </p>
      )}

      {/* Independent of the recipes section above (AC4) — mounted whenever this
          isn't a confirmed first-run account, regardless of whether the recipes
          query above is still loading or has failed. AC2 is the one deliberate
          exception: a brand-new, empty recipe box hides this too, since there is
          nothing yet for it to summarize next to the "add your first recipe"
          invitation. */}
      {isFirstRun ? null : <ShoppingListSummary />}

      {isPopulated ? (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-semibold text-ink">Recently added</h2>
            <ul className="flex flex-col gap-1">
              {[...recipes]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, RECENT_RECIPE_COUNT)
                .map((recipe) => (
                  <li key={recipe.id}>
                    <Link to={`/recipes/${recipe.id}`} className="text-sm font-medium text-accent hover:underline">
                      {recipe.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/recipes')}>Browse recipe box</Button>
            <Button variant="outline" onClick={() => navigate('/shopping-list')}>
              Open shopping list
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
