# API

REST over Express. **Only one endpoint is implemented today.** The rest of this document is the conventions a new endpoint must follow, not a description of endpoints that exist.

## Implemented

### `GET /health`

Reports process and database connectivity. Used by the integration setup and for checking a local stack is actually up. It queries the database rather than returning a hardcoded value, so a failure here means PostgreSQL is unreachable.

## Specified but not yet built

`/api/recipes`, `/api/recipes/:id` and `/api/shopping-list` are specified in Beacon tickets (TEST-72, TEST-76) and do not exist in the code yet. Do not write client code against them as though they were live — see [`architecture.md`](./architecture.md) for the contract to build against, and use a typed mock at the `shared/` boundary until the endpoints land.

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
