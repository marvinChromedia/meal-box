# TEST-77 — Shopping list UI

The screen used in the shop: view the generated list, check items off, add or remove items by hand. Routed at `/shopping-list` (`frontend/src/features/shopping-list/ShoppingList.tsx`), linked from the home page.

## Why

This is TEST-71's payoff screen and the only one used away from a desk — one-handed, in a grocery aisle, possibly on a bad connection. Two things follow from that: check-off has to feel instant (no waiting on a round trip), and tap targets have to be big enough to hit while walking.

## What's built

- **`ShoppingList.tsx`** — the screen: loading/error/empty states (via TEST-157's components), the item list, and the add-item form.
- **`ShoppingListItemRow.tsx`** — one line item: a large (`size="lg"`) `Checkbox` whose own accessible label is `"{name} — {quantity} {unit}"`, plus a secondary line showing either an "Added by you" `Badge` (manual item) or `"From <recipe titles>"` (generated item), plus a Remove button.
- **`Checkbox` gained a `size` prop** (`sm` default | `lg`) in `frontend/src/components/ui/Checkbox.tsx` — `lg` is a 24px box with larger label text, for exactly this one-handed-checklist case. Added to the `/design` gallery and `docs/design-system.md` in this same change, per the design-system rule.
- **`useUpdateShoppingListItem` (TEST-155's hook) is now optimistic** — see "Optimistic check-off" below.

## Combined line items and provenance (AC1, AC2)

Rendering the combined line and showing where it came from is entirely a read of what TEST-76's aggregation already produced (`ShoppingListItem.quantity`/`unit` are already summed server-side) and what TEST-155's client already fetches — this screen doesn't do any combining itself. `ShoppingListItemRow` looks up each id in `item.sourceRecipeIds` against `useRecipes()`'s data to show a title. An empty `sourceRecipeIds` is a manual item (per `shared/src/types.ts`'s own doc comment) — derived, not a stored flag, matching the existing convention.

**A source recipe id with no match renders "Recipe removed"** rather than blank or crashing. This isn't a hypothetical: TEST-78 deliberately kept no foreign key from a shopping-list item back to its source recipe, specifically so a list survives deleting a recipe that's already on it — so a stale id is an expected, ordinary case, not corruption. Covered by `ShoppingListItemRow.test.tsx`'s "labels a source recipe that no longer exists" test.

## Optimistic check-off (AC3, AC4)

`useUpdateShoppingListItem` (`frontend/src/features/shopping-list/hooks.ts`) now does the standard React Query optimistic-update dance:

- `onMutate` cancels any in-flight refetch, snapshots the current cache, and writes the patched item into the cache immediately — before the request resolves.
- `onError` restores the snapshot if the request fails.
- `onSettled` always invalidates afterward, so the optimistic write is never the last word — a real server response is.

This is a change to a hook TEST-155 built and TEST-154 will also use for quantity edits (per the coordinating session's guidance on that ticket) — the optimistic behavior benefits that too, at no extra cost, since it applies to any patch (`checked`, `quantity`, or `unit`) through this one function, not just check-off.

**Testing an optimistic-then-settled transition without a real race — worth reading if you write a similar test.** The first attempt at these tests raced the assertion against the mock API's own `mockDelay()` (e.g. `waitFor(..., { timeout: 50 })`, betting that 50ms comes before the mock's ~150ms). That's fragile in both directions: too tight and it fails even when the code is correct (confirmed — it failed even running the single file alone, no other suite activity involved), and if a mock ever resolves faster than expected the "settled" state can be reached before the test's first poll ever observes the transient "optimistic" one, i.e. the exact same shape of bug this project is already tracking as [TEST-235](https://beacon.chro.media/browse/TEST-235) (frontend tests flaking against `mockDelay`/timeout contention). The fix used here: replace the mock's real timing with a manually-controlled `Promise` in the test (hold the mocked `updateItem` call open, assert the optimistic state while `isPending` is still true, *then* resolve or reject it). That makes the ordering deterministic instead of timed — see `hooks.test.tsx`'s two tests for the pattern. Passed the single-file-alone conformance mentioned above, and 48/48 in the full suite.

## Manual add and remove (AC5, AC6)

Plain forms/buttons wired to `useAddShoppingListItem` / `useRemoveShoppingListItem`, both already existing TEST-155 hooks — no changes needed there. The add form is uncontrolled-ish local `useState` (name/quantity/unit), validated client-side (non-empty name/unit, a positive finite quantity) before calling `mutate`, and clears on success.

## Mobile and accessibility (AC7)

- `Checkbox size="lg"` (24px box, larger label) for the primary tap target; the label text covers the full item description, so tapping anywhere on "Spaghetti — 200 g" toggles it, not just the tiny box itself.
- Checked state is native `<input type="checkbox">` — announced to assistive tech and shown by shape (a checkmark), not colour alone; the row also dims and strikes through its secondary line when checked, as a visual reinforcement, not the only signal.
- Verified no horizontal overflow and comfortable layout in the `/design` gallery pattern established by TEST-157 (same manual-check method: `document.documentElement.scrollWidth === clientWidth` at 375px).

## The mock/real-backend mismatch (why this still runs on the mock)

Confirmed by reading both sides directly: `backend/src/routes/shoppingListRoutes.ts` only ever registered `POST /` and `GET /` (mounted at `/api/shopping-list`) — no per-item endpoints exist anywhere in `backend/src`, and `shoppingListsRepository.ts` only exports whole-list operations. Separately, the merged frontend client (TEST-155) calls `POST /shopping-list/generate`, which doesn't match the server's `POST /shopping-list` either — two already-shipped tickets that simply never talked to each other, since a typed mock happily satisfies a client calling a path the server has never heard of.

Both are now [TEST-234](https://beacon.chro.media/browse/TEST-234) (owned by DEV-1, in progress), not this ticket's to fix — raised with the coordinating session before writing any of this screen, rather than either expanding this ticket into backend work or building against endpoints that don't exist. This screen is built and tested entirely against the typed mock (`VITE_API_MODE=mock`, the default), which is exactly the case AC5 of TEST-155 was designed for. **Before flipping to `VITE_API_MODE=http`**, verify the three per-item paths and the generate path against TEST-234's actual implementation, not against this client's own assumptions — that mismatch is what caused the problem in the first place.

## Verification

- Unit/component (Vitest + RTL): `Checkbox.test.tsx` (2, the size variant), `ShoppingListItemRow.test.tsx` (6: combined line item, manual badge, provenance, missing-recipe label, toggle, remove), `ShoppingList.test.tsx` (4: loading→list, check-off, manual add, remove), `hooks.test.tsx` (6, incl. the two deterministic optimistic/rollback tests above). Full frontend suite: 48/48, confirmed by exit code (`npx vitest run`, redirected to a file, `echo $?` = 0 — not just the printed summary, per this repo's documented command-proxy caveat).
- `npm run lint` → exit 0. `npm run build` → exit 0 (this surfaced two real type errors worth noting for whoever touches these files next: `Checkbox`'s new `size` prop collided with the native `<input>` `size` attribute (fixed by omitting it from the extended HTML attributes), and accessing `.code` on a query/mutation `error` needs the hook's `useQuery`/`useMutation` call to carry an explicit `ApiClientError` error-type generic — `shopping-list/hooks.ts` didn't have one before this ticket, since nothing had read `.code` off its errors yet).
- Playwright E2E: deferred to [TEST-232](https://beacon.chro.media/browse/TEST-232) (no E2E runner installed in this repository), which lists TEST-77's first-run empty recipe box as its first debt item — not this ticket's own empty-list case, but the same harness gap. Agreed with the coordinating session.

## Acceptance criteria coverage

- **AC1** (combined line as generated): rendered as-is from the (mock) API; no combining logic in this ticket.
- **AC2** (provenance visible, manual items distinct): `ShoppingListItemRow`'s recipe-title lookup + "Recipe removed" fallback; `Badge` for manual items.
- **AC3** (instant check-off): optimistic `onMutate`, see above.
- **AC4** (honest failure): `onError` rollback + `updateItem.isError` surfaced via `ErrorState` on the screen.
- **AC5** (manual add, survives reload): `useAddShoppingListItem`, form validation, `sourceRecipeIds: []` (server-set).
- **AC6** (remove, survives reload): `useRemoveShoppingListItem`.
- **AC7** (mobile + a11y): see "Mobile and accessibility" above.
