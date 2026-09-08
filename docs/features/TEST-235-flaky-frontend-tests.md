# TEST-235 — Frontend tests racing a real timer

## What this is

A fix for one test asserting a transient state by racing a real timer (`RecipeDetail.test.tsx`'s "confirms before deleting"), an audit of the rest of the frontend suite for the same pattern, and writing the trap down in `docs/testing.md` so it doesn't get rediscovered from scratch next time.

## Investigation before touching anything

Before editing the named test, tried to actually reproduce the failure rather than apply the prescribed fix on faith:

- Full frontend suite, 5 consecutive runs: green every time, real exit codes checked.
- `RecipeBox.test.tsx` + `RecipeDetail.test.tsx` together, 5 more consecutive runs: green every time.
- Audited every frontend test file for the actual racing pattern (a test asserting a **mid-flight** state — `isPending`, an optimistic update before settlement — without holding a deferred promise open). Only `frontend/src/features/shopping-list/hooks.test.tsx` does this at all, and it already uses the correct pattern; it's the worked example the ticket points at.

Neither `RecipeBox`'s "no matches" test nor `RecipeDetail`'s "confirms before deleting" test, as they stood before this ticket, asserted a mid-flight state — both used `waitFor` to check an eventually-settled outcome, which isn't racy against a 150ms `mockDelay()` under `waitFor`'s 1000ms default timeout regardless of exact timing. So the failure couldn't be reproduced from a cold read of the code, and applying the deferred-promise technique to "confirms before deleting" is done because it makes the test's ordering **provably** explicit rather than incidentally-reliable — not because a specific race was caught in the act during this ticket.

## The fix — `RecipeDetail.test.tsx`, "confirms before deleting"

`recipesApi.remove` is now spied with `mockReturnValueOnce` on a manually-controlled promise. The test:

1. Clicks confirm in the delete dialog.
2. Asserts the button now reads "Deleting…" and the dialog is still open, and that navigation has **not** happened yet — proving the confirm click actually triggered the mutation, deterministically, rather than assuming it because the final state looked right a moment later.
3. Resolves the held promise itself.
4. Only then asserts navigation to the recipe box.

Nothing about what the test asserts changed — same three checks as before (dialog names the recipe, delete happens on confirm, navigation follows). It just controls when "settled" happens instead of trusting a real clock to land the assertion in the right window.

## `RecipeBox.test.tsx` — deferred, not fixed, and not "not applicable"

The ticket's own known-affected list also names `RecipeBox`'s "no matches" test. **Not touched in this branch.** `frontend/src/features/recipes/RecipeBox.tsx` and its test file are inside DEV-5's unpushed TEST-153 commit (selection mode) — editing that test file now creates a merge conflict in a commit that's finished and waiting on a push approval outside this project. Per the coordinating session's explicit instruction: list it rather than fix it.

**To do once TEST-153 lands:** apply the same deferred-promise technique to whichever assertion in that test needs it, following the pattern now written up in `docs/testing.md`. This is listed here so it isn't lost, per AC4's own "fixed too, or listed if left."

## Audit result (AC4)

Beyond the two named tests, no other frontend test asserts a mid-flight mutation state without already holding a deferred promise. Checked: `RecipeForm.test.tsx`, `hooks.test.tsx` (both recipes and shopping-list), `ShoppingList.test.tsx`, `ShoppingListItemRow.test.tsx`, `http.test.ts`, and every `components/ui/*.test.tsx`. All either don't involve an async mutation at all, or (in `ShoppingList.test.tsx`'s case) only assert an eventually-settled outcome via `waitFor`, same as `RecipeBox`/`RecipeDetail` did — not the racy pattern.

## Documentation (AC5)

`docs/testing.md` gets a new "Don't race a real timer" section: what the trap actually is (asserting a mid-flight state against a real clock, not just "any test that awaits something"), why a plain `waitFor` isn't this trap, the fix, and a pointer at the shopping-list file as the worked example. Also corrected a stale test count in the same file's commands table (`npm test -w frontend` said 2 tests; it's 70 now) — small, in the same file already being edited for this ticket.

## How it was verified

- `RecipeDetail.test.tsx` alone, 5 consecutive runs: green, real exit codes.
- Full frontend suite, 5 more consecutive runs after the fix: green, real exit codes (70 tests each time).
- `npm run build`, `npm run lint`, `npx prettier --check` on the touched files (via the direct binary, not the proxied command): all exit 0.
- No assertion weakened or dropped, no timeout raised — AC3 holds.

## Acceptance criteria coverage

- **AC1** (racing tests become deterministic): done for `RecipeDetail`'s test; `RecipeBox`'s is blocked and listed, not silently dropped.
- **AC2** (suite passes repeatedly): 5 consecutive full-suite runs post-fix, plus 5 more of the two originally-named files together, plus 5 of `RecipeDetail.test.tsx` alone during investigation — 15 total runs, all green.
- **AC3** (no weakened assertions): confirmed above — same behavior asserted, ordering made explicit instead of timed.
- **AC4** (audit, not just the two known ones): done — nothing else found; the one known instance not fixed is named, not hidden.
- **AC5** (pattern documented): `docs/testing.md`, "Don't race a real timer".
