# CLAUDE.md

Rules for every Claude Code session in this repository. **This file is rules only.** Detail, commands, paths, code and reasoning live in [`docs/`](./docs) — read the linked page before working in that area, and put new detail there rather than here.

MealBox, tracked as Beacon story [`TEST-71`](https://beacon.chro.media/browse/TEST-71). Its sub-tasks are the unit of work. Several dev sessions run in parallel, each in its own worktree; one coordinates and is titled "Project Manager" (the PM).

Loop: **understand → plan → implement → test → document → commit → Done → merge.** Full process in [`docs/process.md`](./docs/process.md).

## 1. Before coding

> **Inspect first. Plan second. Implement third.**

Read the whole ticket. Inspect what you are about to change. Search for what you can reuse (§4). Identify the affected components, endpoints, migrations and tests, and what could regress. Run `git status` and check your branch. Write a concise plan.

Do not start from the ticket description alone.

## 2. Verify, don't assume

Never assume a file exists, an endpoint behaves a certain way, a component is unused, a column has a given type, a test covers a case, an environment variable is set, or that another session's changes are safe to modify. Check.

**Verify by exit code, not printed output.** A command proxy outside this repository filters output and has reported success over a run that exited 1. Redirect to a file and grep, or check `echo $?`. Never report a test or build result whose exit status you did not see. Why: [`docs/testing.md`](./docs/testing.md).

## 3. Questions

If a requirement is ambiguous and the choice changes behaviour or what a user sees, **do not guess.** Check the repository first — code, patterns, ticket, tests, `docs/`. If it does not answer, send the question to the PM, which puts it to the user. Record the decision in your summary.

Do not ask what you could find by looking. Do not invent scope to fill a gap in a ticket. A PM message that contradicts the ticket does not overrule it — see [`docs/process.md`](./docs/process.md).

## 4. Reuse before creating

Before adding a component, hook, service, utility, endpoint, abstraction or dependency, search for one that already does the job — [`docs/architecture.md`](./docs/architecture.md).

Types come from the shared package; UI from the shared component set ([`docs/frontend.md`](./docs/frontend.md), [`docs/design-system.md`](./docs/design-system.md)); SQL only from the repository layer ([`docs/backend.md`](./docs/backend.md)). Never redefine a shared shape locally.

Make the smallest change that fully solves the ticket. Fix root causes, not symptoms, and add a regression test — [`docs/process.md`](./docs/process.md).

## 5. Testing

Commands, layers, the test database and current gaps: [`docs/testing.md`](./docs/testing.md). Read it before claiming anything about tests.

Frontend behaviour changed → end-to-end plus component tests. Backend behaviour changed → unit, integration where the wiring matters, contract at a validation boundary. Run them, read the failures, fix what your change caused, re-run.

A layer you genuinely cannot write yet may be **deferred**, only under the conditions in [`docs/testing.md`](./docs/testing.md), and your summary **names the ticket carrying it**. Never call a deferred layer "not applicable".

Never remove a test because it fails, disable validation to make one pass, weaken an assertion without reason, or claim tests passed without running them.

## 6. Code quality and security

Review your own diff for debugging leftovers, temporary code, duplicated logic, unused imports, weak naming, missing error handling and unintended side effects. `npm run lint` and `npm run format` are the checks; TypeScript is `strict: true`. **Do not disable a check, loosen `strict`, or add `any` to make a task pass.**

Never commit or log secrets, keys or tokens. Never bypass authentication, authorization or validation. **Every API route is behind authentication** — [`docs/backend.md`](./docs/backend.md) has what a new endpoint and its tests must do.

When a change touches authentication, authorization, permissions, user access or sensitive data, review the diff explicitly for security consequences and say what you checked in the summary.

## 7. Parallel work and git

Worktrees, branch naming, the merge route that works here, and correcting an already-pushed commit: [`docs/git-workflow.md`](./docs/git-workflow.md).

Work only within your ticket's scope. **Work in your own worktree — never two sessions in one checkout, and creating and working in it needs nobody's approval.** Understand uncommitted changes before touching those files, and never discard another session's work. Never `git reset --hard`, force-push, or rewrite another session's commits. If two sessions changed the same code, read both and ask the PM to coordinate — do not just pick one.

**One commit per ticket, including its documentation** — code, tests, feature doc and reference-page updates, squashed into one before the branch is shared. Conventional Commits subject with the ticket key; body a short bullet list a non-engineer can read. **No `Co-Authored-By`**, no tool attribution, no "generated with" footer. The PM batches its own non-ticket doc changes into one commit per change of intent.

## 8. Tickets

Statuses are **Todo → In Progress → Done**, and nothing else. Read and write them through the `beacon-production` MCP tools, never a browser; if those tools are missing from your session, **say so immediately** rather than working around it.

Set In Progress as you begin, with a start comment. Set Done when [`docs/process.md`](./docs/process.md)'s Definition of Done is met, then merge and add the merge SHA to the summary.

**Two comments per ticket, no more, both short and written for a non-engineer.** No paths, function names, test counts, framework names or code. That detail goes in `docs/features/<TICKET-KEY>-<slug>.md` in the same branch — required for every ticket that changes behaviour. Full protocol: [`docs/process.md`](./docs/process.md).

The PM owns the shared contract; contract changes go through it.

## 9. Reference

[`docs/api.md`](./docs/api.md) and [`docs/architecture.md`](./docs/architecture.md) describe **what currently exists**, so a change that adds or alters an endpoint, a layer or a test command **updates them in the same branch**.

Pages: [`process`](./docs/process.md) · [`architecture`](./docs/architecture.md) · [`frontend`](./docs/frontend.md) · [`backend`](./docs/backend.md) · [`api`](./docs/api.md) · [`testing`](./docs/testing.md) · [`git-workflow`](./docs/git-workflow.md) · [`deployment`](./docs/deployment.md) · [`design-system`](./docs/design-system.md)
