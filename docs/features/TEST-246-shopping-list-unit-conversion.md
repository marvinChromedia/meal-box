# TEST-246 — Combine ingredients that match by name but differ by unit

## What this is

Shopping-list aggregation (`aggregateIngredients` / `mergeShoppingList` in
`backend/src/services/shoppingListService.ts`) previously combined ingredients by name
only, regardless of unit — see the now-superseded section of
[`docs/features/TEST-76-shopping-list-generation.md`](./TEST-76-shopping-list-generation.md).
This ticket teaches it a small, closed set of unit conversions so `200 g` and `0.3 kg`
of the same ingredient become one line instead of two, while keeping anything it can't
safely convert (a count vs. a mass, or two unrelated non-metric units) as separate
lines rather than guessing.

## The conversion table (closed set)

| Class           | Units    | Base unit | Displayed as the larger unit once the total is |
| ---------------- | -------- | --------- | ----------------------------------------------- |
| Mass (metric)    | `g`, `kg` | `g`       | `kg`, once the total reaches `1000 g`            |
| Volume (metric)  | `ml`, `l` | `ml`      | `l`, once the total reaches `1000 ml`            |

Matched case-insensitively and trimmed (`"G"` and `"g"` are the same unit). This is the
entire set — no aliases (`"gram"`, `"litre"`), no imperial units, no open-ended parser.
Two things justify stopping here rather than being more permissive: the ticket's own
AC1 names exactly these four abbreviations, and every unit actually used in this
codebase's recipe data (`backend/src/services/defaultRecipes.ts`) is already an
abbreviation (`kg`, `tsp`, `tbsp`, `oz`, `lb`, `cloves`, `pieces`, …), never a spelled-out
word — there is no evidence an alias would ever match real data, so adding one would be
guesswork the DoD explicitly rules out ("no open-ended unit parser").

Imperial units (cups, ounces, pounds) and imperial↔metric conversion are out of scope —
correctly so, per the ticket, since a cup-to-gram conversion depends on the ingredient
and would need its own, much bigger, decision.

## The grouping/matching rule

Two ingredients combine when their names match (case-insensitive, trimmed — unchanged
from TEST-76) **and** their units are compatible: identical, or both in the same metric
class above. Everything else — no unit, an unrecognized unit, or two different
non-metric units (`cup` vs. `tbsp`) — is treated as incompatible and stays separate.
This is deliberately the same rule whether or not a merge is actually happening: a
single, unmerged `1500 g` line still displays as `1.5 kg`, since "shown in the larger
unit once the total warrants it" is a general display rule for any metric total, not
conditional on there being a second contributor.

Implementation is one function, `aggregationKey(name, unit)` in
`shoppingListService.ts`, used identically by both `aggregateIngredients` (fresh
generation) and `mergeShoppingList` (matching against the existing list) — per the
ticket's own note to verify the logic doesn't end up duplicated across the two paths.

## Rounding rule (AC5)

`roundQuantity()`: round to 2 decimal places, round-half-up (`Math.round(n * 100) /
100`). Applied once, at the point every aggregated group's quantity is finalized — the
same rule for a metric conversion (e.g. `1001 g` → `1.001 kg` → rounds to `1 kg`) and
for an ordinary non-metric sum (a no-op for the typical case). No other rounding or
formatting exists anywhere else in the codebase for this value.

## AC4 — preserving hand-edited state across a key change

`mergeShoppingList` used to match existing items to fresh aggregation by name alone; it
now matches by `aggregationKey(name, unit)`, the same key aggregation uses. This is a
deliberate, named consequence: **an existing line can go unmatched purely because
aggregation now splits its name into a different unit group** — for example, an
existing merged "Onion" line stored with unit `whole` (from before this ticket shipped,
when `1 whole` and `150 g` merged into one nonsensical line) will not match a freshly
aggregated `mass-metric` "Onion" group, because their keys now differ.

No new logic was needed for this — the existing five preservation rules already handle
it correctly:
- If that old line was **never hand-edited**, rule 5 drops it (it's stale, superseded
  by the new correctly-split lines) and the new group(s) insert separately.
- If it **was hand-edited**, rule 5 keeps it untouched — it is not deleted, and not
  silently folded into whichever new group happens to share its name. The new group
  still inserts as its own line. The user ends up with both the untouched edited line
  and a new correctly-converted line, which is the safe outcome: nothing is silently
  overwritten or merged into the wrong quantity.

This is exercised directly in
`backend/test/unit/shoppingListService.merge.test.ts` ("TEST-246 AC4: a hand-edited
line survives untouched when regeneration splits its name into a different unit
group").

## Tests

- `backend/test/unit/shoppingListService.aggregate.test.ts` — 8 new/changed cases:
  count-vs-mass never merges (AC2, replacing the old "combines by name only" case this
  ticket supersedes), unrecognized/empty unit never throws (AC2), g+kg merge below the
  kg threshold (AC1), g+g crossing the threshold displays in kg (AC1), ml+l merges on
  the volume side (AC1), a repeating-decimal conversion rounds correctly (AC5),
  case-insensitive unit matching, identical non-metric units still merge (regression
  guard), and a single metric contributor still normalizes to the larger unit.
- `backend/test/unit/shoppingListService.merge.test.ts` — 2 new cases: a name match in
  an incompatible unit is not a match (fresh insert + old line dropped), and the AC4
  scenario above (fresh insert + old hand-edited line kept untouched).
- `backend/test/integration/shoppingListApi.integration.test.ts` — 2 new cases under
  "TEST-246: unit conversion at generation": a full `POST /generate` merging `g` and
  `kg` across two recipes into one line (AC1), and a count-vs-mass pair staying as two
  lines end-to-end (AC2).
- Every existing TEST-76 and TEST-154 regeneration test (rules 1–5, unit and
  integration layers) still passes unweakened — all default their fixtures to a shared
  unit (`whole`), so the key change doesn't affect them.
- `backend/test/contract/shoppingListSchemas.contract.test.ts` — unchanged; no schema
  changed (unit stays free-text).

## Deferred: Playwright E2E → TEST-232

TEST-246's own Definition of Done permits this explicitly: "End-to-end coverage written
against the TEST-232 harness, or deferred to it by name if it has not landed." Verified
directly — no Playwright dependency, config, or spec exists anywhere in this repo
(checked `package.json` in every workspace, and `git log --all --grep="TEST-232"` /
`git grep "TEST-232"`, which only turns up citations in other tickets' feature docs).
**Deferred to [TEST-232](https://beacon.chro.media/browse/TEST-232)** ("Land the
Playwright end-to-end test harness"), which carries the debt list this ticket is now
added to. This is also a backend-only change (no frontend code touched), so the E2E
surface it would cover is the same generation flow TEST-76/TEST-153's own deferrals
already point at TEST-232 for.

## docs updated in this branch

- `docs/api.md` — `/api/shopping-list` section: the conversion table, the grouping
  rule, and the rounding rule, replacing the outdated "raw sum across whatever units"
  statement.
- `docs/features/TEST-76-shopping-list-generation.md` — "The matching rule" section
  marked superseded, pointing here for the detail.
