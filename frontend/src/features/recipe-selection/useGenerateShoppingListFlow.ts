import { useState } from 'react';
import type { GenerateShoppingListInput } from '@recipe-box/shared';

import { useGenerateShoppingList, useShoppingList } from '../shopping-list/hooks';

export interface UseGenerateShoppingListFlowResult {
  /** Whether a shopping list already exists to warn about, per AC5. */
  hasExistingList: boolean;
  /** True while the existing-list check is still in flight — callers should wait before enabling Generate. */
  isCheckingExistingList: boolean;
  isConfirmOpen: boolean;
  /** Call from the Generate control. Opens the AC5 confirmation if a list exists, otherwise generates immediately. */
  requestGenerate: () => void;
  confirmGenerate: () => void;
  cancelGenerate: () => void;
  isGenerating: boolean;
  /** True once generation has succeeded — callers use this to move to the shopping list screen (AC3). */
  isGenerated: boolean;
  generateError: Error | null;
}

/**
 * Orchestrates TEST-153 AC3/AC5: generate a list from the given recipe ids,
 * warning first if a list already exists (regeneration merges into it rather
 * than replacing it — see TEST-76's binding decision).
 */
export function useGenerateShoppingListFlow(input: GenerateShoppingListInput): UseGenerateShoppingListFlowResult {
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const shoppingListQuery = useShoppingList();
  const generateMutation = useGenerateShoppingList();

  const hasExistingList = shoppingListQuery.isSuccess;

  function requestGenerate() {
    if (hasExistingList) {
      setConfirmOpen(true);
      return;
    }
    generateMutation.mutate(input);
  }

  function confirmGenerate() {
    setConfirmOpen(false);
    generateMutation.mutate(input);
  }

  function cancelGenerate() {
    setConfirmOpen(false);
  }

  return {
    hasExistingList,
    isCheckingExistingList: shoppingListQuery.isLoading,
    isConfirmOpen,
    requestGenerate,
    confirmGenerate,
    cancelGenerate,
    isGenerating: generateMutation.isPending,
    isGenerated: generateMutation.isSuccess,
    generateError: generateMutation.error,
  };
}
