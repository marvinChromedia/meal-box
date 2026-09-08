import { useCallback, useState } from 'react';

/**
 * Selection-mode state for TEST-153 AC1/AC2: which recipes are picked, and
 * whether the recipe box is currently showing selection controls at all.
 * Pure state — RecipeBox wires it to the checkboxes and the generate flow.
 */
export function useRecipeSelection() {
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const enterSelectionMode = useCallback(() => setSelectionMode(true), []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleRecipe = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return {
    isSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    isSelected,
    toggleRecipe,
  };
}
