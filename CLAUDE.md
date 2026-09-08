# CLAUDE.md — AI Development Workflow

Rules every Claude Code session in this repository follows. Detail and reasoning live in [`docs/`](./docs), linked per section — read the linked page before working in that area.

MealBox: a personal recipe box with shopping-list generation. Beacon story [`TEST-71`](https://beacon.chro.media/browse/TEST-71); its sub-tasks are the unit of work.

Several dev sessions run in parallel, each in its own git worktree. One session coordinates and is titled "Project Manager" (the PM). A dev session's loop: **understand → plan → implement → test → document → commit → Done → merge**.

## 1. PM session

1. Takes the user's request; identifies the ticket. **A ticket with no acceptance criteria is not startable** — spec it first.
2. Determines scope and dependencies; delegates one ticket at a time per session.
3. Coordinates overlapping work; answers dev questions, and puts decisions the repository cannot answer to the user.
4. Owns `shared/src/types.ts`. All contract changes go through the PM.
5. Audits closed tickets against their acceptance criteria and reopens anything short of the bar.

The PM does not implement work a dev session should do.

## 2. Before coding

> **Inspect first. Plan second. Implement third.**

Read the whole ticket. Inspect the existing implementation. Search for what you can reuse (§5). Identify affected components, endpoints, migrations and tests, and what could regress. Run `git status`, check your branch. Write a concise plan.

Do not start from the ticket description alone.

## 3. Ticket lifecycle

Three statuses only: **Todo → In Progress → Done**. Do not invent others. Read and write tickets through the `beacon-production` MCP tools, never a browser; if those tools are missing from your session, **say so immediately** instead of working around it.

**In Progress** — set it as soon as you begin, not when nearly finished, with the start comment (§10).

**Done** — set it yourself when the checklist in §12 is fully met. Then merge (§9) and add the merge SHA to the summary comment.

## 4. Questions

If a requirement is ambiguous and the choice changes behaviour or what a user sees, **do not guess.** Check the repository first — code, patterns, ticket, tests, `docs/`. If it does not answer, send the question to the PM with enough context; the PM puts it to the user. Record the confirmed decision in the summary.

Do not ask what you could find by looking. Do not invent scope to fill a gap in a ticket.

## 5. Verify, don't assume

Never assume a file exists, an endpoint behaves a certain way, a component is unused, a column has a given type, a test covers a case, an environment variable is set, or that another session's changes are safe to modify.

**Verify by exit code, not printed output** — a command proxy outside this repository filters output and has printed `TypeScript: No errors found` over a run that exited 1. Redirect to a file and grep, or check `echo $?`. Never report a test or build result whose exit status you did not see.

## 6. Reuse before creating

Before adding a component, hook, service, utility, endpoint, abstraction or dependency, search for one that already does the job — see [`docs/architecture.md`](./docs/architecture.md).

- Types come from `@recipe-box/shared`. Never redefine those shapes locally.
- UI comes from `frontend/src/components/ui/` — [`docs/frontend.md`](./docs/frontend.md), [`docs/design-system.md`](./docs/design-system.md).
- SQL lives only in `backend/src/repositories/` — [`docs/backend.md`](./docs/backend.md).

Make the smallest change that fully solves the ticket. Do not rewrite unrelated code or add abstractions the ticket does not need. Fixing a bug means finding the root cause and adding a regression test, not patching the symptom. Do not change existing behaviour unintentionally.

## 7. Testing

Commands, layers, the test database and current gaps: [`docs/testing.md`](./docs/testing.md). Read it before claiming anything about tests.

- **Frontend behaviour changed** → an end-to-end test covering the flow, its edge cases and the loading/error/empty states, plus component tests.
- **Backend behaviour changed** → unit tests, integration tests where the wiring matters, contract tests at a Zod boundary, and a regression test for a bug.

Before finishing: run the tests, read the failures, fix what your change caused, re-run, confirm the behaviour.

A required layer you genuinely cannot write yet may be **deferred** — narrowly, and only under the four conditions in [`docs/testing.md`](./docs/testing.md), which include a ticket that carries the missing test. Name that ticket in your summary. **Never call a deferred layer "not applicable"**; it applies and cannot be written yet, which is a different claim.

Never remove a test because it fails, disable validation to make one pass, weaken an assertion without reason, or claim tests passed without running them.

## 8. Code quality and security

Review your own diff for debugging leftovers, temporary code, duplicated logic, unused imports, weak naming, missing error handling and unintended side effects. `npm run lint` and `npm run format` are the checks; TypeScript is `strict: true` in both workspaces. **Do not disable a check, loosen `strict`, or add `any` to make a task pass.**

Never commit or log secrets, passwords, keys or tokens. Never bypass authentication, authorization or validation, and never trust client-side authorization alone. `.env` is gitignored; `.env.example` carries variable names and no values. All SQL parameterized. Every mutating endpoint validates its input. CORS locked to the known frontend origin.

When a change touches authentication, authorization, permissions, user access or sensitive data, review the diff explicitly for security consequences and say what you checked in the summary.

## 9. Parallel work and git

Worktrees, branch naming and the merge route that actually works here: [`docs/git-workflow.md`](./docs/git-workflow.md).

1. Work only within your ticket's scope; avoid touching unrelated files.
2. Work in your own worktree — never two sessions in one checkout. **Creating and working in it needs nobody's approval.**
3. Understand uncommitted changes before touching the files they are in. Never discard, overwrite or clean up another session's work.
4. Never `git reset --hard`, never force-push, never rewrite another session's commits.
5. Two sessions changed the same code? Read both, understand why each exists, and ask the PM to coordinate — do not just pick one.

Before committing: `git status`, read the whole diff, confirm only intended files changed, run the tests and the build, check for secrets.

**One commit per ticket, and it includes the documentation** — code, tests, feature doc and any reference-page updates, squashed into one. No separate `docs:` commit trailing an implementation. Conventional Commits subject with the ticket key (`feat(recipes): add recipe CRUD API (TEST-72)`); body a short bullet list a non-engineer can read. **No `Co-Authored-By`**, no tool attribution, no "generated with" footer.

The PM batches its own non-ticket documentation changes into one commit per change of intent.

## 10. Ticket comments

**Two comments per ticket, no more. Both short, both written for a non-engineer.** Technical detail belongs in the feature doc.

**Start comment** — session, branch, what it was waiting on. Three lines.

**Summary comment**, posted before merging: what a person can now do or what stopped being broken, anything they will notice, anything needed to run it. Then the merge SHA on that same comment once it lands.

Keep out of comments: file paths, function and column names, test counts, framework names, config flags, code snippets, test-layer breakdowns, acceptance-criterion mapping.

**That detail goes in `docs/features/<TICKET-KEY>-<slug>.md`**, in the same branch — every ticket that changes behaviour gets one. Write it for the next developer: what changed and why, which tests cover it, decisions later tickets depend on, trade-offs you accepted.

A decision affecting another ticket goes in the feature doc **and** to the PM, which is what carries it to the session that needs it.

The PM's verification is appended to the summary comment, not added as a third.

## 11. Reference

[`docs/api.md`](./docs/api.md) and [`docs/architecture.md`](./docs/architecture.md) describe **what currently exists**, so a change that adds or alters an endpoint, a layer or a test script **updates them in the same branch**.

| Document                                           | Covers                                                 |
| -------------------------------------------------- | ------------------------------------------------------ |
| [`docs/architecture.md`](./docs/architecture.md)   | Workspace layout, the shared contract, request path    |
| [`docs/frontend.md`](./docs/frontend.md)           | React/Vite/Tailwind conventions, state, accessibility  |
| [`docs/backend.md`](./docs/backend.md)             | Express layering, validation, repositories, migrations |
| [`docs/api.md`](./docs/api.md)                     | Endpoints as they exist, conventions for new ones      |
| [`docs/testing.md`](./docs/testing.md)             | Commands per layer, test database, deferral rules      |
| [`docs/git-workflow.md`](./docs/git-workflow.md)   | Worktrees, branches, commits, the merge route          |
| [`docs/deployment.md`](./docs/deployment.md)       | Running it locally; what does not exist yet            |
| [`docs/design-system.md`](./docs/design-system.md) | UI component reference                                 |

## 12. Definition of Done

- [ ] Ticket read in full; existing implementation inspected; reuse searched for
- [ ] Plan written before implementing
- [ ] Ticket moved to In Progress at the start, with a start comment
- [ ] Implementation complete
- [ ] Tests present at every layer that applies (§7); any deferral names its ticket
- [ ] Tests, `npm run lint` and `npm run build` all pass — exit codes checked (§5)
- [ ] Diff reviewed: no unrelated changes, no secrets
- [ ] `docs/api.md` / `docs/architecture.md` updated if the surface changed (§11)
- [ ] Feature doc written at `docs/features/<TICKET-KEY>-<slug>.md`
- [ ] Summary comment posted — short, non-technical (§10)
- [ ] Single commit, no co-author, documentation included (§9)
- [ ] Every ticket this one depends on is already merged
- [ ] Ticket moved to Done; merged to `main`; merge SHA added to the summary

## 13. Do not

Start coding without inspecting. Guess at an ambiguous requirement. Rewrite unrelated code. Add unnecessary abstractions or dependencies. Duplicate what exists. Remove tests to make them pass. Disable linting, type checking or security controls. Touch another ticket. Discard another session's changes. Use destructive git commands or force-push without explicit instruction. Commit secrets. Claim tests passed without running them. Claim a task is complete without verifying it. Mark a ticket Done with work outstanding. Invent a project convention.
