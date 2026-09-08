import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as shoppingListHooks from '../shopping-list/hooks';
import { useGenerateShoppingListFlow } from './useGenerateShoppingListFlow';

vi.mock('../shopping-list/hooks');

const mockUseShoppingList = vi.mocked(shoppingListHooks.useShoppingList);
const mockUseGenerateShoppingList = vi.mocked(shoppingListHooks.useGenerateShoppingList);

function mockShoppingListQuery(overrides: { isSuccess: boolean; isLoading?: boolean; data?: object }) {
  mockUseShoppingList.mockReturnValue({
    isSuccess: overrides.isSuccess,
    isLoading: overrides.isLoading ?? false,
    data: overrides.data,
  } as unknown as ReturnType<typeof shoppingListHooks.useShoppingList>);
}

function mockGenerateMutation(
  overrides: { isPending?: boolean; isSuccess?: boolean; error?: Error | null } = {},
) {
  const mutate = vi.fn();
  mockUseGenerateShoppingList.mockReturnValue({
    mutate,
    isPending: overrides.isPending ?? false,
    isSuccess: overrides.isSuccess ?? false,
    error: overrides.error ?? null,
  } as unknown as ReturnType<typeof shoppingListHooks.useGenerateShoppingList>);
  return mutate;
}

describe('useGenerateShoppingListFlow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('generates immediately when no list exists yet, no confirmation', () => {
    mockShoppingListQuery({ isSuccess: false });
    const mutate = mockGenerateMutation();

    const { result } = renderHook(() => useGenerateShoppingListFlow({ recipeIds: ['recipe-1'] }));

    act(() => result.current.requestGenerate());

    expect(mutate).toHaveBeenCalledWith({ recipeIds: ['recipe-1'] });
    expect(result.current.isConfirmOpen).toBe(false);
  });

  it('opens the AC5 confirmation instead of generating when a list already exists', () => {
    mockShoppingListQuery({ isSuccess: true, data: { id: 'list-1', items: [], createdAt: '', updatedAt: '' } });
    const mutate = mockGenerateMutation();

    const { result } = renderHook(() => useGenerateShoppingListFlow({ recipeIds: ['recipe-1'] }));

    act(() => result.current.requestGenerate());

    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.isConfirmOpen).toBe(true);
  });

  it('generates on confirm and closes the confirmation', () => {
    mockShoppingListQuery({ isSuccess: true, data: { id: 'list-1', items: [], createdAt: '', updatedAt: '' } });
    const mutate = mockGenerateMutation();

    const { result } = renderHook(() => useGenerateShoppingListFlow({ recipeIds: ['recipe-1', 'recipe-2'] }));

    act(() => result.current.requestGenerate());
    act(() => result.current.confirmGenerate());

    expect(mutate).toHaveBeenCalledWith({ recipeIds: ['recipe-1', 'recipe-2'] });
    expect(result.current.isConfirmOpen).toBe(false);
  });

  it('cancelling the confirmation never generates', () => {
    mockShoppingListQuery({ isSuccess: true, data: { id: 'list-1', items: [], createdAt: '', updatedAt: '' } });
    const mutate = mockGenerateMutation();

    const { result } = renderHook(() => useGenerateShoppingListFlow({ recipeIds: ['recipe-1'] }));

    act(() => result.current.requestGenerate());
    act(() => result.current.cancelGenerate());

    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.isConfirmOpen).toBe(false);
  });

  it('surfaces the loading and error state of the underlying mutation', () => {
    mockShoppingListQuery({ isSuccess: false });
    const error = new Error('boom');
    mockGenerateMutation({ isPending: true, error });

    const { result } = renderHook(() => useGenerateShoppingListFlow({ recipeIds: [] }));

    expect(result.current.isGenerating).toBe(true);
    expect(result.current.generateError).toBe(error);
  });

  it('reports isGenerated once the mutation succeeds, for the caller to move to the list screen (AC3)', () => {
    mockShoppingListQuery({ isSuccess: false });
    mockGenerateMutation({ isSuccess: true });

    const { result } = renderHook(() => useGenerateShoppingListFlow({ recipeIds: ['recipe-1'] }));

    expect(result.current.isGenerated).toBe(true);
  });
});
