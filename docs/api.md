# API

REST over Express. Recipes and shopping-list generation are implemented. The conventions below apply to anything new.

## Implemented

### `GET /health`

Reports process and database connectivity. Used by the integration setup and for checking a local stack is actually up. It queries the database rather than returning a hardcoded value, so a failure here means PostgreSQL is unreachable.

### `/api/recipes`

Full CRUD, mounted in `backend/src/app.ts` and routed in `backend/src/routes/recipesRoutes.ts`:

| Method   | Path               | Notes                                                                                   |
| -------- | ------------------ | --------------------------------------------------------------------------------------- |
| `POST`   | `/api/recipes`     | Body validated against `RecipeInput`; recipe and ingredients created in one transaction |
| `GET`    | `/api/recipes`     | Lists recipes                                                                           |
| `GET`    | `/api/recipes/:id` | `404` when absent, `400` when the id is malformed                                       |
| `PUT`    | `/api/recipes/:id` | Replaces the ingredient set rather than patching rows — the frontend form matches this  |
| `DELETE` | `/api/recipes/:id` | Reports whether a row existed; ingredient rows cascade                                  |

Bodies go through `validateBody`, params through `validateParams`, and the boundary schemas are tied to `@recipe-box/shared`'s `RecipeInput` with `satisfies` so they cannot drift from the contract.

Validation requires a non-empty title, at least one step and at least one ingredient. Tags may be empty, and unit may be empty because units are free text — a countable "2 onions" has no unit. The frontend form applies the same rules.

**There is no search query parameter, deliberately** — recipe search filters client-side over the already-fetched list.

### `/api/auth`

Mounted in `backend/src/app.ts`, routed in `backend/src/routes/authRoutes.ts`:

| Method | Path                | Notes                                                                          |
| ------ | ------------------- | ------------------------------------------------------------------------------ |
| `POST` | `/api/auth/register` | Body validated against `AuthCredentials`; `409` on a taken email               |
| `POST` | `/api/auth/login`    | Sets the session cookie; `401` with an identical message for unknown email or wrong password — never reveals which |
| `POST` | `/api/auth/logout`   | Deletes the server-side session and clears the cookie; safe to call while already signed out |
| `GET`  | `/api/auth/me`       | Behind `requireAuth`; returns the signed-in `User`                             |

Session is an `httpOnly`, `Secure` (in production), `SameSite=Lax` cookie — not a bearer
token. Every `/api/recipes` and `/api/shopping-list` route requires this session
(`requireAuth`, mounted once per prefix in `app.ts`); a route addressed by a specific
record id additionally needs `requireOwner` applied to it (see Ownership below and
[`TEST-159-authentication.md`](./features/TEST-159-authentication.md)). **Done for
`/api/recipes`** (TEST-253: `GET`/`PUT`/`DELETE /api/recipes/:id` all apply
`requireOwner`; `POST`/`GET /api/recipes` scope by `user_id` directly) — **still an
open gap for `/api/shopping-list`**, not yet done, still a named gap rather than an
oversight.

### `/api/shopping-list`

Mounted in `backend/src/app.ts`, routed in `backend/src/routes/shoppingListRoutes.ts`:

| Method   | Path                           | Notes                                                                                 |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| `POST`   | `/api/shopping-list/generate`  | Body validated against `GenerateShoppingListInput`; generates or regenerates the list |
| `GET`    | `/api/shopping-list`           | Reads the current list; `404` if none has ever been generated                         |
| `POST`   | `/api/shopping-list/items`     | Adds a hand-added item; body validated against `ShoppingListItemInput`                |
| `PATCH`  | `/api/shopping-list/items/:id` | Partial update — any of `checked`, `quantity`, `unit`; at least one required          |
| `DELETE` | `/api/shopping-list/items/:id` | Removes an item, generated or manual                                                  |

**Generation lives at `/generate`, not the bare resource path** — it's an action
(combine ingredients, merge into the existing list) rather than a plain resource
creation, and the frontend client and its feature doc were already written that way
(TEST-234; the path was briefly `POST /api/shopping-list` in TEST-76, which 404s
against the real client — caught before it shipped to a real screen).

There is exactly one shopping list — `POST /generate` doesn't create a new one each
time, and neither does `POST /items` (it creates the list on first use if none exists
yet, the same lazy-bootstrap). Every generation **merges** the fresh aggregation into
the existing list rather than replacing it, so hand-edited quantities, checked-off
state and manually added items survive a regeneration. See
[`docs/features/TEST-76-shopping-list-generation.md`](./features/TEST-76-shopping-list-generation.md)
for the full merge rules and
[`docs/features/TEST-234-shopping-list-item-endpoints.md`](./features/TEST-234-shopping-list-item-endpoints.md)
for the per-item endpoints.

`recipeIds` may be empty — that's a valid regeneration (it drops every non-edited
generated item), not an error. An id for a recipe that doesn't exist returns `404
RECIPE_NOT_FOUND` and never writes anything.

All four mutating endpoints return the full `ShoppingList`, not just the affected item
— the frontend reads the list as one object, so every mutation hands back its current
state rather than a fragment the caller would have to merge itself. A `quantity` in the
`PATCH` body must be a positive number; it also marks the item as hand-edited so a
later regeneration will not recalculate it, and bumps the list's own `updatedAt`. A
`checked`- or `unit`-only patch does neither.

## Conventions for any new endpoint

**Layering.** route → controller → service → repository. Controllers parse, validate and shape; they hold no business logic and no SQL. See [`backend.md`](./backend.md).

**Validation.** Every body and parameter is validated with Zod at the boundary. Invalid input is rejected with `400` before any service or database code runs. Request bodies use the input DTOs from `@recipe-box/shared` — `RecipeInput`, `GenerateShoppingListInput`, `ShoppingListItemInput` — which deliberately omit server-generated fields.

**Responses.** Return the shapes from `@recipe-box/shared`. Do not define a response type locally.

**Errors.** One shape everywhere:

```json
{ "error": { "message": "...", "code": "..." } }
```

`404` for an id that does not exist, `400` for one that is malformed, `401` for an unauthenticated request to a protected route. Never a `500` for a case you can anticipate, and never a stack trace in a response.

**Ownership.** Records are implicitly scoped to the signed-in account. When authentication exists, another account's record id returns `404` rather than `403` — existence itself is not disclosed.

**Before adding an endpoint**, check whether an existing one already provides what you need. Do not introduce a breaking change to an endpoint another session is already consuming; raise it with the PM session instead.

**Tests.** Integration tests through Supertest, and contract tests asserting request and response shapes against the Zod schemas. See [`testing.md`](./testing.md).
