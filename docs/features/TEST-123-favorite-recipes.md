# TEST-123 — Favorite a recipe and filter the recipe box by favorites

## What this is

A star toggle on the recipe list and the recipe detail view, plus a "Favorites
only" checkbox on the recipe box that combines with the existing title/
ingredient search rather than replacing it.

`is_favorite` has existed on the `recipes` table since its first migration,
and the shared `Recipe` type has always had `isFavorite`, but nothing could
ever set it to `true` before this ticket — `POST`/`PUT` deliberately never
write it (see `docs/features/TEST-72-recipe-crud-api.md`, which reserved this
column for TEST-123). This ticket is the write path plus the UI, not a schema
change.

## How it's laid out

**Backend** — new `PATCH /api/recipes/:id`, same layering as every other
recipe route:

- **`backend/src/routes/recipesRoutes.ts`** — `PATCH /:id`, `requireOwner`-protected like `GET`/`PUT`/`DELETE`, validated with a new dedicated schema.
- **`backend/src/schemas/recipeSchemas.ts`** — `recipeFavoriteInputSchema`, `{ isFavorite: boolean }`, `.strict()`. Deliberately separate from `recipeInputSchema`/`RecipeInput` rather than extending them — `PUT` still can't touch `is_favorite`, so the "survives an unrelated edit" guarantee is enforced by which schema a route uses, not by a runtime check.
- **`backend/src/controllers/recipesController.ts`** — `setFavorite`, same shape as `updateRecipe`/`deleteRecipe` (`404` via the existing `RECIPE_NOT_FOUND` shape on a missing id).
- **`backend/src/services/recipesService.ts`** — thin delegator, matching the other six functions.
- **`backend/src/repositories/recipesRepository.ts`** — `setRecipeFavorite`, a single-statement `UPDATE ... SET is_favorite = $2, updated_at = now()` then a re-select through the existing `RECIPE_SELECT`/`mapRowToRecipe` path. No transaction needed (single row, single statement).

**No backend filter surface.** `GET /api/recipes` was already returning
`isFavorite` on every recipe; the "Favorites only" filter is entirely
client-side, the same way title/ingredient search already was (TEST-72
recorded that decision).

**Frontend**

- **`frontend/src/features/recipes/api.ts`** — `RecipesApi.setFavorite(id, isFavorite)`, `PATCH /recipes/:id` with `{ isFavorite }` (mirrors `shopping-list/api.ts`'s `updateItem`). Also exports `__resetMockRecipesForTests()` (same pattern as the shopping-list mock) so tests that actually favorite something through the UI don't leak that mutation into a later test in the same file.
- **`frontend/src/features/recipes/hooks.ts`** — `useSetFavorite()`, optimistic: writes the new `isFavorite` into both the list and detail query caches in `onMutate`, rolls back both in `onError`, re-syncs via `invalidateQueries` in `onSettled`. Same shape as the shopping-list optimistic check-off.
- **`frontend/src/features/recipes/RecipeListItem.tsx`** — a plain `★`/`☆` button in `CardHeader`, `aria-pressed`/`aria-label` carrying the state (never colour alone). `stopPropagation`/`preventDefault` so it doesn't also trigger the row's link navigation or the TEST-153 selection-mode stretched-label overlay it sits above.
- **`frontend/src/features/recipes/RecipeDetail.tsx`** — the same star, in `PageHeader`'s actions slot before "Add to shopping list"/"Edit"/"Delete".
- **`frontend/src/features/recipes/useRecipeSearch.ts`** — `favoritesOnly`/`setFavoritesOnly` state, ANDed into the existing search predicate (AC3: combines, doesn't replace).
- **`frontend/src/features/recipes/RecipeBox.tsx`** — a `Checkbox` labeled "Favorites only" next to the search `Input`, and a third empty-state branch (distinct from "no recipes yet" and "no matches") for when the filter is on and nothing is favorited yet (AC4).

No icon library is used — there wasn't one in the repo already, and a single
Unicode glyph matches the existing pattern (`Modal`'s close button).

## Decisions worth knowing about

- **`PATCH`, not a `/favorite` sub-route.** Chosen to mirror the existing `PATCH /api/shopping-list/items/:id` precedent (same resource path, a dedicated partial schema) rather than inventing a new URL shape.
- **The client sends the desired value, not a blind toggle.** `{ isFavorite: true | false }`, matching how the shopping-list `PATCH` already works for `checked`. The client always has the current value from the fetched recipe, so there's no reason to make the server infer a flip.
- **No shared-type change.** `Recipe.isFavorite` already existed in `shared/src/types.ts`; the `PATCH` body isn't tied to a shared partial type via `satisfies`, following the same precedent as the shopping-list item patch schema (which isn't tied to one either).
- **Optimistic update, not invalidate-then-wait.** AC1 requires the star to render filled "immediately" — with the mock API's simulated latency, waiting for the real response would visibly lag. The cache is written in `onMutate` and rolled back in `onError`, identical in shape to the shopping-list's optimistic check-off (see `docs/testing.md`'s section on that pattern for why it's tested with a manually-controlled promise rather than the real timer).
- **The list-star click handler stops propagation.** The row is either a navigation `<Link>` or (in TEST-153 selection mode) has a stretched invisible `<label>` overlay on top of it; without `stopPropagation`/`preventDefault`, tapping the star would also navigate or toggle selection.
- **Favorites-only empty state takes priority over "no matches" when there are zero favorites at all**, regardless of the search term — it's more useful to tell someone "you haven't favorited anything yet" than "no results," even if they'd also typed a search term. If there's at least one favorite anywhere but the current search excludes it, the ordinary "no matches" state is shown with favorites-aware copy.
- **Mock-API test isolation.** Favoriting a recipe through the UI in a test hits the real mock implementation and mutates its module-level array; without a reset, that state leaks into whichever test runs next in the same file. Fixed the same way the shopping-list mock already was: a `__resetMockRecipesForTests()` export, called in `beforeEach`. Two tests (`RecipeBox.test.tsx`, `RecipeDetail.test.tsx`) also hold the mock request open with a manually-controlled promise before finishing, rather than let its 150ms simulated delay keep running past the end of the test — the same real-timer trap `docs/testing.md` already documents for the shopping-list suite.

## How it was verified

- **Unit** (`recipesRepository.test.ts`, `recipesService.test.ts`): `setRecipeFavorite`/`setFavorite` set the column and return `null` for a missing id; service delegation confirmed with the repository mocked.
- **Contract** (`recipeSchemas.contract.test.ts`): `recipeFavoriteInputSchema` — valid boolean both ways, missing field, wrong type, `.strict()` rejects an extra field.
- **Integration** (`recipesApi.integration.test.ts`, `recipesRepository.integration.test.ts`): sets the flag both directions, survives an unrelated `PUT`, `400` on a non-boolean body, `404` on a missing id, and a TEST-253-style ownership check (another account's recipe id → `404`, unchanged).
- **Frontend component/hook** (`RecipeListItem.test.tsx`, `RecipeDetail.test.tsx`, `hooks.test.tsx`, `RecipeBox.test.tsx`): star renders/toggles correctly and doesn't also navigate or select; `useSetFavorite`'s optimistic update and rollback (list and detail caches both); the "Favorites only" checkbox filtering, combining with search, and its dedicated empty state.
- **E2E — deferred.** No Playwright or other e2e runner exists in this repository (no config, no dependency) — this is the same, already-accepted gap tracked by **TEST-232**, which multiple prior tickets have deferred to.
- Full suite run, all green by real exit code: `npm run lint`, `npm run build`, `npm test -w frontend` (165 tests), `npm run test:unit -w backend` (86 tests), `npm run test:contract -w backend` (47 tests), `npm run test:integration -w backend` (81 tests, `TEST_DATABASE_URL=postgres://localhost:5432/mealbox_test`).

## Acceptance criteria coverage

- **AC1** (toggle from the list, renders filled immediately): `RecipeListItem`/`RecipeBox` component tests plus the optimistic-update hook test.
- **AC2** (toggle from detail, matches the list on return): `RecipeDetail` component test; both screens read the same React Query cache key so there's nothing extra to reconcile.
- **AC3** (favorites-only combines with search): `useRecipeSearch`'s ANDed predicate, exercised in `RecipeBox.test.tsx`.
- **AC4** (empty state explains how to favorite): dedicated `RecipeBox` empty-state branch and test.
- **AC5** (persists across reload): the flag lives on the `recipes` row itself (not client state), so this follows from the integration tests round-tripping it through Postgres — no separate mechanism needed.
