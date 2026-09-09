# TEST-259 — Command to backfill default recipes for an existing account

## What changed

`npm run seed:recipes -w backend -- --email=<account email>` — a runnable command that gives an *existing* account the same default recipe set TEST-254 gives every new signup automatically. TEST-254 explicitly left this out (signup-time only); asked directly for the on-demand version afterward.

Two pieces, split so the logic is testable without going through a CLI process:

- `backend/src/services/seedRecipesForEmail.ts` — the actual logic. Looks the account up by email, compares its current recipe titles against `DEFAULT_RECIPES`, creates only what's missing, returns what it seeded vs. what was already there. Throws `UserNotFoundError` for an unknown email.
- `backend/scripts/seedRecipes.ts` — a thin wrapper: parses `--email=`, calls the function above, prints a plain-language result, sets a non-zero exit code and prints a clear message on failure, closes the pool. Not unit-tested itself (it's wiring, same as `src/index.ts` isn't) — the logic it calls is.

## Idempotent by design (AC2)

Re-running it against an account that already has some or all of the default titles only creates what's missing — matched by recipe title, not by "did this account get seeded before." This means it also does the sensible thing for an account that happens to already have a recipe with one of the default titles (leaves it alone, doesn't create a second one), not just for a literal re-run.

## Verification

- `test/unit/seedRecipesForEmail.test.ts` — unknown email throws and creates nothing; an account with none of the defaults gets all of them; an account with one already present gets only the rest, and both lists in the result are correct; an account with everything present gets nothing created.
- `test/integration/seedRecipesForEmail.integration.test.ts` — a real account (via `usersRepository.createUser` directly, not through registration) gets the real default set through `createRecipe`; running it a second time against the same account creates zero more rows; an unknown email is confirmed to write nothing at all (`SELECT count(*) FROM recipes` stays 0).
- **Ran the actual command**, not just the tests, against the real local dev database (`recipe_box_dev`, which already had two real accounts from earlier work): `npm run seed:recipes -w backend -- --email=admin@example.com` seeded all three; running it again reported all three as already present and the row count stayed at exactly three; a nonexistent email printed the clear message and exited 1. This is real, additive data left in `admin@example.com`'s account in the local dev database — harmless (it's a demo/admin account, and this is exactly what the command is for), but noting it for the record rather than leaving it undisclosed.
- Full backend suite: `npm run test:unit`, `test:contract`, `test:integration -w backend` — 15+3+8 = 26 files, 83+43+74 = 200 tests, all passing (this ticket added 2 unit test files' worth and 1 integration file — net +6 unit, +3 integration over TEST-254's count). `npm run lint`/`npm run build` from the repo root, both exit 0.

## No new endpoint, no frontend change

Exactly as scoped — this is an operator-run command, not user-facing.
