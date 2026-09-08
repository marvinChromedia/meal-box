# TEST-244 — Fix the `tsBuildInfoFile` / `outDir` path in frontend tsconfig

## What was wrong

TEST-217 set `tsBuildInfoFile` in `frontend/tsconfig.json` and `frontend/tsconfig.node.json`
to `./node_modules/.tsbuildcache/…`. That path resolves relative to the tsconfig file's
own directory (`frontend/`), but this repo is an npm workspaces monorepo — `node_modules`
is hoisted to the repository root, so `frontend/node_modules` doesn't exist as a real
npm-managed directory.

TypeScript doesn't care that the directory should be npm-managed: writing a build-info
file or declaration output just `mkdir -p`s whatever path is configured. So it silently
created a **phantom `frontend/node_modules/`** — containing nothing but `.tsbuildcache/`
— and wrote the cache files there instead of at the intended shared location. Confirmed
before touching anything: a clean build on the unmodified config produced exactly
`frontend/node_modules/.tsbuildcache/{app,node}/*.tsbuildinfo` and nothing at the repo
root.

`tsconfig.node.json`'s `outDir` had the identical bug (same relative path, same phantom
directory) — fixed alongside `tsBuildInfoFile` even though the ticket's narrative only
mentioned the latter by name; it's the same defect in the same file.

## The fix

Both settings now use `../node_modules/.tsbuildcache/...` — one level up from `frontend/`,
landing in the real, hoisted, already-gitignored root `node_modules/`. tsconfig paths
always resolve relative to the tsconfig file itself regardless of the directory a build
is invoked from, so this holds no matter where `tsc` or `npm run build` is run.

## AC2 — incremental builds, verified honestly

Two things are true and worth separating:

1. **The `tsconfig.node.json` project's incremental check genuinely works.** A second
   `tsc -b` run reports it explicitly: `Project 'tsconfig.node.json' is up to date
because newest input 'vite.config.ts' is older than output
'../node_modules/.tsbuildcache/node/tsconfig.node.tsbuildinfo'`. That's TypeScript's
   own build orchestrator confirming the cache is read, trusted, and used to skip work —
   not something achieved by disabling anything.
2. **The `tsconfig.json` (app) project reports "out of date" and rebuilds on every
   `tsc -b` invocation, before and after this fix.** Verified by reverting to the
   original broken paths and reproducing the identical message
   (`Project 'tsconfig.json' is out of date because output file 'src/App.js' does not
exist`) — proving this is a pre-existing `tsc -b` characteristic of a `noEmit: true`
   project under composite/build mode, not something the path bug caused or that this
   fix could change. `tsc -b`'s freshness check for a referencing project wants a real
   emitted output file to compare timestamps against; with `noEmit` there is none, so
   it always re-invokes that project's compile step. The `.tsbuildinfo` file is still
   written and still holds cached type information (confirmed present and updated after
   each run) — what's not incremental is specifically the orchestrator's decision to
   invoke that project at all, not the caching mechanism this ticket's path fix touches.

Out of scope for this ticket (a build-config path fix), and not something the path
correction is capable of changing either way. Recorded here rather than glossed over,
since AC2 asked for the second build to be "confirmed still incremental" and the honest
answer has two different pieces.

## Verification

- Clean `npm run build` (root, both workspaces): exit 0. Cache lands at
  `node_modules/.tsbuildcache/{app,node}/`; `frontend/node_modules` is never created.
- `git status` after a build: clean — only the two tsconfig edits, nothing new or
  untracked (the real `node_modules/.tsbuildcache/` is already covered by the top-level
  `node_modules/` gitignore rule, independent of the more specific `*.tsbuildinfo` line
  Out of Scope says to leave alone).
- `npm run lint`: exit 0. Frontend test suite (70 tests, unaffected by this change):
  exit 0, no regressions.

No test layer owed — pure build configuration, no user-facing behavior, per the
ticket's own Definition of Done.
