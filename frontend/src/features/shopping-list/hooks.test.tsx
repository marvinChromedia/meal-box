import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useShoppingList, useUpdateShoppingListItem } from './hooks';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('shopping-list hooks (against the typed mock, per AC5)', () => {
  it('useShoppingList loads the mock list', async () => {
    const { result } = renderHook(() => useShoppingList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items.length).toBeGreaterThan(0);
  });

  it('useUpdateShoppingListItem checks an item and invalidates the list', async () => {
    const wrapper = createWrapper();
    const { result: listResult } = renderHook(() => useShoppingList(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    const itemId = listResult.current.data!.items[0].id;

    const { result: updateResult } = renderHook(() => useUpdateShoppingListItem(), { wrapper });
    updateResult.current.mutate({ itemId, patch: { checked: true } });

    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(listResult.current.data?.items.find((item) => item.id === itemId)?.checked).toBe(true));
  });
});
