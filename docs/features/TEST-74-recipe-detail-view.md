# TEST-74 — Recipe detail view

## What this is

The screen at `/recipes/:id`: one recipe's full ingredients and steps, with the ways in to edit or delete it. This is the screen TEST-73's recipe cards link to.

## Layout

- **`frontend/src/features/recipes/RecipeDetail.tsx`** — the screen. Reads `id` from the route via `useParams`, fetches with TEST-155's `useRecipe(id)`, deletes with `useDeleteRecipe()`.
- **`frontend/src/App.tsx`** — added the `/recipes/:id` route.

Reuses `Modal` for the delete confirmation (per the ticket's own DoD), and `Badge`/`Button` from the existing design system. No new UI components or variants — nothing added to `/design` or `docs/design-system.md`.

### Built after TEST-157 merged — uses its components, not `Alert`

Unlike TEST-73 (built before TEST-157 landed, and still on `Alert` with a tracked follow-up), TEST-157's `EmptyState`, `ErrorState` and `LoadingState` were already on `main` when this ticket started, so this screen uses them directly:

- **Loading** — `LoadingState` (skeleton rows, `rows={2}`).
- **A genuine failure** (network error, non-404 API error) — `ErrorState`, with `onRetry` wired to the query's own `refetch()`.
- **Not found** (AC5: bad id, or a recipe deleted elsewhere) — `EmptyState`, not `ErrorState`. Reasoning: `ErrorState` is built for a retryable failure (it has a message, an optional error code, an optional retry) — retrying a fetch for a recipe that doesn't exist just fails the same way again. `EmptyState`'s shape (title, description, an arbitrary `action`) fits a "there's nothing here, here's where to go instead" outcome better, so the action is a link back to `/recipes` rather than a retry button.

`RecipeDetail.tsx` also handles the case of no `id` in the URL at all as the same not-found state, for the same reason `useParams` can theoretically return `undefined` even though the registered route always supplies one.

## Delete: confirm, then invalidate, then leave

`Modal` holds the confirmation, per the design system's own guidance to use it for destructive actions. Its body names the recipe by title (AC3). Cancelling just closes the modal — no mutation runs, nothing changes (AC4). Confirming calls `useDeleteRecipe().mutate(recipe.id, { onSuccess: () => navigate('/recipes') })`; the hook's existing `onSuccess` already invalidates `queryKeys.recipes.all`, so the recipe box's own list re-fetches and no longer shows the deleted recipe by the time the navigation lands.

## Navigation contracts

- **Consumes** the `/recipes/:id` contract TEST-73 set.
- **Sets** `/recipes/:id/edit` for TEST-75's add/edit form to register a route against, via the "Edit" button. There's no route there yet — `App.tsx` has no matching path and no catch-all, so clicking Edit changes the URL but renders nothing until TEST-75 adds it. Same situation TEST-74 itself was in against TEST-73 a few hours ago; expected, not a bug.

## Accessibility

- Ingredients are an unordered list (`<ul>`), steps an ordered list (`<ol>`) — per the ticket's own note, the semantics carry meaning for a screen reader, not just the visual numbering.
- `Modal` already provides `role="dialog"`, `aria-modal="true"`, and a labelled heading.
- Edit/Delete/Cancel/confirm-Delete are all real `<button>` elements (via the existing `Button` component, which already has focus-visible rings) — kept as buttons rather than nesting an anchor inside a button, since Edit triggers a `navigate()` call rather than being wrapped in a `Link`.

## How it was verified

- **Unit/component** (`RecipeDetail.test.tsx`, against the real typed mock, no mocking of the hooks): full render showing title/ingredients-with-quantity-and-unit/steps-in-saved-order (AC1); the confirm-delete path — dialog names the recipe, confirming deletes and navigates back to the recipe box (AC3); the cancel-delete path — dialog closes, recipe and screen untouched (AC4); the not-found state for an id the mock API 404s on, including the link back to the recipe box (AC5).
- **Manual, 375px viewport**: title, tags, ingredients, steps, Edit/Delete controls all fit with no horizontal scroll; confirmed layout matches AC6.
- `npm run build` (both workspaces), `npm run lint`, `npm run test -w frontend` (34 tests, up from 30) — all exit 0, checked by real exit code, not a printed summary. One real catch worth recording: `npx prettier --check` on the two new files printed "All files formatted correctly" while exiting 1 — the exact `rtk`-proxy masking CLAUDE.md warns about. Caught it by checking the exit code rather than the text, fixed via the prettier binary directly (`./node_modules/.bin/prettier --write`).
- `docs/api.md` / `docs/architecture.md`: not touched — no endpoint, layer, or test script added.

## Deferred: Playwright E2E → TEST-232

Same situation as TEST-73: this ticket's Definition of Done calls for a Playwright spec (open a recipe, delete it with confirmation, verify it's gone from the list). No E2E framework is installed. Per CLAUDE.md §9's third case — this layer applies and cannot be written yet, not "not applicable." **Deferred to [TEST-232](https://beacon.chro.media/browse/TEST-232)**, which already carries this ticket in its debt list; confirm the addition lands there alongside TEST-73's before treating this as settled.
