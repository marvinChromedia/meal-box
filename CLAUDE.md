# Recipe Box + Shopping List — Project Constitution

Personal project for Beacon ticket [`TEST-71`](https://beacon.chro.media/browse/TEST-71) "Marvin Punongbayan - MealBox". Save recipes, generate a de-duplicated shopping list from selected recipes, manage that list. Feature breakdown lives in `TEST-71`'s own Notes & Assumptions section (sub-task list keeps growing — that's the source of truth, not a hardcoded range here).

This file is the standing set of conventions for anyone (or any agent) writing code in this repo. Follow it unless a specific instruction says otherwise.

## Tech stack

- **Frontend**: React 18 + Vite + TypeScript (`strict: true`), Tailwind CSS. Mobile-responsive by default.
- **Backend**: Node.js + Express + TypeScript.
- **Database**: PostgreSQL, accessed through a typed query layer — `pg` with Zod-validated rows, migrations via `node-pg-migrate`. Decided, not optional: hand-written SQL keeps the repository layer explicit and the parameterized-SQL rule meaningful. Don't introduce an ORM.
- **Fallback for zero-backend / offline-only builds**: swap Postgres+Express for `IndexedDB`/`localStorage` directly from the frontend. Not in play for this project — it drops cross-device sync (`TEST-78`). Don't reach for it to work around a database setup problem; fix the setup.

## Repo structure

Monorepo, two independently-runnable packages:

```
frontend/   Vite + React app
backend/    Express API
shared/     Types shared between frontend and backend (recipe, ingredient, shopping-list-item shapes)
docs/       Written reference docs (e.g. the design system)
```

Each of `frontend/` and `backend/` has its own `package.json`, `tsconfig.json`, lint config extending a shared root config.

## Frontend conventions

- Function components + hooks only. No class components.
- Feature-folder layout: colocate a component, its styles (Tailwind, so usually no separate CSS file), and its test in the same folder (`src/features/recipes/RecipeCard.tsx`, `RecipeCard.test.tsx`).
- Naming: `PascalCase` for components, `camelCase` for functions/variables/hooks (`useShoppingList`), `SCREAMING_SNAKE_CASE` only for true constants.
- No `any`. Prefer the shared types from `shared/` over redefining shapes locally.
- State: local component state (`useState`/`useReducer`) by default. Server state (recipes, shopping list) through React Query — don't reach for Redux/Zustand unless cross-cutting client state actually shows up.
- Styling is mobile-first: write the unprefixed Tailwind classes for the smallest viewport, add `sm:`/`md:`/`lg:` for larger. Check every screen at a 375px-wide viewport before calling it done.
- Accessibility: semantic HTML elements over generic `div`s, every form input has a `<label>`, interactive elements are keyboard-reachable with visible focus states.

## Design System

- Reusable UI components live in `frontend/src/components/ui/` (`Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Badge`, `Card`, `Alert`, `Modal`).
- Live, visual gallery of every component and variant: run the app and visit `/design`. Written reference with props and usage snippets: [`docs/design-system.md`](./docs/design-system.md).
- New UI work reuses these components instead of duplicating Tailwind classes ad hoc. If a screen genuinely needs a new component or variant, add it in all three places together: `components/ui/`, the `/design` page, and `docs/design-system.md`.

## Backend conventions

- REST resources: `/api/recipes`, `/api/recipes/:id`, `/api/shopping-list`.
- Layering: route → controller → service → repository. Controllers stay thin (parse/validate request, call service, shape response) — no business logic or SQL in a controller.
- Validate every request body/params at the boundary with Zod; reject invalid input with a `400` before it reaches a service.
- Consistent error shape across all endpoints: `{ error: { message: string, code: string } }`.
- Config via `.env`, with a checked-in `.env.example` listing every required variable and no real values. Never commit a populated `.env`.

## Database conventions

- Schema changes go through `node-pg-migrate` migrations only — never hand-edit the schema in a running database.
- One migration per logical change; migrations are forward-only and named descriptively (`20260908_create_recipes_table`).
- `snake_case` table and column names. Foreign keys for `recipe_ingredients.recipe_id → recipes.id` and `shopping_list_items` referencing the recipe(s) it was generated from.

## Testing

**Frontend**

- Unit/component: Vitest + React Testing Library, one test file per component/hook, colocated.
- End-to-end: Playwright is mandatory for every user-facing flow, not just a final QA pass — run against the real frontend + backend + Postgres stack, covering the full recipe → shopping-list journey.
- The Playwright harness (dependency, config, npm script) is landed **once** by the coordinating session, not scaffolded per branch — five sessions each standing up a runner produces five conflicting configs. Write specs against the existing harness; if it isn't there yet, ask for it.

**Backend** — three required layers, kept distinct rather than blended into one suite:

- _Unit_: pure functions/services (e.g. ingredient aggregation/de-dup logic) tested in isolation with the DB mocked.
- _Integration_: Supertest hitting real Express routes against a real test Postgres database — proves route → service → repository → DB wiring actually works.
- _API/contract_: validates request/response shapes against the Zod boundary schemas, independent of business logic — catches breaking changes to the API surface.

Integration tests run against a **separate test database**, never the development one — they truncate and reseed, so pointing them at `DATABASE_URL` destroys local data. The variable belongs in `.env.example` alongside the others.

A feature isn't done until it has tests at every applicable layer above, not just a manual check.

## Per-ticket documentation

- Every ticket that changes behavior gets a short feature doc at `docs/features/<TICKET-KEY>-<slug>.md`: what was built, why, and how it works — same pattern as `docs/design-system.md`.
- Written when the ticket's work is verified, at the same time as the ticket comment below — not deferred.

## Working in parallel sessions

Several sessions may work this repo at once. Any session can be handed any ticket — there are no fixed specialisms, and a session's scope is whatever ticket it was given.

- One session coordinates (titled "Project Manager"). It owns `shared/`, sequences merges, verifies tickets against the definition of done and closes them.
- Each session works in its own git worktree on its own branch off `main`. Never two sessions in one checkout.
- `shared/src/types.ts` is the contract seam between frontend and backend. Import from `@recipe-box/shared`; never redefine those shapes locally. Contract changes go through the coordinating session so two branches don't diverge.
- Before starting work that overlaps another live branch — the same feature folder, the router, a migration — check with the coordinating session.
- **A ticket is not startable until it has a description with acceptance criteria.** Handed a title-only ticket, ask the coordinating session to spec it rather than inventing the scope — two sessions guessing produce work that has to be redone.
- Branch names are `feat/<TICKET-KEY>-<slug>` (`feat/TEST-78-data-persistence`), one branch per ticket, created off `main` in the session's own worktree.
- A finished branch goes back to the coordinating session, which sequences the merges. Don't merge into `main` yourself — five branches landing in an arbitrary order is how the router and shared folders break.

## Implementation order

Tickets land in dependency order, not in whatever order sessions are free. Each sub-ticket's Identity table names what it depends on and what it blocks — that table is the schedule.

- **Don't start a ticket whose dependencies haven't merged.** The coordinating session hands out tickets one at a time and says what gates each one; a session that runs ahead builds against a contract that hasn't settled.
- **Storage before API before screens.** The schema is the first implementable ticket on a story, the endpoints come next, the screens last. The frontend data layer is the exception — it depends on the shape of the contract, not on a running endpoint, so it can be built in parallel with the schema.
- **Blocked on an upstream endpoint? Stub at the `shared/` boundary and keep moving.** A typed mock against the frozen contract is fine and the swap costs nothing later. Redefining the types locally is not fine — that's the one thing that makes the parallel model fail.
- **One feature folder has one owner at a time.** Two sessions in `src/features/recipes/` will conflict no matter how careful they are, so consecutive tickets over the same folder go to the same session in sequence rather than to two sessions at once.
- **Merge order follows dependency order.** A branch built on a stubbed contract merges after the branch that made it real, so the stub is gone before the code lands.
- **One ticket at a time per session.** Finish it — tests, feature doc, ticket comment — and hand the branch back before picking up the next.

## Ticket comments and status

Every ticket carries its own audit trail in Beacon, so anyone can reconstruct what happened without reading a chat log. Two comments per ticket, no more:

**1. A start comment**, posted at the same moment the ticket moves to `IN_PROGRESS`. Three lines is plenty — who is working it (which session), the branch name, and what it was gated on. This is what makes an abandoned or duplicated ticket obvious.

**2. A completion comment**, posted when the work is verified, alongside the feature doc:

- A short **plain-language summary first** — what changed, written for a non-engineer reader. A PM or stakeholder should understand it without asking a developer.
- Then the technical detail below it: what changed, how it was verified (name the test layers that ran), which acceptance criteria are covered, and any decision or assumption a later ticket needs to know about.
- Once the branch is merged, the merge commit SHA goes on that same comment rather than in a third one.

Applies to every ticket worked on — Stories and sub-tasks alike. Don't post progress commentary between the two; the branch is the progress record.

**Status discipline.** Beacon's `TEST` project has only TODO / IN_PROGRESS / DONE / CLOSED — no QA-handoff status, and don't invent one.

- `TODO` → `IN_PROGRESS` when work actually starts, with the start comment.
- Stays `IN_PROGRESS` through review and merge.
- Only the coordinating session moves a ticket to `DONE`, after verifying it against its own acceptance criteria and definition of done — never the session that wrote the code.

## Merging a finished branch

A branch is finished when **all** of these are true, not when the code works:

- Tests pass at every layer that applies to it (frontend unit/component and Playwright; backend unit, integration and API/contract).
- The feature doc exists at `docs/features/<TICKET-KEY>-<slug>.md`.
- The completion comment is on the Beacon ticket.
- Every ticket it depends on is already merged into `main`.

Then the session that wrote it merges it, in this order:

1. `git fetch origin && git rebase origin/main` — rebase, don't merge `main` into the branch.
2. Re-run the full test suite after the rebase. A green run before the rebase proves nothing about the merged result.
3. Squash to a single commit (see Git / commits).
4. Tell the coordinating session the branch is ready and hand it the ticket key. Wait for the go-ahead — the coordinating session verifies against the acceptance criteria and knows what else is in flight.
5. On the go-ahead: `git checkout main && git merge --ff-only <branch> && git push origin main`. If the fast-forward is refused, `main` moved — go back to step 1 rather than forcing anything.
6. Add the merge commit SHA to the ticket's completion comment, remove your worktree, and report back. The coordinating session closes the ticket.

Never merge a branch whose dependency hasn't landed, and never force-push `main`.

## Tooling

- ESLint + Prettier, one shared config at the repo root, extended by both `frontend/` and `backend/`.
- TypeScript `strict: true` in both packages — no loosening this to unblock a build.
- Optional: `lint-staged` + a pre-commit hook to run lint/format on staged files only.

## Git / commits

- Conventional Commits for the subject line (`feat:`, `fix:`, `chore:`, `test:`, ...), kept under ~72 characters.
- Reference the Beacon ticket key in the subject when the change implements one, e.g. `feat(recipes): add recipe CRUD API (TEST-72)`.
- **One commit per branch.** However many steps the work took, squash before the branch is handed off or merged — a branch arrives as a single commit.
- **Write the body as a short bullet list a non-engineer can read.** Say what the change does for the user; leave out file paths, function names and library choices. Same audience as the plain-language half of a ticket comment — a PM should be able to follow the log without asking.
- **No `Co-Authored-By` trailers**, no tool attribution, no "generated with" footers.
- Squash before a branch is shared, never after — rewriting history another session or worktree has already branched from strands that work.

## Security basics

- No secrets, API keys, or credentials committed to the repo — `.env` is gitignored.
- All SQL is parameterized; never build a query with string interpolation of user input.
- CORS on the Express app is locked to the known frontend origin(s), not `*`.
- Every mutating endpoint (`POST`/`PUT`/`PATCH`/`DELETE`) validates its input before touching the database.
