# TEST-153 — Recipe selection UI for shopping-list generation

## What this is

The missing step between the recipe box and the shopping list: a selection mode on the existing `/recipes` screen that lets someone pick several recipes, see what they've picked, and generate a shopping list from exactly those.

## Mode on the existing screen, not a second screen — as recorded on the ticket

Confirmed with the coordinating session before any code was written, and already recorded in `docs/features/TEST-73-recipe-box-list.md`: TEST-153's own AC1 ("when selection mode is used") describes a toggle, not navigation to a second screen. A separate screen would mean two places fetching and filtering recipes that have to be kept in step with TEST-73's search forever — this avoids that entirely.

## Layout

- **`frontend/src/features/recipes/RecipeBox.tsx`** — extended, not rebuilt. A "Select recipes" / "Cancel" toggle in the header, a selection bar (count + Generate) shown only in selection mode, the AC5 confirmation modal, and a `useEffect` that moves to `/shopping-list` once generation succeeds.
- **`frontend/src/features/recipes/RecipeListItem.tsx`** — extended with an optional `selection` prop. When set, the row renders a labeled `Checkbox` next to the card and toggles selection instead of navigating; the card also gets a highlighted ring border as a secondary (non-colour-only) cue, on top of the checkbox's own checked state.
- **`frontend/src/features/recipe-selection/useRecipeSelection.ts`** (new) — selection-mode state: whether it's active, which recipe ids are selected, toggle/enter/exit. Pure state, no fetching.
- **`frontend/src/features/recipe-selection/useGenerateShoppingListFlow.ts`** (built ahead of TEST-73 merging, now wired in) — orchestrates AC3/AC5: opens the confirmation when a list already exists, generates immediately otherwise, exposes `isGenerated` for the caller to navigate on success.
- **`frontend/src/features/recipe-selection/GenerateConfirmationModal.tsx`** — the AC5 confirmation, reusing `Modal`/`Button`. Worded as the merge TEST-76 actually performs, not a destructive wipe — copy matches TEST-76's recorded decision point for point: amounts refresh, a hand-corrected amount is kept, ticked items stay ticked, manual additions are untouched.

Originally, nothing new was added to `components/ui/`, `/design`, or `docs/design-system.md` — everything was composed from what already existed (`Checkbox`, `Button`, `Modal`, `Card`, `Badge`). The revisit below adds one small feature-local component (`HiddenSelectionSummary.tsx`, still composed from `Badge` — not a new `components/ui/` primitive) and documents two new patterns in `docs/design-system.md`.

## AC3: navigating to `/shopping-list`

`RecipeBox` calls `navigate('/shopping-list')` once `useGenerateShoppingListFlow`'s `isGenerated` flips true. At the time this ticket first shipped, `App.tsx` had no route registered for `/shopping-list` yet (the same situation TEST-73 left for TEST-74 with `/recipes/:id`) — **TEST-77 has since added it**, so this note is historical, not a live gap.

## AC1/AC2/AC4 behaviour

- **AC1** — `Checkbox`'s checked state (a shape, not a colour) plus a `ring-2` border on the card together satisfy "visible at a glance" and "not by colour alone." More than one recipe can be selected and deselected independently; verified with two recipes selected/deselected in combination.
- **AC2** — a live "`N` recipe(s) selected" count, correctly singular/plural, updates as items are toggled.
- **AC4** — the Generate button is `disabled` at zero selections, with visible text ("Select at least one recipe to generate a list.") explaining why, rather than letting a request fire and fail.

## Reuse

- `useRecipeSearch()` and `RecipeListItem` from TEST-73 — extended, not duplicated or re-derived.
- `useShoppingList` / `useGenerateShoppingList` from TEST-155 — no second fetch layer, no hand-rolled request.
- `GenerateShoppingListInput` from `@recipe-box/shared` is what actually gets sent; no locally redefined shape.

## Tests

- **Component/hook** (Vitest + React Testing Library, colocated):
  - `useRecipeSelection.test.ts` — enter/exit selection mode, select/deselect, multiple recipes at once, clearing on exit.
  - `useGenerateShoppingListFlow.test.tsx` — generate-immediately vs. confirm-first branching, confirm/cancel, and the `isGenerated` flag AC3 depends on.
  - `GenerateConfirmationModal.test.tsx` — renders only when open, exact copy, confirm/cancel callbacks.
  - `RecipeBox.test.tsx` (new `describe('RecipeBox selection mode (TEST-153)')` block) — AC1 multi-select/deselect, AC2 the live count, AC4 disabled-with-reason, AC5 the confirmation appearing with merge-not-wipe copy before generating, AC3 both branches (confirm-then-generate when a list exists, generate-immediately when `useShoppingList` 404s), and that cancelling selection mode clears it.
- **Manual, 375px viewport**, against a real running instance (not just the test DOM): entered selection mode, selected a recipe (checkbox ticked, card ring visible, count updated to "1 recipe selected"), opened the Generate confirmation and confirmed its exact wording, confirmed it, and verified the browser's URL moved to `/shopping-list`. No horizontal scrolling at any point.
- `npm run build` (both workspaces), `npm run lint`, `npm run test -w frontend` — 54 tests (after the pre-merge rebase picked up TEST-74's `RecipeDetail`), all exit 0 on the final run, verified by real exit code.
- **Flaky tests observed, named precisely rather than left in a parenthesis:** across two separate full-suite runs during this ticket, two *different*, unrelated tests each failed once on a `waitFor`/`testTimeout` (default 5000ms) — first `RecipeBox`'s pre-existing "no matches" state test, later (after rebasing onto TEST-74) `RecipeDetail`'s pre-existing "confirms before deleting" test. Neither test was touched by this ticket's changes, both passed cleanly in isolation, and both passed cleanly on an immediate full-suite re-run with no code changes in between. That pattern — different unrelated tests, no logic connection to what changed, clean on retry every time — points to timing/resource contention when the full suite runs together (the mock API's `mockDelay()` racing a fixed test timeout under load), not a regression. Worth knowing if either test times out again: it isn't new, and it isn't this ticket's code.
- **Backend: does not apply.** This ticket touches no backend code, endpoint, or migration — it consumes `/api/shopping-list` exactly as TEST-76 built it. No unit/integration/contract layer to add.
- `docs/api.md` / `docs/architecture.md`: not touched — no endpoint, layer, or test command changed.

## Deferred: Playwright E2E → TEST-232

This ticket's definition of done calls for a Playwright spec (select two recipes against the real stack, generate, land on the list). No E2E framework is installed — this is CLAUDE.md §9's third case, not "not applicable": the layer genuinely applies and cannot be written until a runner exists.

**Deferred to [TEST-232](https://beacon.chro.media/browse/TEST-232)** ("Land the Playwright end-to-end test harness"), which already carries TEST-73's and TEST-157's deferred coverage and will carry TEST-153's as its third. All four conditions hold: the blocker (no runner) is outside this ticket's scope; TEST-232 exists, is owned by the coordinating session, and lists this debt; this doc and the ticket's completion comment both name it; the coordinating session has agreed to the deferral pattern.

## Revisited: UI-quality and accessibility pass

TEST-153 was reopened for a UI-quality/accessibility improvement pass — no acceptance criterion above changed or regressed; this fixes how they were implemented and adds two small, explicitly agreed capabilities.

**Defects fixed:**

- `RecipeListItem.tsx` rendered a `Checkbox` **and** a sibling wrapping `<button>`, both independently toggling the same state — two tab stops per row. Replaced with the stretched-label pattern (see `docs/design-system.md`'s "Selected-card pattern"): one `<input type="checkbox">`, one tab stop per row.
- The checkbox's `className` override (`h-5 w-5`) fought the component's own default size classes — replaced with the existing `size="lg"` prop.
- The selected-card ring and both focus-visible rings used a leftover `ring-blue-*` that predated the app's warm/accent theme — migrated to `ring-accent`.
- A failed Generate attempt's error `Alert` persisted after Cancel — `useGenerateShoppingListFlow` now exposes `resetError()`, called from Cancel.
- The selection bar used the page-background token (`bg-ground`) and no elevation, reading as flat; now uses `bg-surface` + `shadow-soft` (matching `Card`) and is `sticky top-0` so it stays reachable while scrolling a long list.
- The Generate button now carries `aria-busy` while generating, and the existing `aria-live` count region also announces the busy state — not just the button's own text swap.
- The recipe title appeared twice per row — once as the checkbox's visible label, once in the card's header right next to it. `Checkbox` gained a `hideLabel` prop (visually hides the label, keeps it as the accessible name); `RecipeListItem` passes it so the title now shows once, still labeling the checkbox for assistive technology.

**Capabilities added (confirmed in scope with the user, not new ACs on the story):**

- **Select all / clear all shown** — a control in the selection bar that selects or clears exactly the currently search-filtered recipes, never ones hidden by an active search term.
- **Hidden-selection visibility** — `HiddenSelectionSummary.tsx` shows a removable chip for any recipe that stays selected after search filters it out of view, so selection state is never invisible.

**Tests added/updated:** `RecipeListItem.test.tsx` (new), `HiddenSelectionSummary.test.tsx` (new), `useRecipeSelection.test.ts` (`selectAll`/`deselectAll`), `useGenerateShoppingListFlow.test.tsx` (`resetError`), `RecipeBox.test.tsx` (stale-error-cleared-on-cancel, `aria-busy`/live-region wording, select-all/clear-all respecting search, hidden-selection chip). No layer's scope or status changed from the original ticket — still frontend-only, E2E still deferred to TEST-232.
