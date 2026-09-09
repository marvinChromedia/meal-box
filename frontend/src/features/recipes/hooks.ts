import type { Recipe, RecipeInput } from '@mealbox/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiClientError } from '../../lib/api/http';
import { queryKeys } from '../../lib/api/queryKeys';
import { recipesApi } from './api';

export function useRecipes() {
  return useQuery({
    queryKey: queryKeys.recipes.lists(),
    queryFn: () => recipesApi.list(),
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: queryKeys.recipes.detail(id),
    queryFn: () => recipesApi.get(id),
    enabled: Boolean(id),
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecipeInput) => recipesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecipeInput }) => recipesApi.update(id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(id) });
    },
  });
}

type SetFavoriteVariables = { id: string; isFavorite: boolean };
type SetFavoriteContext = { previousList?: Recipe[]; previousDetail?: Recipe };

/**
 * Optimistic: the star must render filled the instant it's tapped (AC1), not
 * after a round trip, so the cache is updated in `onMutate` and rolled back
 * in `onError` — same shape as the shopping-list optimistic check-off
 * (frontend/src/features/shopping-list/hooks.ts). `onSettled` re-syncs with
 * the server either way.
 */
export function useSetFavorite() {
  const queryClient = useQueryClient();
  return useMutation<Recipe, ApiClientError, SetFavoriteVariables, SetFavoriteContext>({
    mutationFn: ({ id, isFavorite }) => recipesApi.setFavorite(id, isFavorite),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recipes.all });

      const previousList = queryClient.getQueryData<Recipe[]>(queryKeys.recipes.lists());
      if (previousList) {
        queryClient.setQueryData<Recipe[]>(
          queryKeys.recipes.lists(),
          previousList.map((recipe) => (recipe.id === id ? { ...recipe, isFavorite } : recipe)),
        );
      }

      const previousDetail = queryClient.getQueryData<Recipe>(queryKeys.recipes.detail(id));
      if (previousDetail) {
        queryClient.setQueryData<Recipe>(queryKeys.recipes.detail(id), {
          ...previousDetail,
          isFavorite,
        });
      }

      return { previousList, previousDetail };
    },
    onError: (_error, { id }, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.recipes.lists(), context.previousList);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.recipes.detail(id), context.previousDetail);
      }
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(id) });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recipesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
    },
  });
}
