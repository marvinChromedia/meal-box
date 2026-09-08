# TEST-250 — Real landing screen

## What changed

`/` (`frontend/src/features/home/HomePage.tsx`) replaces the placeholder stack of text links with a screen that reports what's actually in the account: a time-of-day greeting, how many recipes are saved, the shopping list's item count and how many are checked off, and the five most-recently-added recipes, each linking straight to it. It's now behind `RequireAuth` like every other real screen (auth had already landed, per the ticket's own notes). No new endpoints — `useRecipes()` and `useShoppingList()` are the same hooks the recipe box and shopping list screens already use; "recently added" is a client-side sort on `Recipe.createdAt`.

## Decisions

**No email in the greeting.** The header (TEST-249) already shows the signed-in user's email persistently on every screen — repeating it in the greeting would be redundant. The greeting stays generic ("Good morning"/"Good afternoon"/"Good evening"/"Good night").

**The two async sections are genuinely independent (AC4), not just visually separate.** The shopping-list summary mounts as its own component regardless of whether the recipes query above it is loading, has failed, or has succeeded — the only thing that suppresses it is a *confirmed* first-run account (see below). This matters: an earlier draft nested the shopping-list summary inside the recipes-populated branch, which would have hidden it entirely while recipes were loading or if the recipe request failed — exactly what AC4 says not to do. Tests for this: `HomePage.test.tsx` has a case where the shopping list resolves while recipes is still loading, and one where the shopping list errors while recipes render populated — both check the other section renders normally.

**First run hides the shopping-list section entirely (AC2), not just the recipe count.** With zero recipes, there is nothing for a shopping-list summary to summarize either — showing "no shopping list yet" next to a big "add your first recipe" invitation would be clutter, not information. First run is `recipesQuery.isSuccess && recipes.length === 0` specifically (not "recipes is falsy" or "still loading") — a loading or errored recipes query isn't yet known to be a first-run account, so the shopping-list section still shows in those cases.

**The greeting is a pure function (AC5), not a component test that reads the clock.** `getGreeting(date: Date): string` lives in `greeting.ts` and is unit-tested directly against fixed `Date` instances at every hour boundary. `HomePage.test.tsx` doesn't assert on the greeting's exact text at all — it can't know what time it is when the suite runs, and asserting on `getGreeting(new Date())`'s real output would just be re-testing the same pure function through an unnecessary extra layer. The ticket's own notes suggested reusing "TEST-235's" pattern for this — worth a correction: TEST-235 fixed a different bug (a real async-mutation race, via a manually-controlled promise) and never touched clock/`Date` logic. There is no existing clock-injection pattern anywhere in this repo; this ticket establishes the pure-function one instead.

**404 handling reuses `ShoppingList.tsx`'s exact precedent**, not a new check: `error.code === 'SHOPPING_LIST_NOT_FOUND'` (not `error.status === 404` directly) distinguishes "no list yet" from a real failure.

## Tests

- `greeting.test.ts` — all hour boundaries (0, 4, 5, 11, 12, 16, 17, 20, 21, 23), pure function, no clock.
- `HomePage.test.tsx` (7 tests, mocking `recipesApi`/`shoppingListApi` the same way `RecipeBox.test.tsx`/`ShoppingList.test.tsx` already do) — loading, error-with-retry, first-run invitation, no-list-yet-is-not-an-error, populated counts/checked-off total/recently-added links in the right order, and the two AC4 independence cases described above.
- Full suite: `npm test -w frontend` — 134 tests, 25 files, exit 0. `npm run lint` exit 0. `npm run build` (both workspaces) exit 0.

## Mobile width

**Not visually verified.** No new responsive classes were introduced beyond patterns already used elsewhere in this codebase (`flex flex-wrap`, `flex-col gap-*`), and the screen reuses the same `EmptyState`/`ErrorState`/`LoadingState` components already checked at 375px on other screens. Setting up a local backend to check this in a running browser hit the same shared-dev-database migration conflict noted in TEST-249's feature doc — flagging again rather than re-describing it, since it's the same underlying issue blocking a live check across both tickets.

## End-to-end

Required (a new user-visible screen and flow) but no E2E runner is installed. Deferred to **TEST-232** by name, same as TEST-249 and the earlier UI tickets.
