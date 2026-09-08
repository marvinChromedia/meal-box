# TEST-253 — Recipes are scoped to the authenticated account

## What changed

`recipes.user_id` existed on the table since TEST-159's migration but was never read or written anywhere in the request path. Any signed-in account could list, read, edit, and delete every other account's recipes — authentication (`requireAuth`) was correctly in place, but ownership (authorization) never was. Fixed:

- `recipesRepository.createRecipe(pool, input, userId)` now inserts `user_id`.
- `recipesRepository.listRecipes(db, userId)` now filters `WHERE r.user_id = $1` (it had no `WHERE` clause at all before).
- New `recipesRepository.getRecipeOwnerId(db, id)` — a minimal lookup used only to wire ownership checks; `user_id` is not part of the public `Recipe` shape and this function is the only thing that reads it directly.
- `recipesRoutes.ts` now applies the existing `requireOwner` middleware (`backend/src/middleware/requireOwner.ts` — built by TEST-159, wired into zero routes until now) to `GET/PUT/DELETE /api/recipes/:id`.
- `recipesController`/`recipesService` thread `req.user.id` through to `createRecipe`/`listRecipes`.

## Security review (CLAUDE.md §8)

**What this was, precisely.** Not an unauthenticated API — `requireAuth` was already correctly mounted globally for `/api/recipes` in `app.ts`, confirmed by reading it directly rather than assuming. The gap was authorization, not authentication: any two signed-in accounts could read and write each other's recipes by id, and every account's `GET /api/recipes` returned the same global list.

**What was checked:**
- `user_id` is set exactly once, at creation, from `req.user.id` (the authenticated session) — never accepted from the request body. `RecipeInput`'s shape is unchanged; there is nowhere in the contract a client could supply a `user_id` even if it wanted to.
- `requireOwner`'s existing behavior (already unit-tested in `test/unit/requireOwner.test.ts`, untouched here) returns `404` for both "doesn't exist" and "exists but isn't yours," deliberately indistinguishable — verified this still holds through the actual HTTP layer, not just the middleware in isolation, with new integration tests using two real registered accounts.
- Checked for other places `recipesRepository`'s functions are called from, to confirm nothing else needed updating for the new required `userId` parameter (`recipesService.ts` was the only caller).
- `getRecipeOwnerId` is deliberately separate from `getRecipeById` so `user_id` never has to flow into anything returned to a client.

**What this does not fix (flagged, not silently left):** `shopping_lists`/`shopping_list_items` have the identical gap — same missing `user_id` wiring, same unused `requireOwner`. Raising this as a separate ticket rather than folding it into this diff, since it's a distinct set of files with its own diff to review on its own merits.

## A pre-existing test assertion this fix legitimately changes

`recipesApi.integration.test.ts`'s "returns 404 for an id that does not exist" (`PUT`) expected `{ code: 'RECIPE_NOT_FOUND' }`. Now that `requireOwner` intercepts before the controller runs, a nonexistent id gets the middleware's generic `{ code: 'NOT_FOUND' }` instead — the same 404 status, a different (and now more consistent — the same code a wrong-owner id also gets) error body. Updated the assertion to match; this is the correct, intended consequence of wiring ownership in, not a weakened test. The `DELETE`/`GET` equivalents only asserted `res.status`, so they were unaffected.

## Tests

- New: `test/unit/recipesRepository.test.ts` and `recipesService.test.ts` — `getRecipeOwnerId`, and `listRecipes`/`createRecipe` now require and use a `userId`.
- New: `test/integration/recipesRepository.integration.test.ts` — a real second user row proves `listRecipes` excludes another account's recipes, and `getRecipeOwnerId` round-trips correctly against real data.
- New, the actual point of this ticket: `test/integration/recipesApi.integration.test.ts` — a `TEST-253` describe block registers a second real account and proves, over real HTTP: it never sees the first account's recipes in `GET /api/recipes`; it gets `404` (not the record) reading/updating/deleting the first account's recipe by id; an update attempt from the wrong account doesn't actually change anything; a created recipe's `user_id` matches its creator.
- Confirmed these new tests are real: ran them against the pre-fix code first (by temporarily checking out the prior commit's repository/routes) and watched them fail with the exact cross-account leak they're meant to catch, before confirming green against the fix.
- Full backend suite: `npm run test:unit`, `test:contract`, `test:integration -w backend` (`TEST_DATABASE_URL` set) — 77 + 43 + 70 = 190 tests, exit 0. Frontend suite unaffected (134 tests, exit 0 — this is a backend-only change). `npm run build`/`npm run lint` from the repo root, exit 0.
- One transient failure seen on a single full-suite run in two unrelated shopping-list tests (`shoppingListItemsApi.integration.test.ts`) — confirmed environmental (passed 17/17 immediately after, in isolation, with no code changed in between), consistent with `docs/backend.md`'s documented hazard that `recipe_box_test` is shared across every worktree and reseeded by any concurrent session's integration run. Not caused by this change; re-ran the full suite again afterward and it was clean.

## Docs

`docs/api.md`'s Ownership/session section previously said `requireOwner` was "not yet done" for recipes and shopping-list by-id routes. Updated to say it's done for `/api/recipes`, still an open gap for `/api/shopping-list`.
