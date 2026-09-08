# CLAUDE.md — AI Development Workflow

Instructions every Claude Code session working in this repository must follow.

This file is the rules. Reference detail lives in [`docs/`](./docs) and is linked from each section — read the linked file before working in that area.

MealBox is a personal recipe box with shopping-list generation, tracked as Beacon story [`TEST-71`](https://beacon.chro.media/browse/TEST-71). Sub-tasks under that story are the unit of work.

## 1. The workflow

```text
User
  ↓
PM session          receives the request, finds the ticket, delegates
  ↓
Dev session
  ↓
Understand          read the ticket, inspect the code, find what to reuse
  ↓
Plan               a concise plan before any edit
  ↓
Implement          smallest change that fully solves the ticket
  ↓
Test               real tests, actually run
  ↓
Document           ticket summary + feature doc
  ↓
Commit             one commit, no co-author
  ↓
Done               ticket → Done
  ↓
Merge to main
```

Several dev sessions run in parallel, each in its own git worktree. One session coordinates and is titled "Project Manager".

## 2. PM session

The PM session is the coordinator between the user and the dev sessions. It:

1. Receives the user's request and understands the requirement.
2. Identifies the ticket, or has one written before work starts — **a ticket with no acceptance criteria is not startable.**
3. Determines scope and what the work depends on.
4. Delegates implementation to a dev session, one ticket at a time per session.
5. Monitors progress and coordinates when two sessions' work overlaps.
6. Answers dev sessions' questions, and **puts decisions to the user** when the answer is not in the repository or the ticket.
7. Owns `shared/src/types.ts` — the frontend/backend contract seam. Contract changes go through the PM session so two branches cannot diverge.
8. Reviews completed work against the ticket's acceptance criteria and reopens anything short of the bar.

The PM session does not implement work a dev session should do.

## 3. Dev session — before coding

> **Inspect first. Plan second. Implement third.**

Before editing anything:

1. Read the whole ticket, not just its title.
2. Inspect the existing implementation of what you are about to change.
3. Search for functionality you can reuse — see §7.
4. Identify affected components, services, endpoints, migrations and tests.
5. Identify what could regress.
6. Run `git status` and check which branch you are on.
7. Write a concise plan.

Do not start coding from the ticket description alone.

## 4. Ticket lifecycle

Beacon's `TEST` project uses three statuses for this flow: **Todo → In Progress → Done**. Do not invent others.

**Todo** — not started. Read the ticket and plan before touching code.

**In Progress** — set this **as soon as you begin**, not when you are nearly finished. Post a start comment at the same time: which session, the branch name, and what the ticket was waiting on.

**Done** — set it yourself when all of these are true:

- Implementation complete.
- Required tests added or updated, and passing (§9).
- `npm run build` passes.
- Final diff reviewed; no unrelated changes; no secrets.
- Ticket summary posted (§13).
- Single commit created, no co-author (§12).
- Every ticket this one depends on is already merged.

Then merge to `main` (§12). Add the merge commit SHA to the summary comment afterwards.

The PM session audits closed tickets and reopens any that fall short. Closing your own ticket is trusted, not unchecked.

## 5. Questions

If a requirement is ambiguous and the choice would change behaviour or what a user sees, **do not guess**.

1. Work out the specific question.
2. Check whether the repository already answers it — existing code, existing patterns, the ticket, the tests, `docs/`.
3. If it does not: send the question to the PM session with enough context to answer it.
4. The PM session puts it to the user, using an interactive prompt where one is available.
5. Continue with the confirmed decision, and record it in the ticket summary.

Do not ask what you could have found by looking. Do not invent scope to fill a gap in a ticket.

## 6. Verify, don't assume

Mandatory. Never assume a file exists, an endpoint behaves a certain way, a component is unused, a column has a given type, a test covers a case, an environment variable is set, or that another session's changes are safe to modify. Check.

**Verify by exit code, not by printed output.** A command proxy configured outside this repository filters command output, and has been observed printing `TypeScript: No errors found` over a run that exited 1. Redirect to a file and grep it, or check `echo $?`. Never report a test or build result you did not see the exit status of.

## 7. Reuse before creating

Before adding a component, hook, service, utility, endpoint, abstraction or dependency, search for one that already does the job. See [`docs/architecture.md`](./docs/architecture.md) for what exists and where.

- Types come from `@recipe-box/shared`. Never redefine those shapes locally.
- UI comes from `frontend/src/components/ui/` — see [`docs/frontend.md`](./docs/frontend.md) and [`docs/design-system.md`](./docs/design-system.md).
- SQL lives only in `backend/src/repositories/` — see [`docs/backend.md`](./docs/backend.md).

Make the smallest change that fully solves the ticket. Do not rewrite unrelated code, and do not add abstractions, patterns or dependencies the ticket does not need.

When fixing a bug: understand it, find the root cause, fix that, add a regression test, verify. Do not patch the symptom.

Do not change existing behaviour unintentionally. If the ticket requires a behaviour change, make it deliberate and test it.

## 8. Code quality

Before finishing, review your own diff for leftover debugging statements, temporary code, duplicated logic, unused imports, weak naming, missing error handling, security problems and unintended side effects.

`npm run lint` and `npm run format` are the project's checks, and TypeScript runs `strict: true` in both workspaces. **Do not disable a check, loosen `strict`, or add `any` to make a task pass.**

## 9. Testing

Mandatory. Commands, layers and the current gaps are in [`docs/testing.md`](./docs/testing.md) — read it before claiming anything about tests.

- **Frontend behaviour changed** → add or update an end-to-end test covering the user flow, its edge cases, and loading/error/empty states. **No E2E framework is installed in this repository yet**, so raise this with the PM session rather than skipping it silently or scaffolding your own runner.
- **Backend behaviour changed** → add or update unit tests, and integration tests where the wiring matters. Add a regression test for a bug.

Before finishing: run the relevant tests, read the failures, fix what your change caused, re-run, and confirm the behaviour.

Never remove a test because it fails, disable validation to make one pass, weaken an assertion without reason, skip a required test without saying so in the summary, or claim tests passed without running them. Code compiling is not a task being complete.

## 10. Security

Never commit secrets, passwords, API keys or tokens; never log credentials; never bypass authentication, authorization or validation; never trust client-side authorization alone; never hardcode environment-specific secrets. `.env` is gitignored — `.env.example` carries the variable names and no values.

All SQL is parameterized. Every mutating endpoint validates its input before touching the database. CORS is locked to the known frontend origin.

When your change touches authentication, authorization, permissions, user access or sensitive data, review the diff explicitly for security consequences and say what you checked in the ticket summary.

## 11. Parallel development

Several sessions work this repository at once. These rules exist to stop one session destroying another's work.

1. Work only within your assigned ticket's scope.
2. `git status` and check your branch before starting.
3. Work in your own worktree — never two sessions in one checkout. See [`docs/git-workflow.md`](./docs/git-workflow.md).
4. Understand uncommitted changes before you touch the files they are in.
5. Never discard, overwrite or clean up another session's uncommitted work.
6. Never `git reset --hard`, never force-push, never rewrite another task's commits.
7. Avoid touching files outside your ticket.
8. Tell the PM session about conflicts instead of resolving them unilaterally.

If two sessions changed the same code, do not simply pick one. Read both, understand why each exists, and ask the PM session to coordinate.

## 12. Git

Full detail, including the merge route that actually works here, is in [`docs/git-workflow.md`](./docs/git-workflow.md).

Before committing: `git status`, read the whole diff, confirm only intended files changed, run the tests and the build, check for secrets, confirm everything belongs to your ticket.

**One commit per branch.** Squash before the branch is shared. The commit must have **no `Co-Authored-By` trailer**, no tool attribution and no "generated with" footer. Subject follows Conventional Commits with the ticket key — `feat(recipes): add recipe CRUD API (TEST-72)`. The body is a short bullet list a non-engineer can read: what the change does for the user, not which files moved.

Do not rewrite or squash another session's commits. Do not force-push.

## 13. Ticket summary

Post a summary comment when the work is done, **before** merging. Write it so both a developer and a non-engineer can follow it — plain-language summary first, detail below:

- **Summary** — what was implemented.
- **Changes** — the important changes.
- **Testing** — tests added or updated, tests run, and their results. Name any layer that does not apply and why; an unexplained absence looks identical to a skipped test.
- **Behavior** — user-facing changes.
- **Configuration / Deployment** — new environment variables, migrations, or setup steps.
- **Notes** — anything the PM should know, including decisions later tickets depend on.

Per-ticket feature docs go in `docs/features/<TICKET-KEY>-<slug>.md` when the change is worth explaining beyond the summary.

## 14. Definition of Done

- [ ] Requirements understood; ticket read in full
- [ ] Existing implementation inspected; reusable code searched for
- [ ] Plan written before implementing
- [ ] Ticket moved Todo → In Progress at the start, with a start comment
- [ ] Implementation complete
- [ ] Frontend E2E added/updated where frontend behaviour changed
- [ ] Backend unit tests added/updated where backend logic changed
- [ ] Backend integration tests added/updated where wiring changed
- [ ] Relevant tests run and passing — exit code checked
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Final diff reviewed; no unrelated changes; no secrets
- [ ] `docs/api.md` and `docs/architecture.md` updated if the change altered the API surface, a layer, or a test command
- [ ] Ticket summary posted
- [ ] Single commit, no co-author
- [ ] Dependencies already merged to `main`
- [ ] Ticket moved to Done
- [ ] Merged to `main`, merge SHA added to the summary

## 15. Do not

Start coding without inspecting. Guess at an ambiguous requirement. Rewrite unrelated code. Add unnecessary abstractions or dependencies. Duplicate what exists. Remove tests to make them pass. Disable linting, type checking or security controls. Touch another ticket. Discard another session's changes. Use destructive git commands or force-push without explicit instruction. Commit secrets. Claim tests passed without running them. Claim a task is complete without verifying it. Mark a ticket Done with work outstanding. Invent a project convention.

## 16. Reference

Most of these pages describe **rules**, which stay true. Two of them — [`docs/api.md`](./docs/api.md) and [`docs/architecture.md`](./docs/architecture.md) — describe **what currently exists**, so they go stale the moment a ticket changes the surface. If your change adds or alters an endpoint, a layer, or a test script, **update those pages in the same branch as the change**. A new session reading a stale inventory builds against a fiction — that has already happened once, within an hour of the pages being written.

| Document                                           | What it covers                                         |
| -------------------------------------------------- | ------------------------------------------------------ |
| [`docs/architecture.md`](./docs/architecture.md)   | Workspace layout, the shared contract, request path    |
| [`docs/frontend.md`](./docs/frontend.md)           | React/Vite/Tailwind conventions, state, accessibility  |
| [`docs/backend.md`](./docs/backend.md)             | Express layering, validation, repositories, migrations |
| [`docs/api.md`](./docs/api.md)                     | Endpoints as they exist, conventions for new ones      |
| [`docs/testing.md`](./docs/testing.md)             | Commands per layer, the test database, current gaps    |
| [`docs/git-workflow.md`](./docs/git-workflow.md)   | Worktrees, branches, commits, the merge route          |
| [`docs/deployment.md`](./docs/deployment.md)       | Running it locally; what does not exist yet            |
| [`docs/design-system.md`](./docs/design-system.md) | UI component reference                                 |
