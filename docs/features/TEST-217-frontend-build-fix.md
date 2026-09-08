# TEST-217 — Frontend production build

## What was wrong

`npm run build -w frontend` failed, and had done since the initial scaffold (TEST-150). The dev server and both test suites ran fine, so nothing exercised the production build and nobody noticed. `tsc -b` had therefore **never** completed successfully on this workspace — meaning no frontend work before this point had a genuine whole-project type check, only per-file checking through editors and the Vitest transform.

Three separate faults, surfacing in two stages because the compiler halts at the first.

### Stage 1 — `tsc -b` refused the project graph

```
vite.config.ts(7,3): error TS2769: Object literal may only specify known
  properties, and 'test' does not exist in type 'UserConfigExport'.
tsconfig.json(17,18): error TS6306: Referenced project 'tsconfig.node.json'
  must have setting "composite": true.
tsconfig.json(17,18): error TS6310: Referenced project 'tsconfig.node.json'
  may not disable emit.
```

- `frontend/vite.config.ts` imported `defineConfig` from `vite` while declaring a Vitest `test: {...}` block. Only `vitest/config`'s `defineConfig` types that key.
- `frontend/tsconfig.node.json` was listed in `tsconfig.json`'s `references` but set `noEmit: true` and lacked `composite: true`. A referenced project requires both. TS6306 and TS6310 are the same fault reported twice.

### Stage 2 — only visible once stage 1 was fixed

```
src/App.tsx(3,34): error TS5097: An import path can only end with a '.tsx'
  extension when 'allowImportingTsExtensions' is enabled.
```

Ten occurrences across `App.tsx`, `main.tsx`, `DesignSystemPage.tsx` and `Button.test.tsx` — all pre-existing scaffold code importing with explicit extensions. `frontend/tsconfig.json` was missing the flag.

## What changed

- `vite.config.ts` — `defineConfig` now imported from `vitest/config`.
- `frontend/tsconfig.node.json` — `composite: true` with `emitDeclarationOnly: true` and a dedicated `outDir`. That satisfies "must not disable emit" without emitting a `.js` twin of `vite.config.ts` into the source tree.
- `frontend/tsconfig.json` — `allowImportingTsExtensions: true`. No source files touched.
- Both configs pin `tsBuildInfoFile` so incremental-build caches do not land loose in `frontend/`.
- Root `package.json` — a `build` script covering both workspaces: `npm run build -w frontend && npm run build -w backend`.

No `strict` loosening, no `any`, no `skipLibCheck`.

## Why the root build script

The ticket left the form of its last acceptance criterion open — a script, or a documented command. A script was chosen because it is enforceable: something a session actually runs, rather than an instruction someone has to remember. The merge bar in `CLAUDE.md` now also requires the build to pass, so both halves exist.

## Verification

`npm run build -w frontend` exits 0 and emits to `frontend/dist/`. Root `npm run build` exits 0 for both workspaces. The frontend suite still passes and the dev server still serves, confirming the fix did not trade a broken build for broken tests.

Verified by **real exit code** — redirecting output to a file and checking `$?` — not by reading a tool's summary line. That matters here specifically: a command proxy filters output and has printed `TypeScript: No errors found` over a run that exited 1, which is how this fault survived from the scaffold in the first place.

No Playwright coverage: this is a build-config change with no screen and no user-facing behaviour, so there is nothing for an end-to-end test to assert beyond what the build step and the existing component test already cover.

## Known follow-up

The `tsBuildInfoFile` paths resolve relative to `frontend/`, but npm workspaces hoist `node_modules` to the repository root, so the intended cache directory does not exist and the artifacts still land in `frontend/`. `*.tsbuildinfo` is gitignored so they cannot be committed by accident, but the setting is not doing what it looks like it does.
