# TEST-248 — Warm theme tokens + restyled shared UI

## What changed

Defined a warm, food-app palette (terracotta accent, warm off-white page background, cream card surface, warm-gray text) as Tailwind v4 theme tokens in `frontend/src/index.css`, and restyled every shared component in `frontend/src/components/ui/` to use them — `Button`, `Card`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Modal`, `Badge`, `EmptyState`, `LoadingState`. Added a display serif (`Fraunces`) for headings, with a real fallback stack. Updated `frontend/src/pages/DesignSystemPage.tsx` and `docs/design-system.md` to document and show the new theme. Full token list, contrast measurements, and the deliberate exceptions (semantic colors left alone, Modal's overlay staying neutral) are in `docs/design-system.md`'s new "Theme" section — this doc covers the decisions and verification, not a re-listing of every value.

## What did not change

- `Alert` and `Badge`'s success/warning/danger variants — semantic status colors, not the neutral/accent palette this ticket restyles.
- `ErrorState.tsx` — needed **no edits at all**. It composes `Alert` (unchanged, semantic) and `Button` (restyled), so it inherits the new theme automatically through those two.
- Any component's markup, props, or behavior — appearance only, per the ticket's own scope.
- `Input`/`Textarea`'s `aria-invalid`/`aria-describedby` wiring — untouched, only their surrounding classes changed.

## A correction to the ticket's own notes

The ticket states `docs/design-system.md` was "already known to be behind on the Input/Textarea accessibility attributes" and asks to fix that while in the file. That's not accurate as of this ticket — both `Input` and `Textarea`'s sections already document the `aria-invalid`/`aria-describedby` wiring (lines 29 and 42 pre-change). No backfill was needed or done.

## A bug found and fixed along the way

`Checkbox` and `Radio` used `text-blue-600` (now `text-accent`, before the fix below) intending to color the native checked state. This repo has no `@tailwindcss/forms` plugin and no `accent-color` rule anywhere — so that class was never actually controlling the checkbox/radio tint. It only *looked* right because Chrome's own default checkbox blue happens to be close to Tailwind's `blue-600`. Confirmed via a browser check: after the palette swap, checkboxes and radios still rendered blue despite `text-accent`. Fixed by switching both to Tailwind's `accent-*` utility (`accent-accent`), which sets the real `accent-color` CSS property browsers use for native checkbox/radio/range tinting — verified visually afterward, now terracotta.

## Contrast (AC3)

Every text-on-background pairing actually shipped was calculated (relative luminance / WCAG contrast ratio), not assumed. Numbers and the reasoning for where `ink-subtle` is and isn't safe to use are in `docs/design-system.md`'s Theme section. Everything shipped clears its required threshold (4.5:1 for real body text, 3:1 for the focus ring and for disabled/icon-only text).

## Verification

- `npm test -w frontend` — 108 tests, 20 files, exit 0, **no assertion changed** (this suite has no `toHaveClass`, confirmed by inspection and by the fact that a full palette swap needed zero test edits).
- `npm run lint` — exit 0. `npm run build` (both workspaces) — exit 0.
- Visual check via a running dev server at `/design` (desktop width): confirmed the font loads, the ground/surface distinction is visible, focus rings are clearly visible in terracotta against the ground, and — this is how the checkbox/radio bug above was actually caught — the checked-state color was verified to actually change, not just assumed from the class name.
- **375px width was not visually verified** — the browser automation tool's window-resize did not take effect against this extension's viewport in this environment (the page kept rendering its `lg:` desktop grid at every window size attempted, twice). This ticket touches only color/font-family/radius/shadow classes; no responsive/breakpoint classes (`sm:`, `lg:`, flex-direction, grid-columns) were touched anywhere, so there is no new mobile-layout risk from this change specifically — but the 375px checkbox is based on that reasoning, not an actual screenshot, and is worth a real check next time a dev server is easily reachable.

## No end-to-end debt

Nothing a user can do changes — this is a restyle, not a new flow — so there's no new flow for TEST-232's eventual harness to cover, per the ticket's own notes.
