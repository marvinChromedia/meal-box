# API

REST over Express. Recipes are implemented; the shopping list is not. The conventions below apply to anything new.

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

## Specified but not yet built

`/api/shopping-list` is specified in Beacon ticket TEST-76 and does not exist yet. Do not write client code against it as though it were live — see [`architecture.md`](./architecture.md) for the contract to build against, and use a typed mock at the `shared/` boundary until it lands.

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
