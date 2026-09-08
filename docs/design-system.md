# Design System

Written reference for the components in `frontend/src/components/ui/`. This is the reference copy — the live, visual version is `http://localhost:5173/design`. Keep both in sync: a new component or variant goes into `components/ui/`, the `/design` page, and this file together.

All components are Tailwind-classes-only (no `style` prop) and accept a `className` to extend/override, unless noted otherwise.

## Theme

Tailwind v4, tokens defined in an `@theme` block in `frontend/src/index.css` (no `tailwind.config.js` — this project has none, correctly, per Tailwind v4's CSS-first config). Every color/radius/shadow/font token below auto-generates the matching Tailwind utility (`--color-accent` → `bg-accent`/`text-accent`/`border-accent`/`accent-accent`/etc., `--radius-card` → `rounded-card`, `--shadow-soft` → `shadow-soft`, `--font-display` → `font-display`).

| Token | Value | Use |
| --- | --- | --- |
| `--color-accent` | `#8C4A2F` | Primary actions, links, checked checkbox/radio (`accent-accent`, not `text-accent` — see below), focus rings |
| `--color-accent-hover` | `#703B26` | Hover state for accent-colored buttons |
| `--color-ground` | `#FAF7F2` | Page background (`body`, set once in `index.css`) |
| `--color-surface` | `#FFFBF5` | Card/Modal panel background — a shade lighter than `ground` so a raised surface reads as raised even before its border/shadow are noticed |
| `--color-line` | `#E4D9CC` | Low-emphasis borders/backgrounds (Card border, default Badge, secondary Button) |
| `--color-line-strong` | `#D9CBB9` | Higher-emphasis borders (form field borders, outline Button, hover states) |
| `--color-ink` | `#2B2320` | Primary text |
| `--color-ink-muted` | `#6B5D54` | Secondary text — labels, descriptions, body copy |
| `--color-ink-subtle` | `#8A7B6E` | Disabled-control text and icon-only glyphs **only** — see contrast note below |
| `--radius-card` | `0.75rem` (12px) | Card, Modal panel, EmptyState, LoadingState's skeleton bars — anything that reads as a "surface." Buttons/inputs/badges keep their existing smaller radii; this ticket didn't touch those |
| `--shadow-soft` | tinted with the accent hue | Card, Modal panel |
| `--font-display` | `'Fraunces', Georgia, 'Times New Roman', serif` | Headings only — real `<h1>`–`<h4>` elements and `CardHeader`/Modal's `<h2>` title. **Not** applied to `EmptyState`/`ErrorState`'s bold `title` text — those are status/alert labels (`role="status"`/`role="alert"`), not headings |

### Contrast, measured (WCAG AA: 4.5:1 normal text, 3:1 large text / non-text UI)

- White text on `accent`: **6.70:1**
- `accent` text/focus-ring on `ground`: **6.27:1** (clears both the 4.5:1 text threshold and the 3:1 non-text/focus-ring threshold)
- `ink` (primary text) on `ground`: **14.4:1**
- `ink-muted` on `ground`: **5.92:1**; on `surface`: **6.13:1**
- `ink-subtle` on `ground`: **3.83:1** — clears 3:1 but not 4.5:1. This is why `ink-subtle` is used **only** for disabled controls (WCAG's contrast requirement doesn't apply to disabled UI) and icon-only glyphs like Modal's close button (a 3:1, non-text pairing). It is never used for real always-visible body text — text that was `gray-500` before (e.g. `CardFooter`) maps to `ink-muted`, not `ink-subtle`, specifically to stay above 4.5:1.
- `Input`/`Textarea`'s error state (`border-red-500`, `text-red-600`) and `Alert`'s four variants are unchanged — they're semantic status colors, not part of this warm/neutral palette, and out of this ticket's scope.

### Deliberate exceptions

- **Modal's overlay scrim stays `bg-gray-900/50`**, not a warm/tinted color. A brand-tinted overlay looks like a stage light, not a dimming scrim — this is a neutral-on-purpose exception to "every color is a token."
- **Checkbox/Radio use `accent-accent`, not `text-accent`.** There's no `@tailwindcss/forms` plugin or `accent-color` rule anywhere in this repo, so a `text-{color}` class was never actually controlling the native checked-state tint — the previous `text-blue-600` only visually matched because it happened to be close to Chrome's own default checkbox blue. Tailwind's `accent-*` utility (which sets the real `accent-color` CSS property browsers use for native checkbox/radio/range tinting) is the one that actually works; verified visually.
- `Alert`'s `info`/`success`/`warning`/`danger` variants and `Badge`'s success/warning/danger variants keep their existing blue/green/amber/red — semantic status colors, deliberately not reassigned to the warm palette.

### Font loading

`Fraunces` (weights 600/700, variable optical-size axis) loaded via a Google Fonts `<link>` in `frontend/index.html` with `display=swap` and `preconnect` hints — `swap` means the fallback stack (`Georgia, 'Times New Roman', serif`) renders immediately and is swapped once the webfont loads, so there's no invisible-text window. Georgia and Fraunces are both serif with broadly similar proportions, so the reflow when the swap happens is small — headings are usually well above the fold and not something a user is mid-click on, satisfying AC5 without needing font-metric overrides.

## Button

`frontend/src/components/ui/Button.tsx`

Props: standard `<button>` attributes, plus:

- `variant`: `primary` (default) | `secondary` | `outline` | `danger` | `ghost`
- `size`: `sm` | `md` (default) | `lg`

```tsx
<Button variant="danger" size="sm" onClick={handleDelete}>
  Delete
</Button>
```

## Input

`frontend/src/components/ui/Input.tsx`

Labeled text input. Props: standard `<input>` attributes, plus:

- `label` (required)
- `error?`: string — shows below the field, switches the border to red, and sets `aria-invalid="true"` plus `aria-describedby` pointing at the error message, so a screen reader announces it alongside the field
- `hideLabel?`: boolean — keeps `label` associated with the field for assistive tech (still a real `<label for>`) but visually hides it (`sr-only`), for a compact field where surrounding text already makes its purpose clear (e.g. a quantity field inline in a list row)

```tsx
<Input label="Recipe title" placeholder="e.g. Tomato Pasta" />
<Input label="Quantity" error="Quantity must be a number." />
<Input label="Quantity for Milk" hideLabel type="number" className="w-20" />
```

## Textarea

`frontend/src/components/ui/Textarea.tsx`

Labeled multi-line input. Same shape as `Input` (`label`, `error?`, including the same `aria-invalid`/`aria-describedby` wiring when `error` is set), wraps a `<textarea>`.

```tsx
<Textarea label="Steps" placeholder="1. Boil water..." />
```

## Select

`frontend/src/components/ui/Select.tsx`

Labeled dropdown. Props: standard `<select>` attributes, plus:

- `label` (required)
- `options`: `{ label: string; value: string }[]` (required)

```tsx
<Select
  label="Unit"
  options={[
    { label: 'Cups', value: 'cups' },
    { label: 'Grams', value: 'grams' },
  ]}
/>
```

## Checkbox

`frontend/src/components/ui/Checkbox.tsx`

Props: standard `<input type="checkbox">` attributes, plus:

- `label` (required)
- `size`: `sm` (default) | `lg` — `lg` for a bigger tap target, e.g. a checklist used one-handed (TEST-77)

```tsx
<Checkbox label="Mark as favorite" defaultChecked />
<Checkbox label="Milk — 1 gallon" size="lg" />
```

## Radio

`frontend/src/components/ui/Radio.tsx`

Props: standard `<input type="radio">` attributes, plus `label` (required). Group by giving each a shared `name`.

```tsx
<Radio label="Metric" name="unit-system" defaultChecked />
<Radio label="Imperial" name="unit-system" />
```

## Badge

`frontend/src/components/ui/Badge.tsx`

Props: standard `<span>` attributes, plus:

- `variant`: `default` (default) | `success` | `warning` | `danger`

```tsx
<Badge variant="success">Saved</Badge>
```

## Card

`frontend/src/components/ui/Card.tsx`

Container with optional header/body/footer slots — compose the pieces you need.

- `Card` — the outer container
- `CardHeader`, `CardBody`, `CardFooter` — each a plain `<div>` with standard attributes

```tsx
<Card>
  <CardHeader>Tomato Pasta</CardHeader>
  <CardBody>4 ingredients · 6 steps · 25 min</CardBody>
  <CardFooter>Added 2 days ago</CardFooter>
</Card>
```

## Alert

`frontend/src/components/ui/Alert.tsx`

Props: standard `<div>` attributes, plus:

- `variant`: `info` (default) | `success` | `warning` | `danger`
- `title?`: string

```tsx
<Alert variant="warning" title="Missing ingredient">
  One recipe is missing a quantity for "salt".
</Alert>
```

## EmptyState

`frontend/src/components/ui/EmptyState.tsx`

For a screen with nothing to show yet — no recipes saved, no shopping list generated. Announced to assistive technology (`role="status"`) since it typically replaces a loading state once a request resolves. Props: standard `<div>` attributes, plus:

- `title` (required)
- `description?`: string
- `action?`: `ReactNode` — pass a `<Button>` (or any element); `EmptyState` doesn't prescribe what the action looks like
- `icon?`: `ReactNode`

```tsx
<EmptyState
  title="No recipes yet"
  description="Save your first recipe to start building your recipe box."
  action={<Button size="sm">Add a recipe</Button>}
/>
```

## LoadingState

`frontend/src/components/ui/LoadingState.tsx`

Skeleton placeholder reserving the space real content will occupy, so the layout doesn't shift when it swaps in. Announced via `role="status"` + `aria-busy="true"`; the visible bars are `aria-hidden` since the screen-reader text (`label`) already says what's loading. Props: standard `<div>` attributes, plus:

- `label?`: string — screen-reader-only text, default `"Loading…"`
- `rows?`: number — how many skeleton bars to render, default `3`. Pick a count that roughly matches what's loading (e.g. 3 for a short list, more for a longer one).

```tsx
<LoadingState label="Loading recipes…" rows={3} />
```

## ErrorState

`frontend/src/components/ui/ErrorState.tsx`

Built on `Alert` (so it inherits `role="alert"` for AT announcement). Always shows a plain-language `message`; never shows a raw exception, stack trace, or `code` on its own. Props: standard `<div>` attributes, plus:

- `message` (required) — the API's error message, in plain language
- `title?`: string, default `"Something went wrong"`
- `code?`: string — shown alongside `message`, never in place of it
- `onRetry?`: `() => void` — when given, renders a "Try again" button that calls it
- `retryLabel?`: string, default `"Try again"`

```tsx
<ErrorState message={error.message} code={error.code} onRetry={() => refetch()} />
```

## Modal

`frontend/src/components/ui/Modal.tsx`

Simple controlled dialog. Props:

- `open`: boolean (required)
- `title`: string (required)
- `onClose`: () => void (required)
- `children`: content of the dialog body

```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Open modal</Button>
<Modal open={open} title="Delete recipe?" onClose={() => setOpen(false)}>
  <p>This can't be undone.</p>
</Modal>
```
