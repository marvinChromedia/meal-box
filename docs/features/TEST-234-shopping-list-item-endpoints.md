# TEST-234 — Shopping-list per-item endpoints, and the generate path fix

## What this is

Two things, both server-side only.

1. Four endpoints the shopping-list screen (TEST-77) and quantity-edit UI (TEST-154)
   need: check an item off, add one by hand, remove one, change a quantity. None of
   these existed before this ticket — TEST-76 built generation and reading the whole
   list, nothing item-level.
2. A path fix: the merged frontend client calls `POST /api/shopping-list/generate`; the
   merged backend served `POST /api/shopping-list`. Generation would 404 against a real
   server. Fixed by moving the server to `/generate` rather than changing the client —
   see "Why `/generate`" below.

## Why this ticket exists

Found by the session starting TEST-77, by reading the code rather than assuming the
endpoints were there. TEST-77's own acceptance criteria require checking items off,
adding one by hand and removing one — every one of those needs a per-item endpoint,
and no prior ticket owned building them. Recorded on the ticket as a specification gap,
not a mistake by any session that had already merged work.

## Why `/generate`, not changing the client

Generation is an action — combine ingredients from selected recipes, merge the result
into the existing list — rather than a plain resource creation. The frontend client and
its own feature doc (TEST-155) were already written assuming `/generate`, and TEST-153's
selection-and-generate flow consumes it that way. Moving the server one path segment
was the smaller, more correct change; `docs/api.md` reflects the corrected path.

**What this says about the contract seam, worth remembering:** `shared/src/types.ts`
guarantees the _shapes_ two sides exchange and says nothing about the _paths_ they use.
A typed mock happily satisfies a client calling a URL the server has never heard of —
neither side's tests caught this, only reading both together did. See the note added to
`docs/architecture.md`.

## The four endpoints

| Method   | Path                           | What it does                                  |
| -------- | ------------------------------ | --------------------------------------------- |
| `POST`   | `/api/shopping-list/items`     | Adds a hand-added item                        |
| `PATCH`  | `/api/shopping-list/items/:id` | Partial update: `checked`, `quantity`, `unit` |
| `DELETE` | `/api/shopping-list/items/:id` | Removes an item, generated or manual          |

All three return the full `ShoppingList`, matching the frontend client's declared
`ShoppingListApi` interface (every mutation method there returns `Promise<ShoppingList>`)
and the pattern TEST-76 already established for generate/read.

### Adding an item bootstraps the list if none exists yet

`POST /items` reuses `getCurrentShoppingListForMerge` (from TEST-76) to find the
current list, or create one if this is the very first shopping-list action a user has
ever taken — the same lazy-bootstrap `generate` already does. AC2's wording ("given an
existing list") describes the common case; a shopper starting a list by adding an item
by hand, before ever generating one from a recipe, is not an error state. This wasn't
explicitly asked for but follows directly from the "exactly one list, bootstrapped
lazily" model TEST-76 already committed to — flagging the decision here rather than
letting it pass silently.

### The quantity flag: AC4 and AC5

A `PATCH` whose body includes `quantity` does two things beyond persisting the number:
sets `quantity_edited = true` (read by TEST-76's regeneration merge, rule 2 — an edited
quantity is never recalculated), and bumps the parent list's `updated_at` (AC5, decided
on TEST-154, consistent with what `applyShoppingListMerge` already does on every
regeneration).

A `PATCH` that only touches `checked` or `unit` does **neither** — `quantity_edited` is
untouched and the list's `updated_at` is untouched. This is a deliberate reading of
AC4/AC5's literal wording ("when its quantity is updated"), not an oversight: checking
an item off is a frequent, low-stakes action that shouldn't be flagged as a hand-edit or
treated as "the list changed" the way a quantity correction is.

**Consequence worth knowing:** the frontend's `updateItem` patch type also allows a
`unit`-only change. `mergeShoppingList` (TEST-76) always overwrites `unit` from the
fresh aggregation for a matched, non-manual item regardless of `quantity_edited` — so a
unit changed this way, alone, will **not** survive the next regeneration. Nothing in
this ticket's scope covers protecting `unit` the way `quantity_edited` protects
`quantity` (Out of Scope explicitly forbids touching `applyShoppingListMerge`); this is
the same category of thing as TEST-76's own "differing units" consequence — a real,
documented limitation rather than a silent one.

## Repository additions — not routed through `applyShoppingListMerge`

Per the ticket's own note (traced back to the session that wrote TEST-76's merge
logic): `applyShoppingListMerge`'s upsert shape assumes a full aggregation pass over
every item in the list, not a single targeted change. Three small, direct functions in
`shoppingListsRepository.ts` instead:

- `addShoppingListItem(pool, {name, quantity, unit})` — bootstraps the list if needed,
  inserts one row at the next position.
- `updateShoppingListItem(pool, itemId, {checked?, quantity?, unit?})` — builds a
  parameterized `SET` clause from whichever fields are present (column names are
  hardcoded, only values are parameters), sets `quantity_edited = true` only when
  `quantity` is present, and — via one `RETURNING shopping_list_id` — conditionally
  bumps the parent list's `updated_at` in the same transaction. Returns `false` without
  writing anything if the item id doesn't exist.
- `removeShoppingListItem(pool, itemId)` — a plain parameterized `DELETE`; returns
  whether a row existed. Source rows in `shopping_list_item_sources` cascade.

None of the three touch `applyShoppingListMerge` or its upsert/deletion shape.

## Validation (AC7)

- `quantity` must be a positive number wherever it appears (add or update) — empty,
  zero, negative and non-numeric are all rejected with `400 VALIDATION_ERROR` before
  any database code runs.
- The `PATCH` body must include at least one of `checked`/`quantity`/`unit` — an empty
  body is rejected, not silently accepted as a no-op.
- An item id that isn't a well-formed UUID is `400`; a well-formed id that doesn't
  exist is `404 SHOPPING_LIST_ITEM_NOT_FOUND`.
- The update patch shape (`{checked?, quantity?, unit?}`) is **not currently an
  exported `shared/src/types.ts` type** — the frontend client's `updateItem` parameter
  is a local inline `Partial<Pick<ShoppingListItem, 'checked'|'quantity'|'unit'>>`
  rather than an imported one. This backend's Zod schema matches that shape
  structurally but isn't checked against it by the compiler the way `RecipeInput` or
  `GenerateShoppingListInput` are via `satisfies`. Not a defect in this ticket — there
  is no shared type to import — but worth a future contract addition so this shape
  can't silently drift the way the generate path just did.

## Tests

- **Unit**: `shoppingListService.items.test.ts` (service layer, repository mocked —
  delegation, and the null-on-not-found → 404 path for update/remove without an
  unnecessary re-fetch); `shoppingListsRepository.items.test.ts` (the dynamic
  `SET`-clause construction directly — checked-only, quantity-only sets
  `quantity_edited` and touches `shopping_lists`, all three combined, not-found leaves
  `shopping_lists` untouched).
- **Contract**: `addShoppingListItemInputSchema`, `updateShoppingListItemInputSchema`,
  `shoppingListItemIdParamSchema` — accepted/rejected shapes, all of AC7's invalid-
  quantity cases, the empty-patch rejection.
- **Integration**: `shoppingListItemsApi.integration.test.ts` — every AC (1, 2, 3, 4,
  5, 7) against real Postgres, including that a quantity edit survives a subsequent
  regeneration and that checking an item off does not bump the list's `updatedAt`
  while a quantity edit does. `shoppingListApi.integration.test.ts` (TEST-76) updated
  to call the corrected `/generate` path — those tests would otherwise 404 against
  this branch.

## Configuration / deployment

None. No new environment variable, no migration — `quantity_edited` already exists
from TEST-76.
