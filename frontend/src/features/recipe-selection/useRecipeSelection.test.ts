import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRecipeSelection } from './useRecipeSelection';

describe('useRecipeSelection', () => {
  it('starts out of selection mode with nothing selected', () => {
    const { result } = renderHook(() => useRecipeSelection());

    expect(result.current.isSelectionMode).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('selects and deselects a recipe (AC1)', () => {
    const { result } = renderHook(() => useRecipeSelection());

    act(() => result.current.enterSelectionMode());
    act(() => result.current.toggleRecipe('recipe-1'));

    expect(result.current.isSelected('recipe-1')).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    act(() => result.current.toggleRecipe('recipe-1'));

    expect(result.current.isSelected('recipe-1')).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('tracks more than one selected recipe at once (AC1)', () => {
    const { result } = renderHook(() => useRecipeSelection());

    act(() => result.current.enterSelectionMode());
    act(() => result.current.toggleRecipe('recipe-1'));
    act(() => result.current.toggleRecipe('recipe-2'));

    expect(result.current.selectedCount).toBe(2);
    expect(result.current.selectedIds.sort()).toEqual(['recipe-1', 'recipe-2']);
  });

  it('clears the selection when selection mode is exited', () => {
    const { result } = renderHook(() => useRecipeSelection());

    act(() => result.current.enterSelectionMode());
    act(() => result.current.toggleRecipe('recipe-1'));
    act(() => result.current.exitSelectionMode());

    expect(result.current.isSelectionMode).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });
});
