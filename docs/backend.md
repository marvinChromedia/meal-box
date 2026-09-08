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

## Authentication

Every API route is behind authentication as of TEST-159. Sessions are server-side, carried in an httpOnly cookie; `/api/auth` is the only unguarded mount. Full detail in [`features/TEST-159-authentication.md`](./features/TEST-159-authentication.md).

**A new route is protected by mounting it with `requireAuth`:**

```ts
app.use('/api/recipes', requireAuth(pool), createRecipesRouter(pool));
```

`requireAuth` establishes _who_ is calling. It does not check that a given row belongs to them — ownership is a separate concern each route applies with `requireOwner`. Adding an endpoint that reads or writes a user's data means both, and forgetting the second is the mistake that leaves one user able to fetch another's recipe by id.

**A new integration test signs in through the API**, using a supertest agent so the session cookie persists across requests:

```ts
let agent: ReturnType<typeof request.agent>;

beforeEach(async () => {
  await truncateAll(pool);
  agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ email: 'x-test@example.com', password: 'password123' });
  await agent
    .post('/api/auth/login')
    .send({ email: 'x-test@example.com', password: 'password123' });
});
```

Then call through `agent`, not `request(app)` — a bare `request(app)` is unauthenticated and gets a 401, which reads as a broken test rather than a missing session. Use an email unique to your test file; the suites share a database and truncate between tests.

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

### The test database is not a safe substitute either

This has now caught two sessions, so it is worth being explicit. `recipe_box_test` is shared by every worktree, and `globalSetup` **truncates and reseeds it at the start of every integration run**. Point a running backend at it and click through a screen by hand, and another session's test run will wipe the data underneath you mid-check.

It does not look like contention. It looks like a real bug: rows vanish, an id changes, an edit you just made reverts itself. One session lost time chasing exactly that.

So pick the database by what you are doing, not by which one is handy:

- **Running the integration suite** → `recipe_box_test`. That is what it is for, and the reseed is the feature.

```bash
TEST_DATABASE_URL="postgres://localhost:5432/recipe_box_test" npm run test:integration -w backend
```

- **Anything you interact with by hand** — a running server, checking a screen against the real API rather than against mocks → **a scratch database you create for that check and discard afterwards.** Not `recipe_box_dev`, not `recipe_box_test`.

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

**`shopping_list_items.quantity_edited` is backend bookkeeping, deliberately not part of the shared `ShoppingListItem` contract.** It records whether a quantity was hand-edited, and can't be inferred by comparing the stored value against a recalculation — editing 2 to 2 still counts as edited. TEST-76's regeneration merge reads it; `PATCH /api/shopping-list/items/:id` (TEST-234) is what sets it, whenever the patch includes a `quantity`.

## Tests

Three distinct layers, kept separate. See [`testing.md`](./testing.md).
