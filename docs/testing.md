# Testing

Testing is mandatory, and the commands below are the real ones — each was run against this repository and its exit code recorded.

## Verify by exit code, not by printed output

A command proxy configured outside this repository filters command output. It has been observed printing `TypeScript: No errors found` for a run that exited **1**. A broken production build survived in `main` from the initial scaffold until TEST-217 precisely because a session read a filtered "no errors" line and reported it in good faith.

So: redirect to a file and grep it, or check `echo $?`. Never report a test or build outcome without having seen its exit status.

```bash
npm run build > /tmp/build.txt 2>&1; echo "exit: $?"
grep -c "error TS" /tmp/build.txt
```

## Commands

| Command                               | Scope                                     | Verified                                            |
| ------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| `npm run lint`                        | ESLint, whole repo                        | exit 0                                              |
| `npm run build`                       | `tsc -b` + build, both workspaces         | exit 0                                              |
| `npm test -w frontend`                | Vitest + RTL                              | exit 0, 70 tests                                    |
| `npm run test:unit -w backend`        | Unit, database mocked                     | exit 0, 14 tests                                    |
| `npm run test:contract -w backend`    | Zod boundary schemas, no database or HTTP | exit 0, 12 tests                                    |
| `npm run test:integration -w backend` | Integration, real PostgreSQL              | exit 0, 21 tests — **requires `TEST_DATABASE_URL`** |
| `npm test -w backend`                 | All three backend layers in sequence      | exit 0, 47 tests — **requires `TEST_DATABASE_URL`** |

### The root `npm test` currently fails

`npm test` runs frontend then backend, and backend's `test` chains `test:unit && test:contract && test:integration`. Integration throws without `TEST_DATABASE_URL`, so on a clean shell the root command **exits 1** — the frontend and the unit and contract layers pass, integration reports "no tests", and the run fails overall.

Export the variable first:

```bash
export TEST_DATABASE_URL="postgres://localhost:5432/recipe_box_test"
npm test
```

`backend/test/integration/globalSetup.ts` reads `process.env` directly and does **not** load `backend/.env`, so having the variable in that file is not enough — a developer who follows `.env.example` still gets a hard failure with no hint the file is being ignored.

## The test database

Integration tests run against a **separate test database**, never the development one. They truncate and reseed, so pointing them at `DATABASE_URL` destroys local data. `globalSetup.ts` applies the migrations before the suite runs.

## Layers

**Frontend**

- _Unit / component_ — Vitest + React Testing Library, one file per component or hook, colocated.
- _End-to-end_ — required whenever frontend behaviour changes: the user flow, its edge cases, and the loading, error and empty states.

> **No E2E framework is installed in this repository.** There is no Playwright dependency, config, script or spec. A frontend ticket therefore cannot currently satisfy its E2E requirement. Raise this with the PM session — do not skip the requirement silently, and do not scaffold your own runner: several sessions each standing one up produces several conflicting configs. The harness is landed once, centrally.

**Backend** — three layers, kept as distinct suites rather than blended into one:

- _Unit_ — pure functions and services in isolation with the database mocked. Aggregation and de-duplication logic belongs here.
- _Integration_ — Supertest against real Express routes and a real test PostgreSQL, proving route → service → repository → database actually wires up.
- _API / contract_ — request and response shapes against the Zod boundary schemas, independent of business logic, so a breaking change to the API surface is caught.

## Don't race a real timer

The mock layer's `api.ts` files simulate latency with `mockDelay()` (`frontend/src/lib/api/mockDelay.ts`) — real `setTimeout`, not a fake clock — specifically so loading states are genuinely exercised rather than resolving instantly. That's legitimate; don't remove it.

The trap: a test that wants to assert something about the **transient window between a mutation starting and it settling** — "the UI updated optimistically, before the request resolved" — and does so by racing `waitFor` against that real timer is not flaky under load, it's **fundamentally non-deterministic**, full stop. Whether the assertion happens to land inside or outside that window depends on the timing between an unmocked wall-clock timer and the test framework's own scheduling. TEST-235 traced the very first version of this project's flaky-test hypothesis (suspected load contention) to this — load only ever changes how often the race is lost, not whether the race exists.

**A plain `await waitFor(() => expect(...))` for an eventually-settled state is not this trap** — `waitFor` polls until the assertion passes or its own timeout elapses, so it doesn't matter whether the underlying state change happens instantly or after `mockDelay()`'s ~150ms; a 1000ms default timeout has ample margin either way. The trap is specific to asserting the **mid-flight** state on purpose.

**The fix:** don't let a real timer decide the order. Replace the mocked API call with a manually controlled promise for the one test that needs to inspect the mid-flight state, so the test itself — not the clock — decides when "settled" happens:

```ts
let resolveUpdate!: (value: Item) => void;
const pending = new Promise<Item>((resolve) => {
  resolveUpdate = resolve;
});
const spy = vi.spyOn(itemsApi, 'update').mockReturnValueOnce(pending as never);

mutation.mutate(input);
await waitFor(() => expect(cacheAlreadyReflectsTheChange()).toBe(true));
expect(mutation.isPending).toBe(true); // still mid-flight — proven, not assumed

resolveUpdate(theRealResult);
await waitFor(() => expect(mutation.isSuccess).toBe(true));
spy.mockRestore();
```

Worked example, both the success and the rejection path: `frontend/src/features/shopping-list/hooks.test.tsx` — see "checks an item off in the cache before the request resolves" and "rolls back to the real state when the request fails". Before-and-after reasoning: `docs/features/TEST-77-shopping-list-ui.md` under "Optimistic check-off".

Before writing a test like this, check whether it's actually asserting a mid-flight state at all — most async UI tests aren't, and don't need this.

## A required layer you cannot write yet

Three cases, not two, and they are not interchangeable:

1. **The layer applies and you wrote it.** Normal.
2. **The layer does not apply** — a data layer with no screen, a frontend change touching no backend. Say so in the summary and say why. An unexplained absence is indistinguishable from a skip.
3. **The layer applies but is blocked outside your ticket** — most obviously that no end-to-end runner is installed. This is the only real exception.

A case-3 deferral is allowed only when **all four** hold:

- The blocker is genuinely outside your ticket, and fixing it in your branch would be worse — several sessions each installing their own runner, for instance.
- **A ticket exists that carries the missing test**, with an owner, listing your ticket in its debt.
- Your summary names that ticket.
- The coordinating session agreed to it.

Then the ticket may go to Done and the code may merge.

**Never describe a deferred layer as "not applicable".** It applies; it cannot be written yet. Blurring those is how a missing test becomes invisible — name the ticket number instead. Wanting a fourth category means you are about to skip a test; ask the coordinating session.

### Why the exit-code rule exists

A broken production build sat in `main` from the initial scaffold until TEST-217, while the dev server and both test suites ran green. It survived because a session read a filtered "no errors" summary and reported it in good faith. Every claim about a test or build result is only as good as the exit status behind it.

## Rules

Before finishing: run the relevant tests, read the failures, fix what your change caused, re-run, confirm the behaviour.

If a layer genuinely does not apply — a data layer with no screen, a frontend ticket touching no backend, a config fix with no user-facing behaviour — **say so explicitly in the ticket summary and explain why**. An unexplained absence is indistinguishable from a skipped test.

Never remove a test because it fails, disable validation to make one pass, weaken an assertion without a stated reason, or claim a test passed without running it. Code compiling is not a task being complete.
