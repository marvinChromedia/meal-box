# TEST-155 — API client + data-fetching setup

The one way the frontend talks to the backend: a typed fetch client, a single React Query provider, a documented query-key scheme, and error normalization. Every screen ticket (TEST-73, TEST-74, TEST-75, TEST-77, TEST-153, TEST-154) and TEST-157 consumes this rather than hand-rolling a fetch.

## Why

Five-plus sessions building screens in parallel would otherwise each invent their own fetch wrapper and cache-key scheme, and the seams between them (which query gets invalidated by which mutation, what an error looks like by the time a component sees it) would be renegotiated on every branch. This ticket picks those conventions once so the rest follow it.

## Layout

```
frontend/src/lib/api/
  config.ts        API_BASE_URL / API_MODE from Vite env
  auth.ts           the auth seam (see below)
  http.ts           apiRequest<T>() + ApiClientError + error normalization
  queryKeys.ts       the query-key factory
  queryClient.ts     the shared QueryClient instance + defaults
  mockDelay.ts       shared latency simulator for mock api.ts files

frontend/src/features/recipes/
  api.ts             RecipesApi interface + http/mock implementations
  hooks.ts           useRecipes, useRecipe, useCreateRecipe, useUpdateRecipe, useDeleteRecipe
  hooks.test.tsx

frontend/src/features/shopping-list/
  api.ts             ShoppingListApi interface + http/mock implementations
  hooks.ts           useShoppingList, useGenerateShoppingList, useAddShoppingListItem,
                     useUpdateShoppingListItem, useRemoveShoppingListItem
  hooks.test.tsx
```

`main.tsx` wraps the app in a single `QueryClientProvider` using the exported `queryClient` — AC2's "one place" for retry/stale-time/refetch defaults.

## Conventions other tickets must follow

### Query keys (`lib/api/queryKeys.ts`)

Shape: **`[resource, operation, ...params]`**.

```ts
queryKeys.recipes.all              // ['recipes']                — invalidate everything recipe-related
queryKeys.recipes.lists()          // ['recipes', 'list']
queryKeys.recipes.detail(id)       // ['recipes', 'detail', id]
queryKeys.shoppingList.all         // ['shopping-list']
queryKeys.shoppingList.detail()    // ['shopping-list', 'detail']
```

`resource` always comes first so a mutation can invalidate the whole resource with one call (`invalidateQueries({ queryKey: queryKeys.recipes.all })`) without enumerating every narrower key. Adding a new resource means adding a new top-level entry with the same `all` / narrower-key shape — don't hand-write ad-hoc arrays inside a hook or component.

### Hook naming

`use<Verb><Resource>` for mutations (`useCreateRecipe`, `useUpdateShoppingListItem`), `use<Resource>` / `use<Resource(Singular)>` for queries (`useRecipes`, `useRecipe(id)`, `useShoppingList`). Every mutation invalidates via `queryKeys.<resource>.all` in its `onSuccess`, not just the narrower key it changed — a screen ticket adding a new mutation should follow the same shape rather than one-off invalidation logic.

### Errors (`lib/api/http.ts`)

Every failure `apiRequest` can throw is an `ApiClientError` (`message`, `code`, `status`):

- A `{ error: { message, code } }` response body (matching the shared `ApiError` type) → `code`/`message` taken verbatim, `status` set from the HTTP response.
- A non-2xx response whose body isn't that shape (or isn't JSON) → `code: 'NON_JSON_RESPONSE'` or `'UNKNOWN_ERROR'`, generic message, `status` still set.
- A rejected `fetch` (offline, DNS, CORS) → `code: 'NETWORK_ERROR'`, `status: null`.

A hook never needs to branch on "was this a network problem or an API error" — `error.code` and `error.message` are always there. React Query surfaces this as the `error` field on a query/mutation result exactly as it does for any other thrown value.

### The auth seam (`lib/api/auth.ts`)

`apiRequest` calls `getAuthHeaders()` on every request and merges the result into the request headers. Right now nothing calls `setAuthHeaderProvider`, so it's a no-op. TEST-159 attaches credentials by calling `setAuthHeaderProvider(() => ({ Authorization: ... }))` once at app startup — no hook or `api.ts` file changes when that lands.

### Mock-first, per AC5

Every feature's `api.ts` defines an interface (`RecipesApi`, `ShoppingListApi`) with two implementations — one that calls `apiRequest` against the real backend, one that's an in-memory typed mock seeded with shared-shape fixtures. `VITE_API_MODE` (`frontend/.env.example`, defaults to `mock`) picks which one `hooks.ts` gets; hooks only ever import the interface, never a concrete implementation. Once TEST-72/76 ship, flipping `VITE_API_MODE=http` (or removing the flag) switches every hook to the real backend with no call-site changes. Adding a new resource means following this same interface + two-implementation split.

## Decisions later tickets should know about

- **TEST-157** (empty/error/loading states) renders whatever a query/mutation's `isPending` / `isError` / `error` looks like from these hooks — it doesn't need its own fetch or error handling, just to consume the states this ticket already exposes.
- Recipe and shopping-list mutations invalidate their whole resource (`.all`), not just the item that changed. Fine at this scale; if a screen ticket needs a narrower invalidation for a performance reason, do it explicitly in that hook rather than changing the shared default.
- `shared/src/types.ts` (`Recipe`, `Ingredient`, `ShoppingList`, `ShoppingListItem`, `ApiError`, `AuthCredentials`, …) is used as-is; nothing here redefines those shapes.

## Verification

- Unit/component (Vitest + React Testing Library): `frontend/src/lib/api/http.test.ts` (error normalization — API error shape, non-JSON body, network failure, 204, auth header attachment), `frontend/src/features/recipes/hooks.test.tsx`, `frontend/src/features/shopping-list/hooks.test.tsx` (hooks against the typed mock). 12 tests, all passing.
- `eslint` / `prettier` — clean.
- Playwright: not required for this ticket per its Definition of Done — no user-facing surface; covered downstream by the screen tickets' E2E specs and TEST-79.
- Strict-mode typecheck: `frontend/tsconfig.json` has had a broken project reference to `tsconfig.node.json` (missing `composite: true`) since the TEST-150 scaffold, and separately is missing `allowImportingTsExtensions`, which together mean plain `tsc -b` has never actually completed in this workspace — it fails before reaching file-level checks, for any ticket's code, not just this one. Filed separately for a scaffold-config fix. Verified this ticket's own code is strict-mode clean by typechecking with those two pre-existing gaps patched locally (not committed): zero errors across the whole `src` tree, including these new files. Added `frontend/src/vite-env.d.ts` (the standard `/// <reference types="vite/client" />`) as part of this ticket, since nothing before it exercised `import.meta.env` — without it `VITE_API_BASE_URL` / `VITE_API_MODE` in `lib/api/config.ts` don't type-check once the project-reference bug is fixed.

## Acceptance criteria coverage

- **AC1** (typed client, no local shapes, no `any`): `RecipesApi` / `ShoppingListApi` methods return `@recipe-box/shared` types exclusively; verified by strict-mode typecheck (see Verification).
- **AC2** (React Query wired app-wide): single `queryClient` from `lib/api/queryClient.ts`, provided once in `main.tsx`.
- **AC3** (one documented key scheme): see "Query keys" above; enforced by every hook going through `queryKeys`.
- **AC4** (errors arrive usable): see "Errors" above; covered by `http.test.ts`.
- **AC5** (usable before the API exists): mock/http split per resource, default `mock`; covered by the two `hooks.test.tsx` files running entirely against the mock implementations.
