# Frontend conventions

React 18 + Vite + TypeScript (`strict: true`) + Tailwind. Mobile-responsive by default.

## Structure

- Function components and hooks only. No class components.
- Feature-folder layout: a component, its test and its hooks live together — `src/features/recipes/RecipeCard.tsx`, `RecipeCard.test.tsx`.
- Shared UI in `src/components/ui/`. The app shell (layout, header, page-header) in `src/components/layout/`. Shared library code in `src/lib/`.
- `PascalCase` components, `camelCase` functions/variables/hooks (`useShoppingList`), `SCREAMING_SNAKE_CASE` only for true constants.

## Types

No `any`. Types come from `@recipe-box/shared` — never redefine a shape that already exists there. See [`architecture.md`](./architecture.md).

## State

- Local component state (`useState`, `useReducer`) by default. Reach for `useReducer` when a form has several interdependent fields rather than stacking many `useState` calls.
- Server state — recipes, shopping list — through React Query. Do not reach for Redux or Zustand unless genuinely cross-cutting client state appears.
- One typed fetch layer for the whole app. Do not hand-roll a `fetch` in a component.

## Design system

Reusable components live in `frontend/src/components/ui/`: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Badge`, `Card`, `Alert`, `Modal`. Props and usage are documented in [`design-system.md`](./design-system.md), and every component and variant renders live at `/design` when the app is running.

Reuse these rather than duplicating Tailwind classes. If a screen genuinely needs a new component or variant, add it in **all three places in the same change**: `components/ui/`, the `/design` page, and `design-system.md`. One without the others rots immediately.

Use `Modal` for destructive confirmations — deleting a recipe, clearing a list.

## App shell

`src/components/layout/AppLayout.tsx` wraps every route (mounted once, as the element of a parent `<Route>` in `App.tsx`, with the real routes nested inside it as children rendered through `<Outlet/>`). It owns the app's one `<main>` and renders `Header` above it — no screen declares its own `<main>` or page container.

`Header` reads `useCurrentUser()` to render two real states, not one with a loading gap papered over: **signed in** shows the "MealBox" brand, navigation between the recipe box and shopping list (`NavLink`, which sets `aria-current="page"` on the active one automatically), the signed-in user's email linking to `/account`, and a sign-out button. **Signed out** (the login/register pages render through this same shell) shows only the brand — no navigation into guarded screens, no sign-out control. Add a new primary nav destination here, not by hand in individual screens.

`PageHeader` (title + an optional actions slot, rendering the page's one `<h1>`) is separate from `Header` and used locally by screens that have a title-plus-toolbar pattern (recipe box, shopping list, recipe detail, recipe form). It's deliberately not part of `AppLayout` — a screen's own unit tests only need `PageHeader`, not the whole nav shell. A screen without that pattern (the auth pages, the design-system page) still owes the page exactly one real `<h1>`, achieved however fits — e.g. the auth pages wrap their existing `CardHeader` text in a real `<h1>` rather than adding a second title row above the card.

Each screen still picks its own content width (`max-w-2xl` for lists/forms, `max-w-md` for auth cards, `max-w-5xl` for the design-system page) — `AppLayout`'s `<main>` supplies the shared horizontal padding and vertical rhythm once; it doesn't force one width on every screen.

## Styling

Mobile-first: write the unprefixed Tailwind classes for the smallest viewport, then add `sm:` / `md:` / `lg:`. **Check every screen at a 375px-wide viewport before calling it done.** Tap targets on the shopping list need to be usable one-handed.

## Accessibility

- Semantic HTML over generic `div`s. Ordered lists for steps, unordered for ingredients — the semantics carry meaning.
- Every form input has a `<label>`, including each row of a dynamically added set.
- Interactive elements are keyboard-reachable with visible focus states.
- Validation errors are associated with their input so a screen reader announces them.
- State is never conveyed by colour alone.

## Loading, error and empty states

Every data-backed screen handles all three. A first-run empty state is the first thing a new user sees, so it explains what to do rather than rendering a blank area. Error states show the API's message in plain language and offer a retry — never a raw exception or a bare code.

## Tests

Vitest + React Testing Library, colocated with the component. Frontend behaviour changes also need an end-to-end test — see [`testing.md`](./testing.md), which documents the current gap there.
