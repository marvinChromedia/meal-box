/**
 * Query-key convention for this app: `[resource, operation, ...params]`.
 *
 * - `resource` is always first, so `queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all })`
 *   invalidates every recipes query regardless of operation (list, detail, ...).
 * - `operation` narrows to one query shape ('list' | 'detail' | ...).
 * - Trailing params (a filter object, an id) come last and must be the exact
 *   arguments the corresponding hook was called with, so React Query's key
 *   equality lines up with what's actually cached.
 *
 * Add a resource by following this same `all` / narrower-key shape — don't
 * hand-write ad-hoc arrays in a hook.
 */
export const queryKeys = {
  recipes: {
    all: ['recipes'] as const,
    lists: () => [...queryKeys.recipes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.recipes.all, 'detail', id] as const,
  },
  shoppingList: {
    all: ['shopping-list'] as const,
    detail: () => [...queryKeys.shoppingList.all, 'detail'] as const,
  },
  auth: {
    all: ['auth'] as const,
    currentUser: () => [...queryKeys.auth.all, 'currentUser'] as const,
  },
};
