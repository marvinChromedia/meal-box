# Frontend conventions

React 18 + Vite + TypeScript (`strict: true`) + Tailwind. Mobile-responsive by default.

## Structure

- Function components and hooks only. No class components.
- Feature-folder layout: a component, its test and its hooks live together — `src/features/recipes/RecipeCard.tsx`, `RecipeCard.test.tsx`.
- Shared UI in `src/components/ui/`. Shared library code in `src/lib/`.
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
