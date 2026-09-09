# TEST-245 — Rename the project to MealBox

Renames the workspace packages and the databases from `recipe-box` / `recipe_box_*` to `mealbox` / `mealbox_*`, so the code, the databases, the documentation and the interface all use one name. No behaviour changes.

## What changed

| Area         | Before                                  | After                                |
| ------------ | --------------------------------------- | ------------------------------------ |
| Root package | `recipe-box`                            | `mealbox`                            |
| Workspaces   | `@recipe-box/{shared,frontend,backend}` | `@mealbox/{shared,frontend,backend}` |
| Imports      | 34 source files                         | rewritten                            |
| Databases    | `recipe_box_dev`, `recipe_box_test`     | `mealbox_dev`, `mealbox_test`        |
| Browser tab  | `Recipe Box`                            | `MealBox`                            |
| README title | `Recipe Box + Shopping List`            | `MealBox`                            |

The header already said "MealBox" — TEST-249 shipped that on the same decision.

## What deliberately did _not_ change

**"Recipe Box" as a screen name stays.** It appears in the header nav, the recipe-box page heading, and their tests. That is the name of a _feature within_ MealBox, not the product — the intended header reads `MealBox │ Recipe Box · Shopping List`. Renaming those would have renamed a screen and broken the agreed design. Only strings where the app names _itself_ moved to MealBox: the browser tab, the README title, and the design-system page's description.

**The working directory was not renamed**, and this was a deliberate scope reduction made by the coordinating session, not an oversight. Three reasons:

1. **It would have cut off every session's ticket access.** The `beacon-production` MCP connector is registered in the Claude config keyed to the literal folder path. Renaming the directory orphans that registration, and every session silently loses the ability to read or write tickets — the exact failure the conventions say to report immediately, self-inflicted, for no gain.
2. **It would have broken six git worktrees**, whose internal `gitdir` pointers reference that path, plus the working directory of five sessions.
3. **The folder is not named after the product.** It is `learning-session-ai-integration` — the exercise this project sits inside. The git repository is already `meal-box`. Renaming the folder to `mealbox` would have described its contents _less_ accurately.

**Renaming the repository on its host** remains outstanding and is a hosting action, not a code change. It is `meal-box`, which is consistent enough that nothing misleads.

## Old-name occurrences left on purpose

AC3 asks for these to be listed. Six files still mention the old names, all as historical record:

- `docs/features/TEST-155-api-client.md` and `TEST-153-recipe-selection.md` — state what those tickets _verified at the time_ about `@recipe-box/shared`.
- `docs/features/TEST-76-shopping-list-generation.md`, `TEST-253-recipe-ownership.md`, `TEST-259-seed-recipes-command.md`, `TEST-154-shopping-list-management.md` — describe what was observed in or done to `recipe_box_dev` / `recipe_box_test` at the time.

**The rule applied:** a feature doc is a record of what happened, so an old name reads correctly as history. A reference page hands a developer something to act on, so a stale name there is a trap. Everything in the second category was updated; `docs/backend.md` now carries the live database guidance under the new names, which is where a reader looking for current advice goes.

## The database step

`mealbox_dev` was created with `CREATE DATABASE mealbox_dev TEMPLATE recipe_box_dev`, which copies the contents. This mattered: the development database held 3 accounts, 6 recipes and a shopping list, including data seeded by TEST-259 and a schema drift repaired by hand in TEST-76. Verified after the copy — same row counts, and all 4 migrations recorded, so `migrate:up` has nothing to re-run.

`mealbox_test` was created empty, which is correct: `globalSetup` truncates and reseeds it at the start of every integration run.

**`recipe_box_dev` and `recipe_box_test` were left in place. Nothing was dropped.** Verified intact afterwards. Orphaned databases cost only disk, and anyone whose local `.env` still points at the old name keeps working rather than hitting a missing-database error they have to diagnose.

## What another developer has to do

`docs/deployment.md` now has an "If you already had this project checked out" section. Two steps do not happen by pulling:

- **`npm install`.** The workspace links in `node_modules` are named after the packages. Skip it and imports resolve to nothing, so every test fails in a way that looks like broken code rather than a stale install. This is the failure to expect.
- **`backend/.env`.** Gitignored, so a local one still points at `recipe_box_dev`. Both `DATABASE_URL` and `TEST_DATABASE_URL` need updating.

## Verification

Run in the worktree after `npm install`, with `TEST_DATABASE_URL` pointed at `mealbox_test`. Exit codes checked, not printed output.

| Check                                 | Result            |
| ------------------------------------- | ----------------- |
| `npm run lint`                        | exit 0            |
| `npm run build`                       | exit 0            |
| `npm test -w frontend`                | exit 0, 134 tests |
| `npm run test:unit -w backend`        | exit 0, 83 tests  |
| `npm run test:contract -w backend`    | exit 0, 43 tests  |
| `npm run test:integration -w backend` | exit 0, 74 tests  |

Plus: zero `@recipe-box` references remain in source or the lockfile; the `node_modules/@mealbox` scope resolves to all three workspaces and the old scope is gone; both new databases exist alongside both old ones.

No end-to-end test owed — nothing a user can do changed. Note that `test:contract` needs `TEST_DATABASE_URL` despite asserting only schema shapes; that is unrelated to this change and is TEST-251's to resolve.

## Note on who did this

Implemented by the coordinating session rather than a dev session, which is a departure from the usual split. None of the five dev sessions were reachable at the time — six delivery attempts went unanswered — and the alternative was leaving a requested ticket unstarted. It is a mechanical rename with no design decisions in it, which is the least costly kind of work to handle this way. The one judgment call in it, dropping the folder rename, is written up above rather than left implicit.
