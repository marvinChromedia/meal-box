import type { RecipeInput } from '@mealbox/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recipesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
    },
  });
}
