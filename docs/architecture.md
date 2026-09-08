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

## What exists today

- `backend/src/app.ts`, `index.ts` — Express app, with the listener separate so tests can import the app.
- `backend/src/db.ts`, `db/queryable.ts`, `db/withTransaction.ts` — typed `pg` pool, a queryable abstraction, and transaction support for multi-row writes.
- `backend/src/repositories/` — `recipesRepository.ts`, `shoppingListsRepository.ts`.
- `backend/migrations/` — two applied migrations creating the recipe and shopping-list tables.
- `frontend/src/components/ui/` — ten UI components; see [`design-system.md`](./design-system.md).
- `frontend/src/pages/DesignSystemPage.tsx` — the live gallery at `/design`.

- `backend/src/routes/`, `controllers/`, `services/`, `schemas/` — the HTTP surface for recipes, following the layering above. `createApp(pool)` takes an optional pool so tests can point it at the test database.
- `backend/src/middleware/` — `validateBody` / `validateParams` (Zod at the boundary) and the async error handler.

The shopping-list HTTP surface does not exist yet — its repository is there, its endpoints are not. Follow the layering when you add them rather than calling a repository from a route.
