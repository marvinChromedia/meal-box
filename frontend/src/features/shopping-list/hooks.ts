import type { GenerateShoppingListInput, ShoppingList, ShoppingListItem, ShoppingListItemInput } from '@mealbox/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiClientError } from '../../lib/api/http';
import { queryKeys } from '../../lib/api/queryKeys';
import { shoppingListApi } from './api';

export function useShoppingList() {
  return useQuery<ShoppingList, ApiClientError>({
    queryKey: queryKeys.shoppingList.detail(),
    queryFn: () => shoppingListApi.get(),
  });
}

export function useGenerateShoppingList() {
  const queryClient = useQueryClient();
  return useMutation<ShoppingList, ApiClientError, GenerateShoppingListInput>({
    mutationFn: (input) => shoppingListApi.generate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });
}

export function useAddShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation<ShoppingList, ApiClientError, ShoppingListItemInput>({
    mutationFn: (input) => shoppingListApi.addItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });
}

type UpdateShoppingListItemVariables = {
  itemId: string;
  patch: Partial<Pick<ShoppingListItem, 'checked' | 'quantity' | 'unit'>>;
};

/**
 * Optimistic: the cache updates the instant `mutate` is called, before the
 * request resolves (AC3 — this screen is used one-handed in a shop, and a
 * checkbox that waits on a round trip is the failure mode). `onError` rolls
 * the cache back to what it held before the mutation on failure (AC4); the
 * error itself still surfaces via the mutation's own `error`/`isError`, same
 * as any other mutation. `onSettled` always re-syncs with the server after,
 * so an optimistic write is never the last word — a real response is.
 */
export function useUpdateShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation<ShoppingList, ApiClientError, UpdateShoppingListItemVariables, { previous?: ShoppingList }>({
    mutationFn: ({ itemId, patch }) => shoppingListApi.updateItem(itemId, patch),
    onMutate: async ({ itemId, patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shoppingList.detail() });
      const previous = queryClient.getQueryData<ShoppingList>(queryKeys.shoppingList.detail());
      if (previous) {
        queryClient.setQueryData<ShoppingList>(queryKeys.shoppingList.detail(), {
          ...previous,
          items: previous.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shoppingList.detail(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });
}

export function useRemoveShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation<ShoppingList, ApiClientError, string>({
    mutationFn: (itemId) => shoppingListApi.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });
}

/**
 * Clears the list by removing every item — there's no bulk-clear endpoint,
 * only the per-item one, so this calls it once per id, in sequence (a clear
 * is a rare, deliberate action; there's no reason to prefer the added
 * complexity of firing the requests concurrently). The list row itself is
 * never deleted, only emptied — see the feature doc for why that's the
 * right reading of what TEST-234's repository layer actually does.
 */
export function useClearShoppingList() {
  const queryClient = useQueryClient();
  return useMutation<ShoppingList | undefined, ApiClientError, string[]>({
    mutationFn: async (itemIds) => {
      let list: ShoppingList | undefined;
      for (const itemId of itemIds) {
        list = await shoppingListApi.removeItem(itemId);
      }
      return list;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });
}
