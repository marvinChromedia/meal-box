# TEST-159 — User authentication: login & registration

## What this is

People can now create an account, sign in, and sign out. Every recipe and shopping-list
API route (once TEST-72 and TEST-76 add them) requires a signed-in session, and a
signed-in account can only ever see its own records — someone else's recipe id comes
back as a plain 404, not a 403, so its existence isn't even revealed.

## Session transport: httpOnly cookie

The frontend and backend exchange an opaque, random session token through an `httpOnly`,
`Secure` (in production), `SameSite=Lax` cookie — not a bearer token in a response body.

Reasoning:

- CORS is already locked to a single known frontend origin (see `backend/src/app.ts`),
  so `credentials: include` on the frontend and `credentials: true` on `cors()` is a
  clean fit — no per-request `Authorization` header to wire up.
- The token never touches JS-reachable storage (`localStorage`, memory), which narrows
  the blast radius of an XSS bug on the frontend — this is the most security-sensitive
  ticket on the story, so that trade-off was made deliberately in the cookie's favor.
- It gives the frontend API client (`frontend/src/features/auth/authApi.ts`) exactly one
  seam: `credentials: 'include'` on every `fetch` call. TEST-155's client only needs to
  do the same.
- CSRF: `SameSite=Lax` plus the locked CORS origin was judged sufficient for this
  project's scope (no cross-site authenticated requests are needed anywhere in TEST-71).
  A dedicated CSRF token was considered and deliberately left out — revisit this if the
  app ever needs to accept a authenticated request that isn't same-site.

The token itself is never stored in the database — only its SHA-256 hash is
(`sessions.token_hash`), so a leaked `sessions` table row can't be replayed as a cookie.
Signing out deletes the row outright, so a session is genuinely invalidated (not merely
expired) the moment someone signs out.

## Schema

One additive migration, `backend/migrations/20260908150000_create_users_and_sessions_tables.ts`,
building on TEST-78's schema:

- `users` — `id`, unique `email`, `password_hash` (bcrypt, 12 rounds), `created_at`.
- `sessions` — `id`, `user_id` FK (`ON DELETE CASCADE`), unique `token_hash`,
  `expires_at` (30-day TTL), `created_at`.
- `recipes.user_id` and `shopping_lists.user_id` — both nullable `uuid`, both a real FK
  to `users` with `ON DELETE CASCADE`. Nullable because they're added onto tables that
  already exist; `CASCADE` (not left orphaned) because there's no account-deletion
  feature in this story that would need the recipes kept around once the owner is gone.

**Migration filename, deliberately:** `20260908150000_...`. `node-pg-migrate` only
timestamp-parses a 13-digit (Unix ms) or 17-digit (`YYYYMMDDHHMMSSmmm`) prefix; a 14-digit
`YYYYMMDDHHMMSS` prefix — this one included — falls back to `Number(prefix)`, which still
sorts correctly (and after DEV-1's 8-digit-prefix migrations) but logs a
"Can't determine timestamp" warning on every migration run. That warning is expected;
it's not a symptom of a real ordering problem, and running `migrations.integration.test.ts`
after this ticket still proves the ordering is what it should be.

## The typed query/service layers

- `backend/src/repositories/usersRepository.ts`, `sessionsRepository.ts` — the only code
  that talks SQL for these two tables, same shape as TEST-78's repositories: plain async
  functions taking a `pg` `Pool`/`PoolClient`, rows parsed through Zod before becoming a
  domain shape. `findUserByEmail` returns the password hash alongside the shared `User`
  shape (a `UserWithPasswordHash`, not exported outside `auth`) so the login path doesn't
  need a second query — that combined shape is intentionally not the shared `User` type.
- `backend/src/auth/passwordHash.ts` — bcrypt (via `bcryptjs`, pure JS, no native build
  step) at 12 salt rounds.
- `backend/src/auth/sessionToken.ts` — a 256-bit random token (`node:crypto.randomBytes`)
  and its SHA-256 hash.
- `backend/src/services/authService.ts` — `register`, `login`, `logout`,
  `getUserForToken`. `login` runs `verifyPassword` against a real bcrypt hash even when
  the email doesn't exist (comparing against a fixed dummy hash) so an unknown-email
  response doesn't come back measurably faster than a wrong-password one — the timing
  side-channel version of AC4.

## HTTP surface

`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`,
`GET /api/auth/me` (`backend/src/routes/authRoutes.ts`,
`backend/src/controllers/authController.ts`). Request bodies and response shapes are
validated against `backend/src/schemas/authSchemas.ts` — `.strict()` Zod schemas, so an
accidental extra field on a response (a password hash, say) fails validation rather than
silently shipping.

**Register does not sign the person in.** It creates the account and returns `{ user }`;
sign-in is a separate, explicit step (`POST /api/auth/login`). This matches the ticket's
own Playwright flow (`register → sign in → …`) rather than auto-establishing a session on
registration.

**"The stated rules" (AC1):** the only rule enforced is a minimum password length of 8
characters (`credentialsRequestSchema` in `authSchemas.ts`) and a valid email shape. Full
password-strength scoring wasn't specified anywhere and is out of this ticket's scope.

## Protecting recipe and shopping-list routes (AC5, AC6)

This ticket ships two reusable pieces, both mounted/available now:

- `backend/src/middleware/requireAuth.ts` — reads the session cookie, 401s immediately
  (no database query) if it's absent, looks up the session if it's present, 401s and
  clears the cookie if the session is missing or expired, otherwise attaches `req.user`
  and calls `next()`. Mounted in `app.ts` on the `/api/recipes` and `/api/shopping-list`
  prefixes, so every route under either — including all of TEST-72's, TEST-76's, TEST-77's
  and TEST-234's, which all landed while this ticket was in flight — is already protected.
  This is AC5, real and verified against the live routes (not a stand-in), including a
  test proving a 401 is returned without any database query running.
- `backend/src/middleware/requireOwner.ts` — a factory. Give it a function that resolves
  a record's `user_id` (or `null` if the record doesn't exist at all); it 404s — never
  403s — whenever that doesn't match `req.user.id`.

**Scope decision, confirmed with the coordinating session and Marvin:** `requireOwner` is
not wired into `recipes`' or `shopping-list`'s existing controllers/services/repositories
by this ticket. Those landed before the `user_id` column existed and have no ownership
awareness anywhere in them; retrofitting that is real, non-mechanical work against two
already-merged feature folders that other tickets (TEST-123, TEST-154) are actively
extending right now. Doing it here risked exactly the collision the project's parallel-work
rules exist to avoid. Instead:

- **The rule for any new endpoint, going forward:** everything under `/api/recipes` and
  `/api/shopping-list` already requires sign-in — nothing to add for that. A route that
  reads or writes **one specific record by id** must additionally add
  `requireOwner(getOwnerId)` as route middleware, where `getOwnerId` looks up that
  record's `user_id` column (returning `null` if the record doesn't exist). This is the
  one thing a new endpoint must do to be protected.
- Proven end-to-end in `backend/test/integration/auth.integration.test.ts` against a
  representative `GET /api/recipes/:id` route defined in that test file, reading
  `recipes.user_id` directly, inserted by raw SQL since `recipesRepository` itself has no
  `user_id` parameter yet.
- **This is a real, open gap**, not a false negative: today, a signed-in account can read
  or write another account's recipes and shopping-list items by id — `requireAuth` stops
  an anonymous request, but nothing yet stops one signed-in account from reaching another
  account's records. Whichever ticket next touches a given by-id route (`recipes`:
  currently TEST-123; `shopping-list`: currently TEST-154, plus TEST-234's per-item routes)
  is where `requireOwner` actually gets applied to it.

## The pattern for a new integration test to sign in

Three existing suites (`recipesApi`, `shoppingListApi`, `shoppingListItemsApi`) needed this
retrofitted onto them once `requireAuth` landed — all mechanical, no business-logic changes:

```ts
let agent: ReturnType<typeof request.agent>;

beforeEach(async () => {
  await truncateAll(pool);
  agent = request.agent(app); // persists the session cookie across requests
  await agent.post('/api/auth/register').send({ email: '...@example.com', password: 'password123' });
  await agent.post('/api/auth/login').send({ email: '...@example.com', password: 'password123' });
});
```

Then call routes through `agent` (`agent.get(...)`, `agent.post(...)`, ...) instead of
`request(app)` directly. One throwaway account per suite is enough; nothing about this
depends on which account it is, since ownership scoping isn't wired into these routes yet
(above).

## Security review (§10)

Explicitly checked, since this ticket is the security-sensitive one:

- **Password storage**: bcrypt (`bcryptjs`, pure JS — no native build step), 12 salt
  rounds. Never logged; never present in any API response (`.strict()` Zod schemas on the
  response shape mean a leaked hash would fail contract validation, not just go unasserted).
- **Session token generation and expiry**: `node:crypto.randomBytes(32)` (256 bits), so
  practically unguessable. Only its SHA-256 hash is stored (`sessions.token_hash`) — a
  leaked `sessions` table row is not a replayable cookie. 30-day expiry, checked on every
  lookup (`findActiveSessionByTokenHash`).
- **Cookie flags**: `httpOnly` (unreadable by JS — the main XSS mitigation for this
  design), `Secure` in production, `SameSite=Lax`. CSRF beyond that is judged covered by
  `SameSite=Lax` + the already-locked CORS origin for this project's scope; revisit if the
  app ever needs to accept a genuinely cross-site authenticated request.
- **Login timing/enumeration**: unknown email and wrong password return the identical
  message, and `verifyPassword` runs against a fixed dummy hash when the email isn't
  found, so the response doesn't complete measurably faster for an unknown email.
- **What `requireOwner` actually checks**: the resolved owner id against `req.user.id`
  (populated only by `requireAuth`, itself only ever set from a verified session) —
  returns 404 on `null` (record doesn't exist) or mismatch, alike, so a wrong id never
  discloses whether the record exists.
- **What's left unprotected, named explicitly**: per-record ownership on the existing
  `recipes` and `shopping-list` by-id routes — see the scope decision above. Nothing is
  unprotected at the authentication layer; every route requires sign-in.
- All SQL parameterized (`usersRepository`, `sessionsRepository`); every mutating auth
  endpoint validates input via `credentialsRequestSchema` before touching the database;
  CORS stays locked to the configured origin with `credentials: true`, not `*`.

## Frontend

- `frontend/src/features/auth/` — `authApi.ts` (fetch wrapper, `credentials: 'include'`
  on every call), `useAuth.ts` (React Query: `useCurrentUser`, `useRegister`,
  `useSignIn`, `useSignOut` — this is the first ticket to add `@tanstack/react-query` to
  the frontend, per CLAUDE.md's "server state through React Query" convention),
  `RegisterForm`/`LoginForm` (colocated with their tests), `RegisterPage`/`LoginPage`,
  `AccountPage`, and `RequireAuth` — a route guard that redirects to `/login` while
  signed out, the frontend counterpart to the backend's `requireAuth`.
- New routes: `/register`, `/login`, `/account` (protected). `/account` is a minimal
  "signed in as `{email}`, sign out" screen — TEST-73's recipe box list will likely
  become the real signed-in landing screen later; this ticket doesn't have one to land
  on yet, so `/account` stands in.
- Home (`/`) is now auth-aware: signed out, it shows Sign in / Register links; signed in,
  it links to `/account`.
- All three screens reuse `components/ui/` (`Input`, `Button`, `Card`, `Alert`); every
  field has a `<label>`; verified at a 375px viewport.

## Tests

- **Unit** (`backend/test/unit/`): password hashing (`passwordHash.test.ts`), session
  token generation/hashing (`sessionToken.test.ts`), `authService` with the database
  mocked — duplicate email, wrong password, unknown email, session creation
  (`authService.test.ts`) — and both middleware in isolation with mocked
  req/res/next (`requireAuth.test.ts`, `requireOwner.test.ts`).
- **Integration** (`backend/test/integration/auth.integration.test.ts`): Supertest
  against real routes and a real test Postgres database — register, duplicate email
  (AC2), sign in/out (AC3), wrong password and unknown email both giving the identical
  message (AC4), 401 on a protected route with no database query made (AC5), and the
  cross-account 404-not-403 isolation (AC6), reload persistence (AC7).
- **API/contract** (`backend/test/contract/auth.contract.test.ts`): this is the first
  ticket to add an HTTP surface since TEST-78 (which had none), so it's also the first to
  need this layer — added `vitest.contract.config.ts` and `test:contract` alongside the
  existing `test:unit`/`test:integration` scripts. Asserts every response against
  `.strict()` Zod schemas in `authSchemas.ts`, which is what actually proves "no password
  field of any kind" rather than merely eyeballing it.
- **Frontend** (`frontend/src/features/auth/*.test.tsx`): `RegisterForm` and `LoginForm`
  component tests — labeled fields, successful submission and navigation, and the error
  states (AC2, AC4).
- **Playwright**: register → sign in → signed-in state → reload → sign out, per the
  ticket's own Definition of Done.

## Running it locally

```bash
npm run migrate:up    # inside backend/ — needs DATABASE_URL and now also creates users/sessions
```

`backend/.env.example` needed no new variables — nothing here is configurable that
wasn't already covered by `DATABASE_URL`/`TEST_DATABASE_URL`/`CORS_ORIGIN`.
`frontend/.env.example` adds `VITE_API_BASE_URL` (defaults to `http://localhost:4000`),
since this is the first ticket where the frontend calls the backend directly.

## A pre-existing issue noticed, not fixed here

`npm run build` (`tsc -b`) in `frontend/` fails — `tsconfig.node.json` is missing
`composite: true` (needed alongside its `noEmit: true`) and `vite.config.ts`'s `test`
block isn't recognized because it's typed via `defineConfig` from `vite` rather than
`vitest/config`. This predates this ticket (present since the initial scaffold commit,
`7be606c`) and isn't something TEST-159 touches — `npm test` (Vitest) is unaffected and
passes. Worth a quick follow-up ticket.
