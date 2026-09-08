# TEST-76 — Generate shopping list from selected recipes

## What this is

`POST /api/shopping-list` turns a set of selected recipes into one shopping list:
ingredients that share a name are combined into a single line item with quantities
summed, and each line item records which recipe(s) it came from. `GET /api/shopping-list`
reads the current list back.

## The matching rule

Two ingredients are combined when their `name` fields are equal, **case-insensitively
and after trimming whitespace** — `"Onion"`, `"onion"` and `" onion "` are the same
ingredient. This is name equality only: nothing else about the ingredient is
considered.

That has a real consequence worth stating plainly: **a same-named ingredient with a
different unit is still combined**, and the resulting quantity is a raw sum across
whatever units happen to be present (e.g. `1` + `150` → `151`, even if one was "whole"
and the other was "g"). Unit-aware combination is explicitly out of scope for this
ticket (AC4) — the follow-up ticket for fuzzy matching and unit conversion is where
that gets fixed. Until then, a same-named ingredient across recipes should use
consistent units, or the combined quantity will not be meaningful.

## Regeneration merges into the existing list — binding decision

Recorded on the TEST-76 Beacon ticket, proposed by DEV-5 (owns the three screens that
render the result), binding on TEST-76, TEST-77, TEST-153 and TEST-154. Full reasoning
is on the ticket; summarized here because it drives everything below the aggregation
step.

**Regenerating the list — posting again with a different recipe selection — merges
into the existing list. It does not replace it.** Five rules:

1. A generated item that was never hand-edited is freely overwritten with the
   recalculated quantity and `sourceRecipeIds`.
2. A generated item whose quantity **was** hand-edited keeps that quantity —
   regeneration never touches it — but `sourceRecipeIds` still refreshes to the
   current contributors, so provenance stays accurate even though the number doesn't
   move.
3. A manual item (empty `sourceRecipeIds`) is outside aggregation matching entirely.
   Regeneration never touches it.
4. Checked-off state is preserved for any item that survives regeneration under the
   same name match. Only a genuinely new item starts unchecked.
5. An ingredient no longer required by any selected recipe is dropped if it was never
   hand-edited (it was purely derived, and the derivation says it's gone), kept if it
   was hand-edited (a correction is deliberate and shouldn't vanish because a recipe
   was deselected).

**This requires a persisted `quantity_edited` boolean on `shopping_list_items`**
(migration `20260908190000_add_quantity_edited_to_shopping_list_items`, additive, no
rewrite of TEST-78's schema). It cannot be inferred by comparing the stored quantity
against what aggregation would produce — editing 2 to 2 still counts as edited — so
it's an explicit flag. **This ticket only adds the column and reads it during merge; it
does not write it.** Setting it is TEST-154's job (the quantity-edit endpoint). Until
that lands, integration tests here set it directly via SQL to exercise rule 2 and the
"kept" half of rule 5 — there is no way to reach that state through the public API yet,
which is expected and not a gap in this ticket.

There is exactly one shopping list in this app (no multi-list history): the first
generation creates the `shopping_lists` row, and every later generation merges into
that same row rather than creating a new one. `GET /api/shopping-list` reads it; `404`
before one has ever been generated.

## Why `GET /api/shopping-list` is in this ticket

The ticket's own scope statement says "persist that list and expose it over REST."
TEST-77 (blocked by this ticket) will need to read the current list on page load
without triggering a regeneration, and a `GET` alongside `POST` on the same resource
matches the pattern already established for `/api/recipes`. It's a small, low-risk,
conventional REST completion — flagging it here rather than treating it as a silent
scope decision.

## Layering

- `backend/src/services/shoppingListService.ts` — `aggregateIngredients` (pure,
  combines ingredients across recipes) and `mergeShoppingList` (pure, applies the five
  rules above) are both plain functions with no I/O, unit-tested directly. The
  orchestrator `generateShoppingList` fetches the selected recipes, calls both, and
  persists the result inside one transaction.
- `backend/src/repositories/shoppingListsRepository.ts` — extended with
  `getCurrentShoppingList` (public shape, for the `GET`), and two merge-only additions:
  `getCurrentShoppingListForMerge` (reads `quantity_edited` and `position`, which are
  backend bookkeeping and deliberately not part of the shared `ShoppingListItem`
  contract) and `applyShoppingListMerge` (one transaction: create-or-touch the list,
  delete what rule 5 drops, upsert everything else via `INSERT ... ON CONFLICT (id) DO
UPDATE`, which handles both a new item and an update to an existing one with the same
  statement — `position` is excluded from the `DO UPDATE SET` clause so an existing
  item's position is never disturbed by a regeneration).
- `backend/src/controllers/shoppingListController.ts`, `routes/shoppingListRoutes.ts`,
  `schemas/shoppingListSchemas.ts` — the usual route → controller → service → repository
  layering, `GenerateShoppingListInput` validated with `.strict()` against the shared
  contract.

## Degenerate input (AC6)

- Empty selection: not an error — a well-formed (possibly empty) list.
- A nonexistent recipe id: `404 RECIPE_NOT_FOUND`, checked for every id **before** any
  write starts, so a bad id in the list never produces a half-written list.
- Duplicate recipe ids in one request are deduplicated before fetching, so a repeated
  id can't double-count an ingredient.
- "Recipe with no ingredients" can't currently be reached through the real API — recipe
  creation and update both require at least one ingredient — so it's covered as a unit
  test against `aggregateIngredients` directly (a plain `Recipe` with `ingredients: []`)
  rather than as an integration test that would have to fake an unreachable state.

## Tests

- **Unit**: `shoppingListService.aggregate.test.ts` (the DoD's required cases —
  duplicate names, differing units on the same name, empty selection, single recipe, a
  recipe with no ingredients, a non-integer sum — plus case-insensitive/trimmed
  matching and AC4's "genuinely different names" case), `shoppingListService.merge.test.ts`
  (all five regeneration rules, in isolation, no database), `shoppingListService.generate.test.ts`
  (the orchestrator, repositories mocked).
- **Contract**: `shoppingListSchemas.contract.test.ts` — `GenerateShoppingListInput`
  accepted/rejected shapes, including that an empty `recipeIds` array is valid.
- **Integration**: `shoppingListApi.integration.test.ts` — the AC1 worked example
  end-to-end, AC2/AC3/AC5/AC6 through real HTTP + Postgres, and all five regeneration
  rules exercised against the real database (with `quantity_edited` seeded directly via
  SQL where the write path doesn't exist yet, as above).

93 tests total across the three layers (40 unit, 18 contract, 35 integration —
`npm run test:unit` / `test:contract` / `test:integration` in `backend/`, or `npm test`
for all three in sequence). `tsc` build clean, ESLint clean, Prettier clean.
