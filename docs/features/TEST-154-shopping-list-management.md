# TEST-154 — Shopping list management: edit quantity, clear/reset

The two edits the shopping list needs beyond checking items off (TEST-77): correcting a quantity, and clearing the whole list to start over. Also: flipped the frontend's default from its typed mock to the real backend, now that TEST-234 shipped the endpoints — and found one real gap that flip surfaced.

## What's built

- **Quantity edit** (`ShoppingListItemRow.tsx`): each row now has its own small form — a `hideLabel` `Input` (new `Input` variant, see below) plus a "Save" button — separate from the checkbox. The checkbox's own label went from `"{name} — {quantity} {unit}"` (TEST-77) to just `{name}`, since combining a toggle and an editable value into one label made the two ambiguous.
- **Clear/reset** (`ShoppingList.tsx`): a "Clear list" button (shown only when the list has items) opens a `Modal` stating how many items will be lost; confirming calls a new `useClearShoppingList` hook, cancelling closes it with nothing touched.
- **`useClearShoppingList`** (`hooks.ts`): there's no bulk-clear endpoint, only the per-item `DELETE`, so this calls it once per item id, in sequence, then invalidates the list query. A clear is rare and deliberate — no reason to fire the deletes concurrently for it.
- **`Input` gained a `hideLabel` prop** — keeps a real `<label for>` association (still satisfies "the field has a `<label>`", AC7) but visually hides it (`sr-only`), for a field compact enough that surrounding text (the unit, the item name) already carries its purpose. Added to `/design` and `docs/design-system.md`.
- **`VITE_API_MODE` now defaults to `http`** (`frontend/src/lib/api/config.ts`, `frontend/.env.example`) — both `recipes/api.ts` and `shopping-list/api.ts` talk to the real backend by default now that TEST-72/TEST-76/TEST-234 all exist. `mock` is still available (build a screen ahead of an endpoint it needs) but is no longer the default. **Vitest's config now pins `VITE_API_MODE=mock` explicitly** (`vite.config.ts`'s `test.env`) — before this ticket that was true only by an unset-env-var accident; now it's a stated choice, so a future default change to `config.ts` can't silently break every test that depends on the mock.

## A native-validation trap worth knowing about

`handleQuantitySubmit`'s own validation (empty / not-a-number / non-positive → error message on the field) turned out not to be the only validation in play: the quantity `<input>` also carries `min="0"`, and a browser (real or jsdom) refuses to fire a form's `submit` event at all when a control fails its own HTML constraint — so entering `-5` and clicking Save did *nothing visible*, not even the intended AC3 error message, because the submit handler never ran. Fixed by adding `noValidate` to that `<form>`, so this component's own validation is the only one that ever speaks. Caught by a unit test that reproduced cleanly outside any mock/timing complexity — worth remembering whenever a form mixes a native HTML constraint (`min`, `max`, `required`, `pattern`) with custom validation logic: only one of them should be in charge, or the native one silently wins first.

## The mock/http flip: what it actually caught

Building this against the mock (as instructed — TEST-154 "cannot be honestly verified against mocks", but the components' logic is exercised there first) and then flipping `VITE_API_MODE=http` and running the real stack (backend + a real Postgres, not the shared `recipe_box_test` — see note below) surfaced one thing the mock had no way to catch:

**A fresh shopping list (nothing ever generated) 404s.** `GET /api/shopping-list` returns `{ error: { code: 'SHOPPING_LIST_NOT_FOUND', ... } }` before the first generation ever happens. The mock's `get()` never fails — it always has a seeded list — so this path was never exercised until the client actually talked to the real server. `ShoppingList.tsx` was treating every `listQuery.isError` as a real failure (an `ErrorState` with a retry button), which is wrong for this specific code: "nothing generated yet" is the same situation as "list generated but empty" from the user's point of view, and should show the same friendly `EmptyState`, not an error. Fixed: `SHOPPING_LIST_NOT_FOUND` is now excluded from the error branch and falls through to the empty-state branch. Covered by a regression test (mocking `shoppingListApi.get` to reject with that exact code).

This was a frontend-only gap, not a TEST-234 backend disagreement — the backend's 404 is correct and intentional (a clearly-named error code for a real, expected condition); the bug was in how this screen interpreted it. Everything else checked out: every path this client calls now matches TEST-234's real routes (confirmed by reading `shoppingListRoutes.ts` directly, not by re-trusting this client's own assumptions — see TEST-234's note on why that distinction matters), and "clearing" a list removes its items but never its row (confirmed both by reading `shoppingListsRepository.ts`'s `removeShoppingListItem` — it only ever `DELETE`s from `shopping_list_items` — and by checking a real database after clearing one: the `shopping_lists` row is still there, `shopping_list_items` for it is empty).

**A methodology note for whoever next does a real-stack manual check:** don't point it at the shared `recipe_box_test` database while doing so — another session's integration-test run can truncate and reseed it mid-check (this happened once while verifying this ticket: an item's id and edited quantity both silently reset partway through, which looked at first like a real bug). Create a scratch database, run migrations against it, point the backend at it, and drop it when done.

## Verification

- Unit/component (Vitest + RTL): `ShoppingListItemRow.test.tsx` — quantity save (valid, unchanged-value no-op, each AC3 invalid case via `it.each`, syncing to an externally-changed real value). `ShoppingList.test.tsx` — the empty-state-not-error regression above, quantity edit wired through the screen, the full clear/cancel/confirm flow. Full frontend suite green, re-run several times (flakiness elsewhere in the suite — unrelated files, not this ticket's — confirmed load-related and gone on retry; see the note on TEST-235 below).
- `npm run lint` → exit 0. `npm run build` → exit 0.
- Manually verified against the real stack (backend + isolated Postgres, `VITE_API_MODE=http`): add an item, edit its quantity (persists across reload), reject an invalid quantity with the field-level message, open/cancel/confirm the clear dialog, confirm the list is empty and stays empty across reload, confirm the empty-vs-error branch is now correct for a never-generated list.
- Playwright E2E: deferred to [TEST-232](https://beacon.chro.media/browse/TEST-232) (no E2E runner installed), same as TEST-77. Named per the deferral rule, not called "not applicable."

**A note for TEST-235** (the flaky-test ticket, previously about `mockDelay`/timeout races): while writing this ticket's own tests, two *different* races surfaced, worth folding in if whoever owns that ticket wants the fuller picture:
1. A test that fires a mutation and only checks its fast, optimistic result (not the mutation's full settlement) can leave a still-in-flight mock-delayed promise running past the test's own teardown — it then resolves during the *next* test, after that test's own `beforeEach` reset, and mutates the shared mock state out from under it. Fixed here with an explicit short wait after such assertions, with a comment explaining why it's there.
2. A `<form>` field with both a native HTML constraint (`min`) and custom JS validation can silently swallow submission for a value the custom validation was specifically written to catch — not a timing issue, but adjacent enough (surfaced by the same kind of "test doesn't reproduce the mental model" investigation) that it seemed worth writing down in the same place.

## Acceptance criteria coverage

- **AC1** (quantity edit saves, shown, survives reload): `handleQuantitySubmit` → `useUpdateShoppingListItem`; verified against the mock and the real backend.
- **AC2** (edited quantity not overwritten by regeneration): unchanged from TEST-234/TEST-76 — `quantity_edited` is set on any quantity write and regeneration's merge already respects it; this ticket writes through the same path, doesn't need its own logic.
- **AC3** (invalid quantity refused, message on field, previous value kept): `parseQuantity` + the `noValidate` fix; four cases in `it.each`.
- **AC4** (clear confirmed first): `Modal`, states the item count.
- **AC5** (cancel changes nothing): `Modal`'s `onClose` only closes state; no mutation called.
- **AC6** (after clearing, empty state explains how to start again, survives reload): existing `EmptyState` branch, now also reached correctly from the `SHOPPING_LIST_NOT_FOUND` case.
- **AC7** (375px, `<label>`, keyboard, focus states): `hideLabel` keeps a real label; `Input`/`Button` already carry visible focus rings; verified compact layout doesn't overflow at 375px in the real-stack manual check.
