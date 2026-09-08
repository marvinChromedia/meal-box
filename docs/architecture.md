# Architecture

npm workspaces monorepo, three packages, each independently runnable or importable.

```text
frontend/   Vite + React 18 + TypeScript (strict) + Tailwind
backend/    Express + TypeScript (strict) + PostgreSQL via pg
shared/     @recipe-box/shared — types crossing the frontend/backend boundary
docs/       Written reference (this directory)
```

Both `frontend/` and `backend/` declare `@recipe-box/shared` as a workspace dependency and have their own `package.json` and `tsconfig.json`, extending the root ESLint and Prettier config.

## The contract seam

`shared/src/types.ts` is the single source of truth for every shape that crosses the boundary: `Recipe`, `Ingredient`, `ShoppingList`, `ShoppingListItem`, `User`, the input DTOs that omit server-generated fields (`RecipeInput`, `IngredientInput`, `ShoppingListItemInput`, `GenerateShoppingListInput`, `AuthCredentials`) and the `ApiError` envelope.

Import from `@recipe-box/shared`. Never redefine those shapes locally — that is the one thing that breaks parallel development, because two branches then disagree about the same data.

The file is owned by the PM session. Changes to it go through that session.

Two conventions encoded in those types rather than in code:

- A shopping-list item with an **empty `sourceRecipeIds`** was added by hand rather than generated from a recipe. "Manual" is derived from that, not stored as a separate flag.
- **`user_id` is deliberately absent** from the shared shapes. Record ownership is a database and auth concern; the API is implicitly scoped to whoever is signed in.

## Request path

```text
route → controller → service → repository → PostgreSQL
```

Each layer has one job. Controllers parse, validate and shape responses. Services hold business logic. Repositories are the only code that talks SQL. See [`backend.md`](./backend.md).

## Frontend data layer

`frontend/src/lib/api/` is the one way the frontend calls the backend — every screen goes through it rather than calling `fetch` directly:

- `http.ts` — `apiRequest<T>()`, the single fetch wrapper. Every failure (an `{ error: { message, code } }` response, a non-JSON body, a rejected `fetch`) normalizes to one `ApiClientError { message, code, status }`.
- `queryClient.ts` / `queryKeys.ts` — the one shared React Query `QueryClient` (retry/stale-time/refetch defaults live here), and the query-key convention: `[resource, operation, ...params]`, e.g. `queryKeys.recipes.detail(id)`.
- `auth.ts` — the auth seam. `apiRequest` merges `getAuthHeaders()` into every request's headers; `setAuthHeaderProvider()` is where TEST-159 attaches credentials, header-shaped rather than cookie-shaped.
- `config.ts` — `VITE_API_BASE_URL` / `VITE_API_MODE` from Vite env (`frontend/.env.example`).

Each resource (`frontend/src/features/recipes/`, `frontend/src/features/shopping-list/`) has an `api.ts` (a typed interface with a real `apiRequest`-backed implementation and an in-memory mock, selected by `VITE_API_MODE`) and a `hooks.ts` (the query/mutation hooks screens actually import — `useRecipes`, `useCreateRecipe`, `useShoppingList`, ...). See [`docs/features/TEST-155-api-client.md`](./features/TEST-155-api-client.md) for the full convention writeup.

## This page describes what exists, so it goes stale

Most pages here describe rules, which stay true. This one and [`api.md`](./api.md) describe the current state of the code, which changes every time a ticket lands. **A change that adds or alters an endpoint, a layer or a test script updates them in the same branch.**

This is not hypothetical: within an hour of these pages first being written, a merged ticket made three of them wrong — one claimed only `/health` existed, another claimed there was no controller layer, a third did not know about a new test script. A new session reading a stale inventory builds against a fiction.

## What exists today

- `backend/src/app.ts`, `index.ts` — Express app, with the listener separate so tests can import the app.
- `backend/src/db.ts`, `db/queryable.ts`, `db/withTransaction.ts` — typed `pg` pool, a queryable abstraction, and transaction support for multi-row writes.
- `backend/src/repositories/` — `recipesRepository.ts`, `shoppingListsRepository.ts`.
- `backend/migrations/` — three applied migrations: the recipe and shopping-list tables, plus an additive `quantity_edited` column on `shopping_list_items` (TEST-76).
- `backend/src/routes/`, `controllers/`, `services/`, `schemas/` — the HTTP surface for recipes and the shopping list, following the layering above. `createApp(pool)` takes an optional pool so tests can point it at the test database.
- `backend/src/middleware/` — `validateBody` / `validateParams` (Zod at the boundary) and the async error handler.
- `backend/src/services/shoppingListService.ts` — the ingredient-combining and regeneration-merge logic, as two pure, DB-free functions (`aggregateIngredients`, `mergeShoppingList`).
- `frontend/src/components/ui/` — fourteen UI components, including `EmptyState`, `LoadingState` and `ErrorState` for the states every data-backed screen needs (TEST-157), a `size="lg"` variant on `Checkbox` for a one-handed checklist (TEST-77), and a `hideLabel` variant on `Input` for a compact field whose purpose is already clear from context (TEST-154); see [`design-system.md`](./design-system.md).
- `frontend/src/pages/DesignSystemPage.tsx` — the live gallery at `/design`.
- `frontend/src/lib/api/`, `frontend/src/features/{recipes,shopping-list}/{api,hooks}.ts` — the frontend data layer described above.
- `frontend/src/features/recipes/{RecipeBox,RecipeDetail}.tsx` — the recipe box list/search and detail screens (TEST-73, TEST-74), routed at `/recipes` and `/recipes/:id`.
- `frontend/src/features/shopping-list/{ShoppingList,ShoppingListItemRow}.tsx` — the shopping-list screen (TEST-77, TEST-154), routed at `/shopping-list`: combined-quantity line items, provenance (which recipes contributed, or "Recipe removed" for a since-deleted one), optimistic check-off, manual add/remove, editable quantities, and clearing the whole list (confirmed first, via `Modal`).

Both the recipes and shopping-list HTTP surfaces now exist (TEST-72, TEST-76, TEST-234 — generation, reading the list, and the per-item add/update/remove endpoints TEST-77 and TEST-154 need). **`VITE_API_MODE` now defaults to `http`** (TEST-154) — both feature `api.ts` files talk to the real backend unless a developer opts into `mock` locally to build a screen ahead of endpoints it needs. "Clearing" the list removes every item but never the `shopping_lists` row itself — confirmed against TEST-234's repository code and live behavior; a cleared list is an empty list, not a deleted one, so `GET /api/shopping-list` keeps returning it with `items: []`. Before *any* list has ever been generated, that same endpoint 404s with `SHOPPING_LIST_NOT_FOUND` instead — a case the mock never modeled (its `get()` never fails), so the screen originally mishandled it as an error; fixed in TEST-154 once the flip to `http` actually exercised it.

**The shared contract guarantees shapes, not paths.** `shared/src/types.ts` fixes what `GenerateShoppingListInput` or a `ShoppingList` look like, but nothing checks that a client calling `/shopping-list/generate` and a server registering `/shopping-list` agree — a typed mock satisfies both sides independently. TEST-234 found and fixed exactly that mismatch after both sides had already merged. There is no structural fix for this yet; it takes someone reading both sides, the way TEST-234 did.
