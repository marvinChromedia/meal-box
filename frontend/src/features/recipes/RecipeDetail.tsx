import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { Modal } from '../../components/ui/Modal';
import { ApiClientError } from '../../lib/api/http';
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
  const [confirmOpen, setConfirmOpen] = useState(false);

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
            <Button variant="outline" size="sm" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
              Delete
            </Button>
          </>
        }
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
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id}>
              {ingredient.quantity} {ingredient.unit} {ingredient.name}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Steps</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-ink-muted">
          {recipe.steps.map((step, index) => (
            <li key={index}>{step}</li>
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
