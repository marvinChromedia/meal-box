# TEST-235 — Two unrelated test-reliability problems

## What this is

Two different causes were behind "some frontend tests fail intermittently," and they needed two different responses: a real race (already fixed elsewhere, audited for anywhere else it might exist) and load-induced timeouts (not a bug, made tolerable and documented).

## Problem A — a racing real timer

Already fixed, before this ticket, in `frontend/src/features/shopping-list/hooks.test.tsx`: a test asserting a transient optimistic-then-settled state was racing `waitFor` against the mock layer's real `mockDelay()` timing — reproducible 100% of the time running that file alone, at zero load. The fix (hold a manually controlled promise, assert the mid-flight state explicitly, then resolve it) is already in that file.

**This ticket's job for Problem A was to audit, not to re-fix.** Checked every frontend test file for the same construction — a test asserting `isPending`, or any other mid-flight state, without holding a deferred promise open. Only the already-fixed file has it. Nothing else needed changing.

**`RecipeBox.test.tsx`'s "no matches" test and `RecipeDetail.test.tsx`'s "confirms before deleting" test were investigated and explicitly left alone.** Both were suspected at one point of having Problem A. Neither does: both simply `waitFor` an eventually-settled outcome (no matches shown after typing; navigated away after a real deletion completes), which isn't racy against a 150ms mock delay regardless of timing — `waitFor` polls until the assertion passes, it doesn't care how long that takes. Partway through this ticket, an attempt was made to apply the deferred-promise technique to `RecipeDetail.test.tsx` anyway, on the reasoning that it would make the test's ordering "provably" explicit rather than "incidentally reliable." That was reverted: the current, correct standard is not to rewrite a test that can't be shown broken, and rewriting it briefly reached `main` before being caught and undone in this same branch. See "How it was verified" for the actual failure output that settled this.

## Problem B — a starved machine, not a bug

The two tests above (and a third: `RecipeBox`'s "lists saved recipes") did fail, on separate occasions, with output that has nothing to do with Problem A:

```
RecipeBox "no matches"                → Unable to find an element with the text: Garlic Butter Pasta
RecipeBox "lists saved recipes…"      → Unable to find an element with the text: Garlic Butter Pasta
RecipeDetail "confirms before delete" → Test timed out in 5000ms
```

The first two failed with the DOM still showing the loading state (`<p role="status">Loading recipes…</p>`) — the initial fetch simply hadn't resolved before `waitFor` gave up. The third is a test-level timeout, not a failed assertion. The decisive evidence was elsewhere in the same runs: unrelated, trivial tests were also absurdly slow — a plain `Button` test took 4.7 seconds, an `EmptyState` test 2.3 seconds, numbers with no relationship to what those tests actually do. That's a saturated machine, not an application race: six sessions were building, testing and running dev servers on the same machine at once.

**The response is tolerance, stated as tolerance, not a race fix wearing a bigger number:**

- `frontend/src/test/setup.ts` raises React Testing Library's `asyncUtilTimeout` from its 1000ms default to 5000ms.
- `frontend/vite.config.ts` raises Vitest's `testTimeout` from its 5000ms default to 15000ms.
- Both carry a comment at the site explaining why, so a future reader doesn't mistake either for a race workaround.

## Why the distinction matters enough to write down

If Problem B's timeouts had been "fixed" by applying Problem A's technique to unaffected tests, the result would have been churn without safety: the tests would still time out under real contention just the same (a deferred promise controls _order_, not wall-clock budget), and the added complexity would make the next investigation slower, not faster. `docs/testing.md` now spells out how to tell the two apart — whether unrelated trivial tests were also slow in the same run — so the next intermittent failure doesn't require re-deriving this.

## How it was verified

- Audited every frontend test file for Problem A's construction (an `isPending`/mid-flight assertion without a held-open promise): only the already-fixed shopping-list file has it.
- Reproduced neither Problem A nor Problem B in this session directly: 15 total consecutive runs across the investigation (5 full-suite, 5 of `RecipeBox.test.tsx` + `RecipeDetail.test.tsx` together, 5 more full-suite after the timeout change) — all green, real exit codes checked each time. Consistent with Problem B being load-dependent rather than absent.
- `npm run build`, `npm run lint`, `npx prettier --check` on every touched file (direct binary, not the proxied command that has been known to mask a nonzero exit): all exit 0.
- Confirmed `RecipeBox.test.tsx` and `RecipeDetail.test.tsx` are byte-identical to their pre-TEST-235 state — untouched, per the ticket's explicit requirement.

## Acceptance criteria coverage

- **AC1** (Problem A stays fixed and documented): the shopping-list fix is unchanged; `docs/testing.md` names the trap and the technique.
- **AC2** (audit recorded): stated above and in `docs/testing.md` — no other test has the construction.
- **AC3** (Problem B made tolerable, justified in writing as tolerance not a race fix): `asyncUtilTimeout` and `testTimeout` both raised, each with a comment saying why, in `docs/testing.md` and at the change site.
- **AC4** (the distinction written down): `docs/testing.md`, "Two ways a test can look flaky" — the unrelated-trivial-tests-were-also-slow check is the concrete thing to look for.
- **The two named tests untouched**: confirmed byte-identical to their pre-ticket state.
