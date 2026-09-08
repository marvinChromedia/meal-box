# Process

How work moves from a request to merged code. `CLAUDE.md` states these rules in short form; this page is the detail, and the reasoning behind the parts that exist because something went wrong.

## The PM session

One session coordinates and is titled "Project Manager". It:

1. Takes the user's request and identifies the ticket. **A ticket with no acceptance criteria is not startable** — it gets specified first.
2. Determines scope and dependencies, and delegates one ticket at a time per session.
3. Coordinates overlapping work, answers dev questions, and puts decisions the repository cannot answer to the user.
4. Owns `shared/src/types.ts`. All contract changes go through it, so two branches cannot diverge on the same shape.
5. Audits closed tickets against their acceptance criteria and reopens anything short of the bar.

**The PM does not implement work a dev session should do.** It has done so, and the result is a session waiting on a coordinator that is busy writing code.

### Delegation is not a substitute for the ticket

A message from the PM does not overrule the ticket it contradicts. If an instruction and the ticket disagree, **the ticket wins** until someone changes it — and the session should say so rather than acting on the newer message. This rule exists because it happened: a session was told to keep a change while the ticket said to revert it, re-fetched the ticket, found the contradiction, and correctly refused to edit the same file a third time on the strength of a chat message. Ask for the ticket to be updated first.

## Ticket lifecycle

Three statuses. **Todo → In Progress → Done.** Do not invent others.

Read and write tickets through the `beacon-production` MCP tools, never a browser. Scraping a ticket page gives parsed HTML you cannot fully trust, and clicking through the interface gives no structured confirmation that the right field on the right ticket changed. If those tools are missing from a session, **say so immediately** — the fix is one the user makes in a moment, and a browser workaround looks like it is working while quietly producing a worse audit trail. One session spent a stretch of this project guessing at requirements it could not read.

**In Progress** — set it as soon as work begins, not when nearly finished, with the start comment.

**Done** — set it when the checklist below is fully met, then merge and add the merge SHA to the summary comment. Closing your own ticket is trusted, not unchecked: the PM audits closed tickets and reopens what falls short.

## Questions

If a requirement is ambiguous and the choice changes behaviour or what a user sees, do not guess.

1. Work out the specific question.
2. Check whether the repository already answers it — existing code, existing patterns, the ticket, the tests, `docs/`.
3. If it does not, send it to the PM with enough context to answer it. The PM puts it to the user, using an interactive prompt where one is available.
4. Continue with the confirmed decision, and record it in the summary.

Do not ask what you could have found by looking. Do not invent scope to fill a gap in a ticket.

## Fixing a bug

Understand it, find the root cause, fix that, add a regression test, verify. Do not patch the symptom.

Make the smallest change that fully solves the ticket. Do not rewrite unrelated code, and do not add abstractions, patterns or dependencies the ticket does not need. Do not change existing behaviour unintentionally — if the ticket requires a behaviour change, make it deliberate and test it.

## Ticket comments

**Two comments per ticket, no more. Both short, both written for a non-engineer** — a stakeholder reading the ticket should understand what happened without asking a developer.

**The start comment**, posted when the ticket moves to In Progress. Three lines: which session, the branch, and what the ticket was waiting on.

**The summary comment**, posted when the work is done and **before** merging. A short paragraph or a handful of plain bullets:

- What a person can now do that they could not before, or what stopped being broken.
- Anything they will notice about how it behaves.
- Anything that needs doing to run it — a new setting, a database change.

Then the merge SHA, added to that same comment once it lands.

**What does not go in a comment:** file paths, function and column names, test counts, framework names, config flags, code snippets, layer-by-layer test breakdowns, acceptance-criterion mapping. None of it means anything to the audience the comment is for.

**The PM's verification is appended to the summary comment, not added as a third.** Two means two, and that includes the check. Some earlier tickets have a separate audit comment; that predates this rule and is not the pattern to copy.

Two tests before posting: could a non-engineer read this and know what changed? Is everything a developer would need somewhere a developer will look? If either answer is no, the split is wrong.

## Feature docs

**Every ticket that changes behaviour gets `docs/features/<TICKET-KEY>-<slug>.md`, in the same branch as the change.** This is where the technical detail lives: what changed and why, which tests cover it, decisions later tickets depend on, trade-offs you accepted. Write it for the next developer, at whatever length the work deserves.

If a decision affects another ticket, the feature doc records it **and** you tell the PM — that is what carries it to the session that needs it. Do not rely on someone reading a long comment.

## Definition of Done

- [ ] Ticket read in full; existing implementation inspected; reuse searched for
- [ ] Plan written before implementing
- [ ] Ticket moved to In Progress at the start, with a start comment
- [ ] Tests present at every layer that applies; any deferral names the ticket carrying it
- [ ] Tests, `npm run lint` and `npm run build` all pass — **exit codes checked**
- [ ] Diff reviewed: no unrelated changes, no secrets, no debugging leftovers
- [ ] `docs/api.md` / `docs/architecture.md` updated if the API surface, a layer or a test command changed
- [ ] Feature doc written at `docs/features/<TICKET-KEY>-<slug>.md`
- [ ] Summary comment posted — short, non-technical
- [ ] Single commit, no co-author, documentation included
- [ ] Every ticket this one depends on is already merged
- [ ] Ticket moved to Done; merged to `main`; merge SHA added to the summary

## The failures these rules come from

Each of these has happened on this project. They are listed because a rule with a known counterexample is easier to take seriously than one without.

| Rule                                                          | What went wrong                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Verify by exit code                                           | A filtered summary reported success over a run that exited 1 — see [`testing.md`](./testing.md).                |
| Update `api.md` / `architecture.md` in the same branch        | A merged ticket made three reference pages wrong within an hour of them being written.                          |
| Tickets through the MCP, not a browser                        | A session guessed at requirements it could not read.                                                            |
| One commit per ticket                                         | Split commits left `git revert` taking back code and leaving the docs describing it.                            |
| The ticket beats a contradicting message                      | See "Delegation is not a substitute for the ticket" above.                                                      |
| Don't run `migrate:up` against the dev database from a branch | It contaminated shared state and broke another session's migration ordering — see [`backend.md`](./backend.md). |
| Use a scratch database for hands-on checks                    | Two sessions lost time to the shared test database reseeding underneath them.                                   |
