import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { GenerateConfirmationModal } from '../recipe-selection/GenerateConfirmationModal';
import { useGenerateShoppingListFlow } from '../recipe-selection/useGenerateShoppingListFlow';
import { useRecipeSelection } from '../recipe-selection/useRecipeSelection';
import { RecipeListItem } from './RecipeListItem';
import { useRecipeSearch } from './useRecipeSearch';

export function RecipeBox() {
  const navigate = useNavigate();
  const { query, searchTerm, setSearchTerm, filteredRecipes } = useRecipeSearch();
  const selection = useRecipeSelection();
  const generateFlow = useGenerateShoppingListFlow({ recipeIds: selection.selectedIds });

  // TEST-153 AC3: move to the shopping list screen once generation succeeds.
  // There's no /shopping-list route yet — TEST-77 adds it, same as TEST-73
  // left /recipes/:id unregistered for TEST-74.
  useEffect(() => {
    if (generateFlow.isGenerated) {
      navigate('/shopping-list');
    }
  }, [generateFlow.isGenerated, navigate]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Recipe Box</h1>
        <div className="flex items-center gap-2">
          {selection.isSelectionMode ? (
            <Button variant="ghost" size="sm" onClick={selection.exitSelectionMode}>
              Cancel
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={selection.enterSelectionMode}>
                Select recipes
              </Button>
              <Button size="sm" onClick={() => navigate('/recipes/new')}>
                Add recipe
              </Button>
            </>
          )}
        </div>
      </div>

      <Input
        label="Search by title or ingredient"
        placeholder="e.g. tomato, or pasta"
        className="w-full"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      {selection.isSelectionMode ? (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-700" aria-live="polite">
            {selection.selectedCount} recipe{selection.selectedCount === 1 ? '' : 's'} selected
          </p>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Button
              variant="primary"
              onClick={generateFlow.requestGenerate}
              disabled={selection.selectedCount === 0 || generateFlow.isGenerating}
            >
              {generateFlow.isGenerating ? 'Generating…' : 'Generate shopping list'}
            </Button>
            {selection.selectedCount === 0 ? (
              <p className="text-xs text-gray-500">Select at least one recipe to generate a list.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {generateFlow.generateError ? (
        <Alert variant="danger" title="Couldn't generate the list">
          <p>{generateFlow.generateError.message}</p>
        </Alert>
      ) : null}

      <GenerateConfirmationModal
        open={generateFlow.isConfirmOpen}
        onConfirm={generateFlow.confirmGenerate}
        onCancel={generateFlow.cancelGenerate}
      />

      {query.isPending ? (
        <LoadingState label="Loading recipes…" />
      ) : query.isError ? (
        <ErrorState title="Couldn't load recipes" message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No recipes yet" description="Save your first recipe to see it here." />
      ) : filteredRecipes.length === 0 ? (
        <EmptyState
          title="No matches"
          description={`No recipes match "${searchTerm}".`}
          action={
            <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
              Clear search
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredRecipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeListItem
                recipe={recipe}
                selection={
                  selection.isSelectionMode
                    ? { selected: selection.isSelected(recipe.id), onToggle: () => selection.toggleRecipe(recipe.id) }
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
