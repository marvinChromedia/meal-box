import type { Recipe } from '@recipe-box/shared';
import { useMemo, useState } from 'react';

import { useRecipes } from './hooks';

function matchesSearch(recipe: Recipe, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  if (recipe.title.toLowerCase().includes(needle)) return true;
  return recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(needle));
}

/**
 * Fetches recipes and applies the client-side title/ingredient search over
 * them. Split out from RecipeBox so TEST-153's selection mode can reuse the
 * same fetch + filter rather than re-deriving it against a second list.
 */
export function useRecipeSearch() {
  const query = useRecipes();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecipes = useMemo(
    () => (query.data ?? []).filter((recipe) => matchesSearch(recipe, searchTerm)),
    [query.data, searchTerm],
  );

  return { query, searchTerm, setSearchTerm, filteredRecipes };
}
