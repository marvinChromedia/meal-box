import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/http';
import { __resetMockShoppingListForTests, shoppingListApi } from './api';
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
  beforeEach(() => {
    __resetMockShoppingListForTests();
  });

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

  it('checks an item off in the cache before the request resolves (AC3 — optimistic)', async () => {
    const wrapper = createWrapper();
    const { result: listResult } = renderHook(() => useShoppingList(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    const itemId = listResult.current.data!.items[0].id;
    expect(listResult.current.data!.items[0].checked).toBe(false);

    // Hold the underlying request open so "the cache updated" and "the
    // request resolved" can't be confused for each other by timing — the
    // mutation is still pending when we assert the cache already changed.
    let resolveUpdate!: (value: typeof listResult.current.data) => void;
    const pendingRequest = new Promise<typeof listResult.current.data>((resolve) => {
      resolveUpdate = resolve;
    });
    const updateItemSpy = vi.spyOn(shoppingListApi, 'updateItem').mockReturnValueOnce(pendingRequest as never);

    const { result: updateResult } = renderHook(() => useUpdateShoppingListItem(), { wrapper });
    updateResult.current.mutate({ itemId, patch: { checked: true } });

    await waitFor(() =>
      expect(listResult.current.data?.items.find((item) => item.id === itemId)?.checked).toBe(true),
    );
    expect(updateResult.current.isPending).toBe(true);

    resolveUpdate(listResult.current.data);
    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));
    updateItemSpy.mockRestore();
  });

  it('rolls back to the real state when the request fails (AC4)', async () => {
    const wrapper = createWrapper();
    const { result: listResult } = renderHook(() => useShoppingList(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    const itemId = listResult.current.data!.items[0].id;

    // Held open deliberately: rejecting immediately can let onMutate's write
    // and onError's rollback both settle before the test's first `waitFor`
    // poll ever runs, making the transient "true" state unobservable and the
    // test flaky. Confirming the optimistic write while the request is still
    // pending removes that race.
    let rejectUpdate!: (error: unknown) => void;
    const pendingRequest = new Promise<never>((_resolve, reject) => {
      rejectUpdate = reject;
    });
    const updateItemSpy = vi.spyOn(shoppingListApi, 'updateItem').mockReturnValueOnce(pendingRequest);

    const { result: updateResult } = renderHook(() => useUpdateShoppingListItem(), { wrapper });
    updateResult.current.mutate({ itemId, patch: { checked: true } });

    // Optimistic write lands first...
    await waitFor(() =>
      expect(listResult.current.data?.items.find((item) => item.id === itemId)?.checked).toBe(true),
    );
    expect(updateResult.current.isPending).toBe(true);

    // ...then the failure surfaces and the cache reverts to the real state.
    rejectUpdate(new ApiClientError('Could not save', 'NETWORK_ERROR'));
    await waitFor(() => expect(updateResult.current.isError).toBe(true));
    await waitFor(() =>
      expect(listResult.current.data?.items.find((item) => item.id === itemId)?.checked).toBe(false),
    );
    expect(updateResult.current.error).toBeInstanceOf(ApiClientError);

    updateItemSpy.mockRestore();
  });
});
