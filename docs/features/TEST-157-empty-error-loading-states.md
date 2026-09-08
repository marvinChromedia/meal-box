# TEST-157 — Empty, loading and error states

Three reusable design-system components — `EmptyState`, `LoadingState`, `ErrorState` — so the six screen tickets that each hit "nothing to show yet", "still loading" and "the request failed" don't each invent their own spinner, blank-state copy and error handling.

## Why

Every data-backed screen in the app needs the same three non-happy-path states. Building them once, as configurable components, means the screen tickets consume a component instead of copying markup — and means the auth error a recipe screen shows looks and behaves exactly like the one the shopping list shows.

## Components

`frontend/src/components/ui/EmptyState.tsx`, `LoadingState.tsx`, `ErrorState.tsx`. Full prop reference in [`docs/design-system.md`](../design-system.md); summary:

- **`EmptyState`** — `title` (required), `description?`, `action?: ReactNode`, `icon?: ReactNode`. `role="status"` so a screen reader announces it once a request resolves to "nothing here." The action is a caller-supplied element (typically a `<Button>`) rather than a fixed label/href pair — keeps the component from having to know what "add a recipe" vs. "generate a list" should say or do.
- **`LoadingState`** — `label?` (screen-reader text, default `"Loading…"`), `rows?` (number of skeleton bars, default `3`). `role="status"` + `aria-busy="true"`; the bars themselves are `aria-hidden` since the label already says what's loading. `rows` exists so a screen can roughly match its skeleton to what's actually loading (a 3-row skeleton for a short list, more for a longer one) — that's what keeps the layout from shifting when real content swaps in (AC3), more than any fixed height would.
- **`ErrorState`** — `message` (required), `title?` (default `"Something went wrong"`), `code?`, `onRetry?: () => void`, `retryLabel?` (default `"Try again"`). Built on `Alert` (`variant="danger"`), so it inherits `role="alert"` — an assertive live region, announced immediately. `code`, when given, always renders next to `message`, never instead of it, per AC4's "never a code alone."

## Design decisions

- **`ErrorState` wraps `Alert`; `EmptyState` and `LoadingState` don't wrap `Card`.** The ticket suggested extending `Alert`/`Card` where it fits. `Alert` already had the right semantics (`role="alert"`) and visual language for a failure. `Card`'s solid border + shadow reads as "a piece of content," which is the wrong visual language for "there's no content" or "still loading" — a dashed border (`EmptyState`) and skeleton bars (`LoadingState`) read more clearly as placeholders, so those two are built directly rather than wrapping `Card`.
- **`ErrorState` takes plain `message`/`code` strings, not an `ApiClientError`.** Keeps `components/ui/` decoupled from `frontend/src/lib/api/` — a screen does `<ErrorState message={error.message} code={error.code} onRetry={refetch} />`, same as it would for any other error source. Consistent with TEST-155's error normalization already having done the work of getting to a plain `{ message, code }` shape.
- **No built-in "no search matches" variant.** TEST-73 owns that state and the ticket already flags it as distinct from "no recipes yet" — but `EmptyState`'s `title`/`description`/`action` props are generic enough that TEST-73 can pass `title="No matches"` etc. rather than building a second component.

## Accessibility (AC6)

- `LoadingState` and `ErrorState` are both announced via ARIA live-region semantics (`role="status"`/`aria-busy` and `role="alert"` respectively) rather than relying on a visual-only change — a screen reader user is told loading started/an error occurred without needing to see it.
- All three components use only relative Tailwind utilities (flex, gap, max-width) — no fixed pixel widths — and were checked at a 375px viewport on the `/design` gallery with no horizontal overflow (`document.documentElement.scrollWidth === clientWidth`, both 375).

## Verification

- Unit/component (Vitest + RTL): `EmptyState.test.tsx`, `LoadingState.test.tsx`, `ErrorState.test.tsx` — rendering, the retry button firing, the message/code display rule. 10 new tests, full frontend suite (22 tests) green.
- `npm run lint` — exit 0. `npm run build` — exit 0.
- Manually verified in-browser at a 375px viewport (`/design` gallery) — no horizontal scroll, all three states render and read correctly.
- Playwright E2E for the first-run empty recipe box (this ticket's own DoD item): **not built.** No E2E framework is installed in this repository (`docs/testing.md` states this explicitly) — raised with the PM session per the agreed process rather than scaffolding a one-off runner. Tracked as an open item until the harness lands centrally.

## Acceptance criteria coverage

- **AC1/AC2** (first-run empty recipe box / empty shopping list): `EmptyState` with screen-specific `title`/`description`/`action` — the screen tickets (TEST-73/74/75/77) wire the actual copy and action.
- **AC3** (loading doesn't shift layout): `LoadingState`'s `rows` prop, see "Design decisions" above.
- **AC4** (error with a way forward, never a bare code): `ErrorState`, see above.
- **AC5** (one set of components, prop-configurable): all three components take no children beyond an optional `action`/`icon` slot — every variant is a prop, not a markup copy.
- **AC6** (mobile width + screen reader): see "Accessibility" above.

## Notes for consuming tickets

- TEST-73 (recipe search): reuse `EmptyState` for "no search matches" with its own copy, per the ticket's own out-of-scope note.
- TEST-77 (shopping list empty state): the `/design` gallery's second `EmptyState` example ("No shopping list yet") is the intended copy/shape to reuse.
- Any screen ticket: `LoadingState`/`ErrorState` are meant to sit directly where a React Query hook's `isPending`/`isError`/`error` says to — see TEST-155's `docs/features/TEST-155-api-client.md` for those hooks.
