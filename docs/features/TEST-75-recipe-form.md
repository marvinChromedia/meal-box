# TEST-75 — Add/edit recipe form

## What this is

The one screen that puts recipes into the box: title, a repeating set of ingredient rows, steps that can be reordered, and tags. One component, `RecipeForm`, serves both `/recipes/new` (create) and `/recipes/:id/edit` (edit) — which mode it's in is driven entirely by whether the route supplies an `id`.

## Layout

- **`frontend/src/features/recipes/recipeFormReducer.ts`** — the form's state shape and every state transition, as a pure reducer (no React, no rendering). `emptyFormState()` and `formStateFromRecipe(recipe)` are the two ways to construct initial state.
- **`frontend/src/features/recipes/validateRecipeForm.ts`** — `validateRecipeForm(state)` (pure, returns a field-path-keyed error map) and `toRecipeInput(state)` (converts form state to the `RecipeInput` the API expects). Both fully unit-tested independent of any rendering.
- **`frontend/src/features/recipes/RecipeForm.tsx`** — the screen: route handling (create vs. edit, loading/not-found/error for edit's fetch), the `useReducer` wiring, and the two dynamic row renderers (`IngredientRow`, `StepRow`) as local sub-components.
- **`frontend/src/App.tsx`** — added `/recipes/new` and `/recipes/:id/edit`.
- **`frontend/src/features/recipes/RecipeBox.tsx`** — added an "Add recipe" button (the feature was otherwise unreachable from the UI). Kept as a real `<button>` with `onClick={() => navigate('/recipes/new')}` rather than a `Button` nested inside a `Link`, which would be two interactive elements nested inside each other — same reasoning as the Edit button on TEST-74's detail screen.

No new `components/ui/` variants were added — everything is built from `Input`, `Textarea`, `Button` as they already exist. One small fix _was_ needed to those two, covered below.

## AC2, the one this ticket is named for: why rows don't corrupt each other

Every ingredient row and every step carries a `key: string` — a client-only identifier assigned once when the row is created (`row-1`, `row-2`, ...), completely independent of the row's position in the array. Every reducer action that targets one row (`update_ingredient`, `remove_ingredient`, `update_step`, `remove_step`, `move_step`) addresses it by this `key`, and the component uses the same `key` as React's own list `key` prop.

This matters because the classic version of this bug uses the array **index** as both the React key and the identifier passed to update/remove handlers. Removing a middle row then shifts every row after it down by one index — React reuses the DOM node (and, worse, any uncontrolled state) for what it thinks is "the same" row at that index, so the row that used to be row 3 now silently displays what row 2 had. Keying and addressing by a stable id sidesteps this entirely: removing `row-2` removes exactly that object from the array; `row-1` and `row-3` are untouched and keep their own React key, so React doesn't reuse or reassign their DOM nodes.

Proven at two levels: `recipeFormReducer.test.ts` shows the reducer's array operations are correct in isolation (remove by key doesn't touch other keys' data), and `RecipeForm.test.tsx` shows the actual rendered inputs keep the right values after adding three rows, naming them, and removing the middle one by its own row's Remove button.

## Steps reorder via explicit Up/Down, not drag-and-drop

Each step row has "move up" / "move down" buttons rather than a drag handle. Reasoning: drag-and-drop is hard to make genuinely keyboard-accessible (AC7 requires keyboard reachability) and pulls in a dependency for a project that doesn't otherwise have one; two buttons per row are real, focusable, `aria-label`led buttons that work identically with a mouse, a keyboard, or a screen reader, and `move_step` in the reducer is a straightforward array splice keyed the same way as the ingredient rows.

## Validation mirrors the API, and only ever more strictly (AC5)

`validateRecipeForm` mirrors `backend/src/schemas/recipeSchemas.ts` (TEST-72): non-empty title, at least one ingredient with a name and a numeric quantity, at least one step, unit left unconstrained (empty is valid — the shared contract's own note that unit is free text, valid empty for something like "2 onions"). The one place this form is _stricter_ than the API schema: the API's `steps` schema only requires the array to have length ≥ 1, not that each string be non-blank; this form additionally requires at least one **non-blank** step. That's a deliberately safe kind of strictness — the form never accepts something the API would reject, it only ever rejects a subset of what the API would technically accept (a recipe whose only step is an empty string), which AC5's "never contradicting them" allows.

## Failed save preserves everything (AC6)

The mutation's `onError` only sets `state.submitError` — it never resets or clears any field. Since the form was never emptied to begin with (there's no "optimistic clear"), every value the person typed is still exactly where they left it when the error banner (`ErrorState`) appears above the form.

## Edit mode (AC4)

`RecipeForm` fetches with TEST-155's `useRecipe(id)` when the route has an `id`. Once it resolves, `formStateFromRecipe(recipe)` builds the initial reducer state — title, ingredients (quantities converted to strings for the input fields), steps, and tags (joined with `, ` into the single tags text field). Saving in edit mode calls `useUpdateRecipe().mutate({ id, input })`, which is the same "update replaces the ingredient set" contract TEST-72 already implements — this form doesn't need to do anything special to honor that, since it always submits its whole current ingredient list.

Not-found and generic-error states for a bad edit id reuse the same `EmptyState` / `ErrorState` split as TEST-74's detail view, for the same reason: a 404 isn't retryable, so it gets `EmptyState`; a real failure does, so it gets `ErrorState`.

## A pre-existing accessibility gap fixed along the way

`Input` and `Textarea` already accepted an `error` prop and rendered the message below the field, but never linked the two — no `aria-describedby`, no `aria-invalid`. That's exactly what AC7 requires ("validation messages are associated with their inputs so a screen reader announces them"), and this ticket is the first one to actually need it. Fixed both components: when `error` is set, the input/textarea gets `aria-invalid="true"` and `aria-describedby` pointing at the error paragraph's `id`. This is additive — it only changes behavior when `error` is passed, so nothing already using these components is affected. Verified directly in the browser (not just asserted in a test): submitted the empty form and confirmed the invalid input actually carries `aria-describedby` pointing at an element containing the exact error text.

## Navigation contracts

- **Consumes** `/recipes/:id` (TEST-73) — the not-found/error states link back there, and both create and edit navigate to `/recipes/:id` on success.
- **Consumes** `/recipes/:id/edit` (TEST-74 set this; this ticket is what actually lives at that route now).
- **Sets** `/recipes/new` for creating a recipe — the "Add recipe" button on the recipe box is the only entry point to it right now.

## How it was verified

- **Unit** (`recipeFormReducer.test.ts`, `validateRecipeForm.test.ts`): every reducer action in isolation (including the AC2 middle-row case and AC3 reordering, including the up/down boundary no-ops), every validation rule, `toRecipeInput`'s trimming/parsing.
- **Component** (`RecipeForm.test.tsx`, against the real typed mock — `recipesApi.create`/`update`/`get` spied on only where a test needs to inspect the exact payload or force a failure): full create happy path; all four AC5 field errors rendered together from one blocked submit; empty unit accepted; a rejected save leaving every field populated (AC6); the AC2 middle-row removal at the DOM level; the AC3 reorder-then-submit payload has the new order; edit-mode pre-fill and that saving calls `update` with the existing id rather than `create`; the not-found state for a bad edit id.
- **Manual, 375px viewport**: every field, both dynamic row types, and both submit buttons fit with no horizontal scroll. Confirmed in the running app (not just the test suite) that submitting the empty form wires `aria-invalid`/`aria-describedby` correctly on the real DOM.
- `npm run build` (both workspaces), `npm run lint`, `./node_modules/.bin/prettier --check` (direct binary, not the proxied command), `npm run test -w frontend` (56 tests, up from 34) — all exit 0, checked by real exit code.
- `docs/api.md` / `docs/architecture.md`: not touched — no endpoint, layer, or test script added.

## Deferred: Playwright E2E → TEST-232

Same situation as TEST-73 and TEST-74: this ticket's Definition of Done calls for a Playwright spec (create a recipe against the real stack, see it in the box, reopen and edit it, verify the change persisted). No E2E framework is installed — CLAUDE.md §9's third case, not "not applicable." **Deferred to [TEST-232](https://beacon.chro.media/browse/TEST-232)**, which carries TEST-73 and TEST-74 in its debt list already; confirm TEST-75 is added alongside them.
