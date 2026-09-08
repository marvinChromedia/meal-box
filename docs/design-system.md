# Design System

Written reference for the components in `frontend/src/components/ui/`. This is the reference copy — the live, visual version is `http://localhost:5173/design`. Keep both in sync: a new component or variant goes into `components/ui/`, the `/design` page, and this file together.

All components are Tailwind-classes-only (no `style` prop) and accept a `className` to extend/override, unless noted otherwise.

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
- `error?`: string — shows below the field and switches the border to red

```tsx
<Input label="Recipe title" placeholder="e.g. Tomato Pasta" />
```

## Textarea

`frontend/src/components/ui/Textarea.tsx`

Labeled multi-line input. Same shape as `Input` (`label`, `error?`), wraps a `<textarea>`.

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
<ErrorState
  message={error.message}
  code={error.code}
  onRetry={() => refetch()}
/>
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
