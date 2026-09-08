import type { GenerateShoppingListInput, ShoppingListItem, ShoppingListItemInput } from '@recipe-box/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../lib/api/queryKeys';
import { shoppingListApi } from './api';

export function useShoppingList() {
  return useQuery({
    queryKey: queryKeys.shoppingList.detail(),
    queryFn: () => shoppingListApi.get(),
  });
}

export function useGenerateShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateShoppingListInput) => shoppingListApi.generate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });
}

export function useAddShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShoppingListItemInput) => shoppingListApi.addItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });
}

export function useUpdateShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      patch,
    }: {
      itemId: string;
      patch: Partial<Pick<ShoppingListItem, 'checked' | 'quantity' | 'unit'>>;
    }) => shoppingListApi.updateItem(itemId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });
}

export function useRemoveShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => shoppingListApi.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });
}
