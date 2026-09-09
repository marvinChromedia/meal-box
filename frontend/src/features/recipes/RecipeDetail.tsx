import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '../../components/layout/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { Modal } from '../../components/ui/Modal';
import { ApiClientError } from '../../lib/api/http';
import { GenerateConfirmationModal } from '../recipe-selection/GenerateConfirmationModal';
import { useGenerateShoppingListFlow } from '../recipe-selection/useGenerateShoppingListFlow';
import { useDeleteRecipe, useRecipe } from './hooks';

function RecipeNotFound({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <EmptyState
        title="Recipe not found"
        description={message}
        action={
          <Link to="/recipes" className="text-sm font-medium text-accent hover:underline">
            Back to recipe box
          </Link>
        }
      />
    </div>
  );
}

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useRecipe(id ?? '');
  const deleteRecipe = useDeleteRecipe();
  // Uses the route param, not recipe.id, so this hook can be called
  // unconditionally before the early returns below (Rules of Hooks) — the
  // fetched recipe's id always equals id once query succeeds.
  const generateFlow = useGenerateShoppingListFlow({ recipeIds: id ? [id] : [] });
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (generateFlow.isGenerated) {
      navigate('/shopping-list');
    }
  }, [generateFlow.isGenerated, navigate]);

  if (!id) {
    return <RecipeNotFound message="No recipe was specified." />;
  }

  if (query.isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <LoadingState label="Loading recipe…" rows={2} />
      </div>
    );
  }

  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 404) {
      return <RecipeNotFound message="This recipe doesn't exist, or it was deleted." />;
    }
    return (
      <div className="mx-auto w-full max-w-2xl">
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      </div>
    );
  }

  const recipe = query.data;

  function handleConfirmDelete() {
    deleteRecipe.mutate(recipe.id, {
      onSuccess: () => navigate('/recipes'),
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <PageHeader
        title={recipe.title}
        actions={
          <>
            <Button size="sm" onClick={generateFlow.requestGenerate} disabled={generateFlow.isGenerating}>
              {generateFlow.isGenerating ? 'Adding…' : 'Add to shopping list'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
              Delete
            </Button>
          </>
        }
      />

      {generateFlow.generateError ? (
        <Alert variant="danger" title="Couldn't add to the list">
          <p>{generateFlow.generateError.message}</p>
        </Alert>
      ) : null}

      <GenerateConfirmationModal
        open={generateFlow.isConfirmOpen}
        onConfirm={generateFlow.confirmGenerate}
        onCancel={generateFlow.cancelGenerate}
      />

      {recipe.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {recipe.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      ) : null}

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Ingredients</h2>
        <ul className="mt-2 divide-y divide-line">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
              <span className="font-medium text-ink">
                {ingredient.quantity} {ingredient.unit}
              </span>{' '}
              <span className="text-ink-muted">{ingredient.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Steps</h2>
        <ol className="mt-3 list-decimal space-y-4 pl-6 marker:font-display marker:font-semibold marker:text-accent">
          {recipe.steps.map((step, index) => (
            <li key={index} className="pl-1 text-sm text-ink-muted">
              {step}
            </li>
          ))}
        </ol>
      </section>

      <Link to="/recipes" className="text-sm font-medium text-accent hover:underline">
        &larr; Back to recipe box
      </Link>

      <Modal open={confirmOpen} title="Delete recipe?" onClose={() => setConfirmOpen(false)}>
        <p>Delete &ldquo;{recipe.title}&rdquo;? This can&rsquo;t be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={deleteRecipe.isPending}
          >
            {deleteRecipe.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
