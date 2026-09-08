# TEST-73 — Recipe box UI (list, browse, search)

## What this is

The recipe box screen at `/recipes`: lists every saved recipe and lets someone narrow it down by typing into a single search field. It's the entry point to every other recipe screen — opening a recipe from the list is where TEST-74's detail view will take over.

## Search: client-side, decided and recorded

**Search filters client-side over the already-fetched list.** No query parameter, no server-side search endpoint. This was the open question this ticket's own Notes left for the coordinating session, and it's settled — recorded on both TEST-73 and TEST-72's Beacon threads.

Why: AC3 requires matching by ingredient, not just title. Doing that client-side is a plain array `.some()` over data already sitting in the React Query cache. Doing it server-side means real search infrastructure across a joined table (`recipes` + `recipe_ingredients`) — not justified for a personal recipe box where the whole collection fits comfortably in one `GET /api/recipes` response. If the box ever grows past what's sensible to fetch in one request, that's a new ticket, not a change to this one.

The matching itself (`matchesSearch` in `RecipeBox.tsx`) lowercases both the search term and the title/ingredient names and does a substring match — case-insensitive per AC2, and checks every ingredient's `name` per AC3.

## Layout

- **`frontend/src/features/recipes/RecipeBox.tsx`** — the screen itself: renders the search input and the four states below, delegates fetching/filtering and per-row rendering to the two pieces below it.
- **`frontend/src/features/recipes/useRecipeSearch.ts`** — `useRecipes()` plus the client-side filter, as one hook returning `{ query, searchTerm, setSearchTerm, filteredRecipes }`.
- **`frontend/src/features/recipes/RecipeListItem.tsx`** — one recipe's card, split out on its own.
- **`frontend/src/App.tsx`** — added the `/recipes` route, plus a link from the home page (mirroring the existing `/design` link).

### Built with TEST-153's selection mode in mind

Decided with the coordinating session: TEST-153 will add a selection mode to *this* list rather than build a second screen (its AC1 — "when selection mode is used" — describes a toggle, and a separate screen would mean two places fetching and filtering recipes that have to be kept in sync forever). This ticket doesn't implement selection — that's explicitly out of scope here — but the split above exists because of it:

- `useRecipeSearch()` is the seam TEST-153 reuses to get the same fetched-and-filtered list under a selection UI, instead of re-deriving it.
- `RecipeListItem` is a single row in isolation, so adding a selection checkbox to it (or wrapping it) doesn't require touching the search/filter logic at all.

Nothing here takes a selection prop or renders a checkbox — that would be scope this ticket wasn't given. The point is only that TEST-153 has a natural place to add one without restructuring a finished screen first.

No new UI components or variants — everything is built from what already exists in `components/ui/`: `Input` for the labeled search field, `Card`/`CardHeader`/`CardBody` for each recipe, `Badge` for tags, `Alert` for the empty/no-matches/error states, `Button` for retry/clear actions. Nothing added to `/design` or `docs/design-system.md` because nothing new was built there.

## The four states every data-backed screen needs

Per `docs/frontend.md`'s "Loading, error and empty states" section:

- **Loading** — plain status text while `useRecipes()` is pending.
- **Error** — `Alert variant="danger"` with the normalized `ApiClientError.message` and a "Try again" button that calls the query's own `refetch()`.
- **No recipes yet** (the box is genuinely empty) — `Alert variant="info"`, explains what to do.
- **No matches** (recipes exist, the search matched none) — a **different** `Alert`, explicitly distinct wording from "no recipes yet" per AC5, with a "Clear search" button that resets the search term and returns to the full list.

## Navigation contract with TEST-74

Each recipe card is a `react-router-dom` `Link` to **`/recipes/:id`**. This is the URL shape TEST-74 should build its detail route against — it matches `queryKeys.recipes.detail(id)`'s own `id` parameter and TEST-74's own note that assumes "the detail view is its own route with the recipe id in the URL."

There's no route registered for `/recipes/:id` yet — that's TEST-74's screen to add. Until then, clicking a card changes the URL correctly (verified in the component test) but renders nothing, since `App.tsx`'s `<Routes>` has no matching path and no catch-all. That's expected, not a bug in this ticket.

## What's explicitly not here

- The detail view itself (TEST-74), the add/edit form (TEST-75), the favorites toggle and filter (TEST-123), multi-select for a shopping list (TEST-153) — all out of scope per the ticket, and none of their UI is present.
- No dedicated `EmptyState`/`ErrorState` components — TEST-157 owns those. This ticket's empty/error messaging is built directly from `Alert`, which the design system already provides for exactly this. TEST-157 landed `EmptyState`/`LoadingState`/`ErrorState` (`frontend/src/components/ui/`) on its own still-unmerged branch partway through this ticket; not adopted here because taking a dependency on an unmerged branch is the same problem as building against an unmerged endpoint. Swapping this ticket's `Alert` usages for TEST-157's components once it merges is a small, tracked follow-up, not a rebuild — the states, copy and behavior (distinct no-matches vs. no-recipes-yet, retry, clear-search) stay the same either way.

## How it was verified

- **Unit/component** (`RecipeBox.test.tsx`, Vitest + React Testing Library, against the real typed mock per TEST-155's AC5 — no mocking of `useRecipes` itself): loading state, rendering the list, filtering by title (case-insensitive), filtering by ingredient not present in any title, the no-matches state and its "distinct from no-recipes-yet" requirement plus its clear-search recovery, the no-recipes-yet state (mocked `recipesApi.list` to resolve empty), the error state and its retry, and that each card links to the correct `/recipes/:id`.
- **Manual, 375px viewport**: recipe box, search field and cards all fit with no horizontal scroll; typed "soy sauce" and confirmed only the recipe containing that ingredient (not matching by title) remained listed; confirmed the no-matches state renders with different copy from the empty state.
- `npm run build` (both workspaces), `npm run lint`, `npm run test -w frontend` (20 tests, up from 12) — all exit 0, checked by real exit code.
- `docs/api.md` / `docs/architecture.md`: not touched — this ticket adds no endpoint, layer, or test script, so the same-branch update rule in CLAUDE.md §16 doesn't apply here.

## Deferred: Playwright E2E → TEST-232

This ticket's Definition of Done calls for a Playwright spec (open the recipe box, search by title, search by ingredient, open a recipe). No E2E framework is installed in this repository — this is CLAUDE.md §9's third case, not a "not applicable": the layer genuinely applies to this screen and cannot be written until a runner exists.

**Deferred to [TEST-232](https://beacon.chro.media/browse/TEST-232)** ("Land the Playwright end-to-end test harness"), which is CRITICAL, owned by the coordinating session, and carries the debt list this ticket is now on. All four conditions for a deferral hold: the blocker (no runner) is outside this ticket's scope and installing one here would mean a second, competing config; TEST-232 exists with an owner and lists TEST-73 in its debt; this doc and the ticket summary both name it; the coordinating session agreed to the deferral on TEST-73's Beacon thread.

Everything else in this ticket's Definition of Done is satisfied without it — see "How it was verified" above.
