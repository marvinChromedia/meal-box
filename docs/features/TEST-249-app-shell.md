# TEST-249 — Shared header, navigation, and page frame

## What changed

Introduced `frontend/src/components/layout/`: `AppLayout` (mounted once as a wrapping route in `App.tsx`, owns the app's single `<main>` via `<Outlet/>`), `Header` (brand, primary nav, signed-in user, sign-out — two real states, signed-in and signed-out), and `PageHeader` (title + actions slot, used locally by screens with that pattern). All eight screens (`RecipeBox`, `RecipeDetail`, `RecipeForm`, `ShoppingList`, `LoginPage`, `RegisterPage`, `AccountPage`, `DesignSystemPage`) dropped their own `<main>` wrapper and adopted this. The design-system link is gone from anywhere a user can see it; the route still works. Full pattern documented in `docs/frontend.md`'s new "App shell" section — this doc covers the decisions, not a restatement of it.

## Decisions worth knowing about

**Per-screen width is not unified.** `AppLayout`'s `<main>` supplies the shared horizontal padding and vertical rhythm once; each screen keeps its own content max-width (`max-w-2xl` for lists/forms, `max-w-md` for auth cards, `max-w-5xl` for the design-system page) rather than being forced into one. Cramming an auth card into a 2xl-wide frame, or a design-system gallery into a phone-width card, would be a worse outcome than the small inconsistency of "not every screen repeats the same number."

**`PageHeader` is separate from `Header`, deliberately.** `Header` is the persistent nav shell; `PageHeader` is a small per-screen title+actions component. Because a screen's own unit test only needs `PageHeader`, none of the eight screens' existing tests needed anything wrapped around them to keep passing — no test renders `AppLayout` or a router setup it didn't already have.

**The auth pages (`Login`/`Register`/`Account`) had zero `<h1>`s, not two.** Rather than adding a second title row above their existing `Card`, each now wraps its existing `CardHeader` text in a real `<h1>` (`<CardHeader><h1>Sign in</h1></CardHeader>`). `CardHeader` just renders `{children}` in a styled div — nesting a bare `<h1>` inside it is visually identical (Tailwind's preflight resets heading font-size/weight/margin to inherit from the parent), so this is a pure semantics fix, not a redesign.

**`DesignSystemPage` had two `<h1>`s**, not zero: the real page title, and a typography-demo sample literally showing what an `<h1>` looks like. Changed the demo sample to a `<p>` with the same visual classes — it was never meant to be a second real heading.

**Auth pages' `min-h-screen` vertical centering is gone.** Nested under a persistent header, `min-h-screen` on an inner div made the page taller than the viewport (extra scroll under the header's own height), not perfectly centered. They now sit at the top of the frame like every other screen. `RequireAuth`'s own loading state had the identical bug (`min-h-screen` centered exactly on the viewport, which was fine when it was the only thing on the page and stopped being fine once a header sits above it) — fixed the same way, since it's the direct, necessary consequence of adding a shared header, not scope creep.

**A stray `gray-*`/`blue-*` cleanup rode along** in every screen this ticket touched (not screens it didn't) — `RecipeListItem`/`ShoppingListItemRow`/`LoginForm`/`RegisterForm` were left alone since nothing in this ticket required opening them. TEST-248 explicitly anticipated this: "Restyling `RecipeBox.tsx`, `ShoppingList.tsx` or the form is TEST-249's, once their owners have merged."

**The home page's own `<h1>` now says "MealBox"** instead of "Recipe Box" — the ticket's own notes settle the app name, and leaving the old name directly under the new header's "MealBox" brand would have been a visible, confusing contradiction on the same screen. Its content is otherwise untouched — TEST-250 replaces it.

## Verification

- `npm test -w frontend` — 117 tests (108 existing + 9 new: `Header.test.tsx`, `PageHeader.test.tsx`, `AppLayout.test.tsx`), exit 0, **no existing assertion changed**. `npm run lint` exit 0. `npm run build` (both workspaces) exit 0.
- New tests cover: signed-in nav + user + sign-out render; `aria-current="page"` on the active nav link and not the inactive one; the nav sitting in a `role="navigation"` landmark; the sign-out button's pending state and that it calls the API; the signed-out state showing no nav and no sign-out control; exactly one `<main>` rendered by `AppLayout` with routed content inside it.
- **Not verified**: an actual running dev server with a live backend. Setting one up surfaced a real problem — see below — and I stopped rather than push through it against a database other sessions may depend on. 375px width was therefore not visually checked either; the same caveat from TEST-248 applies here, more so, since this ticket touches layout structure, not just color. Worth a real check next time a clean environment is available.

## A separate finding, not fixed here

Bringing up a local backend to verify this ticket surfaced a migration-ordering conflict in the shared dev database: `node-pg-migrate` refused to run because a migration file in this branch (`20260908190000_add_quantity_edited_to_shopping_list_items`) sorts before one already recorded as applied (`20260908150000_create_users_and_sessions_tables`) — and this worktree's migrations directory also has a *different* users/sessions migration (`20260908200000_...`) than the one the database says already ran. That smells like a rename or duplicate from TEST-159's auth migration diverging across branches. I didn't touch the database or the migrations to fix it — that's not this ticket's scope, and forcing a reconciliation risked corrupting state another concurrent session might depend on. Flagging it rather than leaving it silently discovered.

## No new tests weakened

All 108 pre-existing frontend tests pass with their original assertions. `AC7`'s permission to adjust a test's *setup* wasn't even needed — none of the eight screens' tests render anything beyond the screen component itself, so removing `<main>` and adopting `PageHeader` required no test changes at all.

## End-to-end

Required (moving between screens via the header is new user-visible behavior) but no E2E runner is installed in this repo. Deferred to **TEST-232** by name, the same precedent already used for TEST-157/73/74/75/77.
