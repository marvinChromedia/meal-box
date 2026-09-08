# TEST-78 — Data persistence layer

## What this is

Recipes and shopping lists now live in PostgreSQL instead of memory, so they survive a
server restart. This ticket only builds storage — saving and loading — not the REST API
that will sit on top of it (that's [TEST-72](https://beacon.chro.media/browse/TEST-72)
for recipes and [TEST-76](https://beacon.chro.media/browse/TEST-76) for the shopping
list).

## Schema

Five tables, created by two forward-only `node-pg-migrate` migrations in
`backend/migrations/`:

- `recipes` — id, title, `steps` and `tags` as native Postgres arrays, `is_favorite`,
  timestamps.
- `recipe_ingredients` — one row per ingredient, `recipe_id` foreign key with
  `ON DELETE CASCADE` so a recipe's ingredients disappear when the recipe does. A
  `position` column preserves the ingredient order from the shared `Recipe` type.
- `shopping_lists` — id, timestamps.
- `shopping_list_items` — one row per line item, `shopping_list_id` FK with
  `ON DELETE CASCADE`, `position` for display order.
- `shopping_list_item_sources` — a join table recording which recipe(s) a shopping
  list item was generated from. An item with no rows here is one the user added by
  hand, matching the "empty `sourceRecipeIds`" convention already decided in
  `shared/src/types.ts`.

**Deliberate design choice — a real trade-off, not a free lunch:**
`shopping_list_item_sources.recipe_id` has **no** foreign key back to `recipes`. AC2
requires that deleting a recipe still leaves a shopping list item's record of which
recipe it came from intact — a `CASCADE` would delete that history, and a blocking FK
would prevent the recipe from being deleted at all. So this is a soft reference: the id
is kept as plain data, not database-enforced.

The trade being made: **durable provenance in exchange for accepting possible orphan
uuids.** Once a source recipe is deleted, that `recipe_id` in
`shopping_list_item_sources` no longer points at a row that exists. Nothing in this
schema cleans it up, by design — that's what "still records the recipe(s) it was
generated from" means once the recipe is gone.

**This is load-bearing for two downstream tickets:**

- **TEST-76** (shopping-list generation) populates this table and needs to write to it
  without assuming every `recipe_id` it ever inserts will still resolve later.
- **TEST-77** (shopping-list screen) renders "which recipe(s) contributed this item"
  from `sourceRecipeIds` and **must tolerate a source id whose recipe no longer
  exists** — e.g. by looking up the recipe, finding nothing, and falling back to some
  "recipe no longer available" state rather than crashing or leaving a blank. This is
  not an edge case to catch later; it will happen the first time someone deletes a
  recipe that's already on a shopping list.

**For whoever picks up TEST-159 (authentication):** neither `recipes` nor
`shopping_list_items` has a `user_id` column yet, on purpose — it wasn't decided who
owns what before this ticket. Adding a nullable `user_id uuid` column to each via a new
migration is a small, additive change; nothing here needs a rewrite to support it.

## The typed query layer

`backend/src/repositories/recipesRepository.ts` and `shoppingListsRepository.ts` are
the only code that talks SQL. Each exposes plain async functions (`createRecipe`,
`getRecipeById`, `listRecipes`, `deleteRecipe`, `createShoppingList`,
`getShoppingListById`) that take a `pg` `Pool` (or, mid-transaction, a `PoolClient`) and
return the shapes from `shared/src/types.ts` — no locally redefined types.

Every row read from Postgres is parsed through a Zod schema before it's mapped into a
`Recipe` or `ShoppingList`. A schema mismatch (a null where one isn't expected, a
missing column) throws a `ZodError` immediately rather than handing a malformed object
further up the stack.

Writing a recipe or a shopping list happens inside a transaction
(`backend/src/db/withTransaction.ts`) so a recipe row is never left without its
ingredients (or a list without its items) if a later insert in the same write fails.

## Tests

- **Unit** (`backend/test/unit/`): row-mapping and Zod validation with the database
  mocked, including the malformed-row failure case (AC6).
- **Integration** (`backend/test/integration/`): Supertest-free, repository-level tests
  against a real Postgres database — round-trip write/read (AC3), the cascade delete
  and the "still records its source recipe" behavior (AC2), reading through a fresh
  connection to simulate a restart (AC4), and that migrations create the expected
  tables and are a no-op the second time they run (AC1, AC5).

Integration tests run against `TEST_DATABASE_URL`, a separate database from
`DATABASE_URL` — `backend/test/integration/globalSetup.ts` refuses to run if that
variable is missing or equal to `DATABASE_URL`, and drops/recreates the test database's
schema before every run so AC5 is actually exercised rather than assumed.

Run them with `npm run test:unit` / `npm run test:integration` inside `backend/` (or
`npm test`, which runs both in order).

**No API/contract-layer tests in this ticket, deliberately, not by omission.** That
layer validates request/response shapes against the Zod boundary schemas at the HTTP
edge — and this ticket has no HTTP surface (out of scope, delivered by TEST-72). There
is no boundary to contract-test yet. The equivalent guarantee at this layer is the
row-level Zod validation covered by AC6: every row coming out of Postgres is parsed
before it becomes a `Recipe` or `ShoppingList`, so drift between the schema and the
domain type fails loudly here rather than silently. TEST-72 is where an actual
API/contract test layer starts.

## Running migrations

```bash
npm run migrate:up    # inside backend/
npm run migrate:down
```

Requires `DATABASE_URL` (and, for tests, `TEST_DATABASE_URL`) in `backend/.env` — see
`backend/.env.example`.
