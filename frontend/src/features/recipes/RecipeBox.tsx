import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '../../components/layout/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { GenerateConfirmationModal } from '../recipe-selection/GenerateConfirmationModal';
import { HiddenSelectionSummary } from '../recipe-selection/HiddenSelectionSummary';
import { useGenerateShoppingListFlow } from '../recipe-selection/useGenerateShoppingListFlow';
import { useRecipeSelection } from '../recipe-selection/useRecipeSelection';
import { RecipeListItem } from './RecipeListItem';
import { useRecipeSearch } from './useRecipeSearch';

export function RecipeBox() {
  const navigate = useNavigate();
  const { query, searchTerm, setSearchTerm, filteredRecipes } = useRecipeSearch();
  const selection = useRecipeSelection();
  const generateFlow = useGenerateShoppingListFlow({ recipeIds: selection.selectedIds });

  const filteredIds = filteredRecipes.map((recipe) => recipe.id);
  const allVisibleSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selection.isSelected(id));
  const hiddenSelectedRecipes = (query.data ?? []).filter(
    (recipe) => selection.isSelected(recipe.id) && !filteredIds.includes(recipe.id),
  );

  // TEST-153 AC3: move to the shopping list screen once generation succeeds.
  useEffect(() => {
    if (generateFlow.isGenerated) {
      navigate('/shopping-list');
    }
  }, [generateFlow.isGenerated, navigate]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <PageHeader
        title="Recipe Box"
        actions={
          selection.isSelectionMode ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                selection.exitSelectionMode();
                generateFlow.resetError();
              }}
            >
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
          )
        }
      />

      <Input
        label="Search by title or ingredient"
        placeholder="e.g. tomato, or pasta"
        className="w-full"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      {selection.isSelectionMode ? (
        <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-card border border-line bg-surface p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-ink-muted" aria-live="polite">
                {selection.selectedCount} recipe{selection.selectedCount === 1 ? '' : 's'} selected
                {generateFlow.isGenerating ? ' — generating shopping list…' : ''}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  allVisibleSelected
                    ? selection.deselectAll(filteredIds)
                    : selection.selectAll(filteredIds)
                }
                disabled={filteredIds.length === 0}
              >
                {allVisibleSelected ? 'Clear shown' : 'Select all shown'}
              </Button>
            </div>
            <HiddenSelectionSummary
              recipes={hiddenSelectedRecipes}
              onRemove={selection.toggleRecipe}
            />
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Button
              variant="primary"
              onClick={generateFlow.requestGenerate}
              disabled={selection.selectedCount === 0 || generateFlow.isGenerating}
              aria-busy={generateFlow.isGenerating}
            >
              {generateFlow.isGenerating ? 'Generating…' : 'Generate shopping list'}
            </Button>
            {selection.selectedCount === 0 ? (
              <p className="text-xs text-ink-muted">
                Select at least one recipe to generate a list.
              </p>
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
        <ErrorState
          title="Couldn't load recipes"
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
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
                    ? {
                        selected: selection.isSelected(recipe.id),
                        onToggle: () => selection.toggleRecipe(recipe.id),
                      }
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
