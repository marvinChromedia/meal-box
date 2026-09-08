# TEST-233 — Recipe box uses the shared empty/error/loading components

## What changed

`RecipeBox.tsx` rendered its loading, "no recipes yet", "no matches", and load-failure states by hand — a bare `<p role="status">` for loading, and the generic `Alert` component (with a manually attached retry `Button`) for the other three. It now uses the purpose-built components that exist for exactly this:

- Loading → `LoadingState label="Loading recipes…"`
- Load failure → `ErrorState title="Couldn't load recipes" message={...} onRetry={...}`
- No recipes yet → `EmptyState title="No recipes yet" description="..."`
- No matches → `EmptyState title="No matches" description={...} action={<Button>Clear search</Button>}`

This matches the pattern `RecipeDetail.tsx` (TEST-74) already established, so the recipe box and recipe detail screens now handle these states identically instead of two different ways.

## Why

`RecipeBox.tsx` (TEST-73) was built before `EmptyState`/`ErrorState`/`LoadingState` existed (TEST-157 was still in flight), so it used `Alert` as a stand-in. Once TEST-157 merged, the recipe box became the one screen still hand-rolling states that every other screen now gets from shared components.

## What did not change

- Behaviour: "no matches" is still visually and textually distinct from "no recipes yet," still offers a way back to the full list ("Clear search"), and the error state still offers "Try again."
- The shopping-list-*generation* error banner in the same file (`generateFlow.generateError`) still uses `Alert` directly — that's a separate concern (TEST-153/TEST-77's territory), not one of this ticket's four target states, and was left untouched.
- `Alert` itself is untouched and remains legitimately used elsewhere: `LoginPage`, `LoginForm`, `RegisterForm`, `DesignSystemPage`'s showcase, and internally inside `ErrorState`.

## Tests

No test changes were needed. `RecipeBox.test.tsx`'s existing assertions — `role="status"` for loading, exact text `'No recipes yet'` / `'No matches'`, heading text matching `/couldn't load recipes/i`, the error message text, and button accessible names `/clear search/i` / `/try again/i` — all still pass unchanged against the new components, because each was given the same title/label text the old `Alert`-based markup used.

Full suite: `npm test -w frontend` — 108 tests, 20 files, exit 0. `npm run lint` exit 0. `npm run build` (both workspaces) exit 0.

No end-to-end test is owed by this ticket — behaviour is unchanged, so it adds no new flow beyond what TEST-73 already defers to TEST-232.

## Mobile width

Not re-verified via a running dev server for this change: none of the touched components use viewport-specific classes, the surrounding `max-w-2xl` container is untouched, and `EmptyState`/`ErrorState`/`LoadingState` are already exercised at 375px by `RecipeDetail` (TEST-74). Swapping to the same components in the same container carries no new layout risk.
