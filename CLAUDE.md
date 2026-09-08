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
- One migration per logical change; migrations are forward-only and named with a full timestamp plus a description (`20260908143000_create_recipes_table`). A date alone (`20260908_…`) is not parseable as a timestamp — `node-pg-migrate` warns and falls back to sorting by filename, which silently breaks ordering as soon as two migrations share a date. Never rename a migration that has already been applied.
- `snake_case` table and column names. Foreign keys for `recipe_ingredients.recipe_id → recipes.id` and `shopping_list_items` referencing the recipe(s) it was generated from.

## Testing

**Frontend**

- Unit/component: Vitest + React Testing Library, one test file per component/hook, colocated.
- End-to-end: Playwright is mandatory for every user-facing flow, not just a final QA pass — run against the real frontend + backend + Postgres stack, covering the full recipe → shopping-list journey.
- The Playwright harness (dependency, config, npm script) is landed **once** by the coordinating session, not scaffolded per branch — five sessions each standing up a runner produces five conflicting configs. Write specs against the existing harness; if it isn't there yet, ask for it.
- Because a Playwright E2E is part of the merge bar for anything user-facing, that harness is a prerequisite for those tickets, not a nicety. A screen ticket cannot merge without its E2E.

**Backend** — three required layers, kept distinct rather than blended into one suite:

- _Unit_: pure functions/services (e.g. ingredient aggregation/de-dup logic) tested in isolation with the DB mocked.
- _Integration_: Supertest hitting real Express routes against a real test Postgres database — proves route → service → repository → DB wiring actually works.
- _API/contract_: validates request/response shapes against the Zod boundary schemas, independent of business logic — catches breaking changes to the API surface.

Integration tests run against a **separate test database**, never the development one — they truncate and reseed, so pointing them at `DATABASE_URL` destroys local data. The variable belongs in `.env.example` alongside the others.

A feature isn't done until it has tests at every applicable layer above, not just a manual check.

## Per-ticket documentation

- Every ticket that changes behavior gets a short feature doc at `docs/features/<TICKET-KEY>-<slug>.md`: what was built, why, and how it works — same pattern as `docs/design-system.md`.
- Written when the ticket's work is verified, at the same time as the ticket comment below — not deferred.

## Development flow

The agreed loop for every piece of work. Steps 3–9 are the dev session's own responsibility.

1. **The coordinating session ("Project Manager") takes the request** from the user — what should be built, changed or fixed.
2. **It hands the work to a dev session** as a specific ticket key, saying what gates it. One ticket at a time per session.
3. **Every dev session is connected to Beacon** (`beacon-production`). A session that cannot read and write its own tickets cannot follow this flow — say so immediately rather than working blind or asking someone to relay.
4. **On starting: move the ticket to `IN_PROGRESS`** and post the start comment (session, branch, gate).
5. **Tests are not optional.** Frontend work has a Playwright end-to-end test. Backend work has unit _and_ integration tests, plus API/contract tests wherever there is a Zod boundary. If a layer genuinely does not apply — a data layer with no screen, a frontend ticket touching no backend — say so explicitly in the completion comment and explain why. A layer that applies and is missing is not done; a layer that does not apply and is unexplained looks the same as one that was skipped.
6. **Stuck or unsure? Ask the coordinating session.** Send it the question with enough context to answer, and it puts the decision to the user directly. Do not guess at a requirement you cannot read, and do not invent scope to fill a gap in a ticket — two sessions guessing produce work that has to be redone.
7. **On finishing: post a detailed completion comment and move the ticket to `DONE`.** Plain-language summary first for a non-engineer, then the technical detail — what changed, which test layers ran, which acceptance criteria are covered, and any decision a later ticket needs. Before the merge, not after.
8. **Commit** per Git / commits below: one commit for the branch, Conventional Commits subject with the ticket key, body a short bullet list a non-engineer can read, no `Co-Authored-By` and no tool attribution.
9. **Merge to `main` yourself** per Merging a finished branch below — rebase, re-run the suite after the rebase, squash, `merge --ff-only`, push. Then add the merge SHA to the completion comment.

The coordinating session still audits closed tickets against their acceptance criteria and reopens anything that did not meet the bar. Closing your own ticket is trusted, not unchecked — and an audit that finds nothing costs nobody anything.

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
- Stays `IN_PROGRESS` while the work is in flight.
- `IN_PROGRESS` → `DONE` by the session that did the work, when the completion comment is posted and the bar in Merging a finished branch is met. The coordinating session audits closed tickets afterwards and reopens any that fall short.

## Merging a finished branch

**No approval step.** A session merges its own branch once the bar below is met — it does not wait on the coordinating session. "Has its tests" is something you can check yourself; queueing five sessions behind one reviewer is not.

A branch is finished when **all** of these are true, not when the code works:

- **Tests at every layer that applies to the ticket's surface**, present and passing. If a layer applies, it is not optional:
  - Touches backend code → _unit_ (services in isolation, DB mocked), _integration_ (Supertest against a real test Postgres) and _API/contract_ (shapes against the Zod boundary schemas).
  - Touches a user-facing screen or flow → Vitest + React Testing Library component tests **and** a Playwright E2E.
  - Touches neither — a pure data, client or config layer with no screen — → the layers that do apply. The ticket's own definition of done names which those are; don't invent test layers for a surface the code doesn't have, and don't skip ones it does.
- **The build passes.** `npm run build` from the repository root, covering both workspaces. Tests and the dev server can be green while the production build is broken — that is exactly how a broken build sat in `main` from the scaffold until TEST-217. Check the **exit code**, not a printed summary line: the `rtk` command proxy filters output and has been observed printing "TypeScript: No errors found" over an exit-1 run. Redirect to a file and grep, or `echo $?`.
- The feature doc exists at `docs/features/<TICKET-KEY>-<slug>.md`.
- **The Beacon ticket is updated and the completion comment is posted — before the merge, not after.** The trail is written while the work is fresh and while it can still change the decision to merge; a comment written afterwards is a formality, and a comment never written means nobody outside the session knows what landed. No branch reaches `main` ahead of its ticket.
- **Every ticket it depends on is already merged into `main`.** This is correctness, not permission: it's what stops a branch built against a stub landing before the thing it stubbed.

Then merge it, in this order:

1. `git fetch origin && git rebase origin/main` — rebase, don't merge `main` into the branch.
2. Re-run the full test suite after the rebase. A green run before the rebase proves nothing about the merged result.
3. Squash to a single commit (see Git / commits).
4. `git push origin <branch>:main`. Do **not** use `git checkout main && git merge --ff-only` — `main` is permanently checked out in the primary repository directory, and git refuses to touch a branch checked out in another worktree, so that route cannot work from a session's own worktree. The refspec push carries the same guarantee: git rejects it unless it is a fast-forward. If it is refused, `main` moved — go back to step 1 rather than forcing anything.
   After it lands, the primary checkout's local `main` ref is stale until someone runs `git pull --ff-only` there. The coordinating session does that; mention it when you report the merge.
5. Add the merge commit SHA to the ticket's completion comment and tell the coordinating session it landed.
6. **Do not remove the worktree you are running in.** A session whose working directory disappears can no longer be reached — it drops out of the project mid-flight, taking whatever it knew with it. Leave cleanup to the coordinating session, or move out of the directory first and only then remove it.

Merging and closing are both self-serve — the trail is what makes that safe, which is why the completion comment goes up before the merge rather than after. The coordinating session audits closed tickets and reopens anything short of the bar. Never force-push `main`.

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
