# TEST-72 — Recipe data model & CRUD API

## What this is

The backend endpoints that let the recipe box screens actually save, read, change and remove recipes: `POST /api/recipes`, `GET /api/recipes`, `GET /api/recipes/:id`, `PUT /api/recipes/:id`, `DELETE /api/recipes/:id`. Everything is validated before it reaches the database, and every response follows the same shapes the frontend is already typed against in `shared/src/types.ts`.

## How it's laid out

Follows the route → controller → service → repository layering from `CLAUDE.md`:

- **`backend/src/routes/recipesRoutes.ts`** — wires each verb to a validation step and a controller method.
- **`backend/src/controllers/recipesController.ts`** — parses the (already-validated) request, calls the service, shapes the HTTP response (status code, `404` on a missing recipe). No SQL or business logic here.
- **`backend/src/services/recipesService.ts`** — sits between the controller and the repository. Currently a thin pass-through; it's the seam where TEST-76 (shopping-list generation) and TEST-159 (ownership/auth) can add logic later without touching the controller or the repository.
- **`backend/src/repositories/recipesRepository.ts`** — the only code that talks SQL (pre-existing from TEST-78; this ticket adds `updateRecipe` and makes `deleteRecipe` report whether a row actually existed). Every row is parsed through a Zod schema before becoming a domain type.
- **`backend/src/schemas/recipeSchemas.ts`** — the Zod boundary schemas (`recipeInputSchema`, `recipeIdParamSchema`), checked against the shared `RecipeInput` type with `satisfies` so the two can't silently drift apart.
- **`backend/src/middleware/validate.ts`** — generic `validateBody` / `validateParams` middleware; rejects with `400 { error: { message, code: 'VALIDATION_ERROR' } }` before any controller or service code runs (AC5).
- **`backend/src/middleware/asyncHandler.ts`** — wraps async controller methods so a rejected promise reaches Express's error handler instead of hanging or crashing the process.
- **`backend/src/app.ts`** — `createApp(pool)` now takes the database pool as a parameter (defaulting to the app's real pool) instead of importing a module-level singleton directly, so tests can point it at a test database without touching global state. Also adds a catch-all error handler so an unexpected failure still returns the standard `{ error: { message, code } }` shape rather than a stack trace.

## Decisions worth knowing about

- **Update replaces the ingredient set.** `PUT /api/recipes/:id` deletes all existing `recipe_ingredients` rows for that recipe and re-inserts the new set inside one transaction (`withTransaction`), rather than diffing and patching individual rows. This is what AC3's "no orphaned ingredient rows" means in practice, and it matches the assumption already recorded on TEST-75 (the edit form submits a full ingredient list, not a patch).
- **Validation minimums beyond what AC5's examples spell out:** the schema requires a non-empty title, at least one step and at least one ingredient. The ticket doesn't give an exact minimum, but TEST-75 AC1 requires the same minimums client-side and TEST-75 AC5 requires the form to "apply the same rules the API enforces — never contradicting them." Enforcing them here is what makes that possible; recorded here so TEST-75 doesn't have to guess. Tags are not required to be non-empty — a recipe can have zero tags.
- **An ingredient's `unit` can be an empty string.** Per the shared contract's own note, unit is free text and empty is valid for countable ingredients ("2 onions"). Not enforced as non-empty.
- **`isFavorite` is untouched by update.** `PUT` never writes `is_favorite` — TEST-123 owns that column exclusively, so a recipe's favorite state survives an unrelated edit.
- **No ownership yet.** There's no `user_id` column and no auth check — every recipe is global. Endpoints take an id and nothing else, so TEST-159 can add a `user_id` filter/check later without reshaping the routes.
- **Server-side search stays out of scope**, confirmed on this ticket in Beacon: TEST-73 filters client-side over the fetched list, so `GET /api/recipes` has no query-parameter search surface.
- **Malformed vs. unknown id:** an id that isn't a valid UUID fails `validateParams` and returns `400`; a well-formed UUID that doesn't match any row returns `404` from the controller. Neither path reaches the database with a bad value or produces a `500`.

## How it was verified

- **Unit** (`backend/test/unit/recipesService.test.ts`): the service layer with the repository mocked via `vi.mock` — confirms each service function delegates to the right repository call and forwards `null`/`false` results (not-found cases) unchanged.
- **Contract** (`backend/test/contract/recipeSchemas.contract.test.ts`): the Zod schemas directly, no DB or HTTP involved — valid input, missing title, empty title, non-numeric quantity, unknown top-level field, unknown ingredient field, empty ingredients/steps lists, empty tags list, valid/invalid id.
- **Integration** (`backend/test/integration/recipesApi.integration.test.ts` and additions to `recipesRepository.integration.test.ts`): Supertest against the real Express app and a real test Postgres database — all five verbs, the AC4 cascade (deleting a recipe removes its ingredient rows), the AC3 no-orphans update, a 400 on invalid input reaching the real route, and 404s for missing/malformed ids.
- Full suite run: `npm run build` (both workspaces), `npm run test -w backend` (unit + contract + integration), `npm run test -w frontend`, `npm run lint`, `npx prettier --check` — all green, verified by real exit code.

## Acceptance criteria coverage

- **AC1** (create): integration test — `POST /api/recipes` returns `201` with a generated id, timestamps and the saved ingredients.
- **AC2** (list/read, saved order): integration test — list and single-read return the `Recipe` shape with ingredients in insertion order (via the existing `position` column).
- **AC3** (update, no orphans): integration test on both the route and the repository directly — ingredient count and rows match the new set exactly.
- **AC4** (delete, cascade): integration test — recipe gone from the list, `404` on re-read, zero `recipe_ingredients` rows remaining.
- **AC5** (invalid input rejected at the boundary): contract tests (schema-level) plus one integration test confirming a real `400` response and that nothing was persisted.
- **AC6** (unknown/malformed id handled): integration tests — malformed id → `400`; well-formed but unknown id → `404`; neither a `500` nor a stack trace.
