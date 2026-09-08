# TEST-254 — Default starter recipes for new signups

## What changed

Every new account now gets three starter recipes the moment it registers, instead of an empty recipe box. `authService.register()` calls a new `seedDefaultRecipes(pool, userId)` right after the user row is created, which creates each entry in `backend/src/services/defaultRecipes.ts`'s `DEFAULT_RECIPES` via the existing `recipesRepository.createRecipe` — no new endpoint, no new repository function.

## Content

Three recipes, written directly for this ticket (not copied from any specific site — ingredient lists and steps are original wording for standard, traditional dishes):

- **Chicken Adobo** and **Pancit Canton** — both already named in TEST-250's own landing-page sketch, so a fresh account's "Recently added" list matches the example that ticket sketched out.
- **Garlic Fried Rice** — a simple third, pairs naturally with the other two.

Adjusting the set or count later is a one-file change (`defaultRecipes.ts`) with no other wiring to touch.

## Best-effort, not blocking (AC2)

`seedDefaultRecipes` catches its own errors and logs them (`console.error`, matching the pattern already used in `app.ts` for unhandled request errors) rather than letting a seeding failure propagate — `register()` always returns the created user once the user row itself is committed. A new account being unusable because of a hiccup in a nice-to-have onboarding step would be a worse outcome than that account simply starting with an empty box, same as before this ticket.

This does mean seeding isn't atomic with the user-row insert — accepted deliberately, for the same reason. `recipesRepository.createRecipe` already opens its own transaction per call (per TEST-253), so making it a single atomic unit with the user insert would need `authService.register` and `createRecipe` restructured to share one transaction, which is more invasive than this ticket needs for a best-effort feature.

## Depended on TEST-253

Recipes are only useful to seed once they're actually private to the account that owns them — TEST-253 wired that up first. Every seeded recipe goes through the same `createRecipe(pool, input, userId)` TEST-253 added, so it's scoped identically to anything a real user creates by hand.

## A wider test consequence, fixed in the same commit

Seeding on every registration meant `recipesApi.integration.test.ts`'s `beforeEach` (which registers a fresh account for every test in that file) now gives every test three recipes it didn't have before. Several existing assertions assumed a fresh account's list was empty (`toEqual([])`) or had exactly the one recipe a test created (`toHaveLength(1)`) — updated all of these to account for `DEFAULT_RECIPES.length` explicitly, including TEST-253's own cross-account isolation test (a second account not seeing the first account's recipe no longer means an empty list — it means a list of exactly its own three defaults, not the other account's one). None of these were weakened; each now asserts the same isolation/emptiness intent against the new correct baseline. Confirmed unaffected: `recipesRepository.integration.test.ts` (creates users directly via the repository, bypassing `register()` entirely) and the shopping-list integration suites (generation is scoped by explicit `recipeIds` in the request, never by listing everything in the account, confirmed by reading `shoppingListService.ts` directly rather than assuming).

## Tests

- `test/unit/authService.test.ts` — two new cases: `register()` calls `recipesRepository.createRecipe` once per `DEFAULT_RECIPES` entry with the new user's id; registration still succeeds and returns the user even when the mocked `createRecipe` rejects.
- `test/integration/recipesApi.integration.test.ts` — a real registration followed by `GET /api/recipes` shows exactly the three default titles, each row's `user_id` matching the new account.
- Verified both new unit tests fail correctly without the `seedDefaultRecipes` call (0 calls instead of 3; empty list instead of the default set) before confirming green with it restored — the same red-then-green discipline as TEST-253.
- Full suite: `npm run test:unit`, `test:contract`, `test:integration -w backend`, `npm test -w frontend`, `npm run lint`, `npm run build` — all clean on a dedicated, uncontended run and again in isolation for the changed file. **Several later re-runs of the full suite hit severe, unrelated timeouts** (a `bcrypt` hash test alone took over four minutes; an unrelated health-check test 404'd) consistent with `docs/backend.md`'s documented shared-machine contention — re-running `authService.test.ts` alone during that same window passed cleanly (10/10), confirming the noise was environmental, not this change. Frontend suite unaffected (134 tests) — this is a backend-only change.

## Docs

No `docs/api.md` change — no new endpoint. No frontend change — the already-built landing screen and recipe box render whatever's actually in the account.
