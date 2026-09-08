import { useNavigate } from 'react-router-dom';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { RecipeListItem } from './RecipeListItem';
import { useRecipeSearch } from './useRecipeSearch';

export function RecipeBox() {
  const navigate = useNavigate();
  const { query, searchTerm, setSearchTerm, filteredRecipes } = useRecipeSearch();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Recipe Box</h1>
        <Button size="sm" onClick={() => navigate('/recipes/new')}>
          Add recipe
        </Button>
      </div>

      <Input
        label="Search by title or ingredient"
        placeholder="e.g. tomato, or pasta"
        className="w-full"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      {query.isPending ? (
        <p className="text-sm text-gray-500" role="status">
          Loading recipes…
        </p>
      ) : query.isError ? (
        <Alert variant="danger" title="Couldn't load recipes">
          <p>{query.error.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => query.refetch()}>
            Try again
          </Button>
        </Alert>
      ) : query.data.length === 0 ? (
        <Alert variant="info" title="No recipes yet">
          Save your first recipe to see it here.
        </Alert>
      ) : filteredRecipes.length === 0 ? (
        <Alert variant="info" title="No matches">
          <p>No recipes match &ldquo;{searchTerm}&rdquo;.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setSearchTerm('')}>
            Clear search
          </Button>
        </Alert>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredRecipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeListItem recipe={recipe} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
