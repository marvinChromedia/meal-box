# Backend conventions

Node + Express + TypeScript (`strict: true`), PostgreSQL through `pg`. No ORM.

## Layering

```text
route → controller → service → repository
```

Controllers stay thin: parse the request, validate it, call a service, shape the response. **No business logic and no SQL in a controller.** Services hold the logic and are testable without HTTP. Repositories are the only code that issues SQL.

## Validation and errors

Validate every request body and parameter at the boundary with Zod, and reject invalid input with a `400` before it reaches a service.

Every endpoint uses the same error shape:

```json
{ "error": { "message": "...", "code": "..." } }
```

An unknown id returns `404`, a malformed one `400`. Never a `500` and never a stack trace.

## Data access

- All SQL is parameterized — `$1`, `$2`. Never interpolate user input into a query string. Interpolating a static SQL fragment constant is fine; interpolating a value is not.
- Every row read from PostgreSQL is parsed through a Zod schema before becoming a domain type, so schema drift or an unexpected null fails loudly at the boundary instead of flowing into the app.
- Multi-row writes use `backend/src/db/withTransaction.ts`. Creating a recipe with its ingredients, or replacing an ingredient set, is one transaction.
- `backend/src/db/queryable.ts` is the abstraction repositories take, which is what lets unit tests mock the database.

## Configuration

Config comes from `.env`, with every required variable listed in `backend/.env.example` and **no real values**. Currently: `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `TEST_DATABASE_URL`.

CORS is locked to the known frontend origin, never `*`.

## Migrations

Schema changes go through `node-pg-migrate` only — never hand-edit a running database.

```bash
npm run migrate:up -w backend
npm run migrate:down -w backend
```

- One migration per logical change, forward-only.
- `snake_case` table and column names.
- **Name migrations with a full timestamp**, not just a date: `20260908143000_create_recipes_table`. A date alone is not parseable as a timestamp — `node-pg-migrate` warns (`Can't determine timestamp for 20260908`) and falls back to sorting by filename, which silently breaks ordering as soon as two migrations share a date.
- The two migrations already applied use the date-only form. **Do not rename them** — they are applied. Use the full-timestamp form from the next one onward, and check that a new migration sorts after them.

### Never run `migrate:up` against the dev database from an unmerged branch

Every worktree on a machine shares one local PostgreSQL. Running `npm run migrate:up -w backend` from a feature branch writes that branch's unmerged schema change into `recipe_box_dev`, where it is invisible to every other session — and `node-pg-migrate` then fails its order check for anyone else, because the database holds a migration that does not exist in `main`'s migrations directory. That has already happened once and cost another session time.

For manual checks, point at the test database instead — `globalSetup` rebuilds it from scratch on every run — or create a separate database for your branch:

```bash
TEST_DATABASE_URL="postgres://localhost:5432/recipe_box_test" npm run test:integration -w backend
```

Do not fix someone else's contamination with `migrate:down` on shared state while they are still working. Tell the coordinating session.

## Current schema

- `recipes` — id, title, steps `text[]`, tags `text[]`, is_favorite, timestamps
- `recipe_ingredients` — recipe_id → `recipes.id` `ON DELETE CASCADE`, name, quantity, unit, position
- `shopping_lists` — id, timestamps
- `shopping_list_items` — shopping_list_id → `shopping_lists.id` `ON DELETE CASCADE`, name, quantity, unit, checked, position, `quantity_edited` (added by TEST-76, additive migration)
- `shopping_list_item_sources` — shopping_list_item_id → `shopping_list_items.id` `ON DELETE CASCADE`, recipe_id

`position` columns carry ordering; anything that must round-trip in saved order depends on them.

**`shopping_list_item_sources.recipe_id` has no foreign key to `recipes`, deliberately.** A line item must keep its record of which recipe it came from even after that recipe is deleted: a cascading key would erase the history, a blocking one would make recipes undeletable. The trade is durable provenance in exchange for possible orphaned ids — so **any code reading that column must tolerate a recipe that no longer exists**, and treat that as a normal case rather than an edge case.

Neither `recipes` nor `shopping_list_items` has a `user_id` column yet. Adding one is an additive migration, not a rewrite.

**`shopping_list_items.quantity_edited` is backend bookkeeping, deliberately not part of the shared `ShoppingListItem` contract.** It records whether a quantity was hand-edited, and can't be inferred by comparing the stored value against a recalculation — editing 2 to 2 still counts as edited. TEST-76's regeneration merge reads it; TEST-154's quantity-edit endpoint is what sets it.

## Tests

Three distinct layers, kept separate. See [`testing.md`](./testing.md).
