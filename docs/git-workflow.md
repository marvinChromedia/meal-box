# Git workflow

## Worktree per ticket

`main` is permanently checked out in the primary repository directory. Dev sessions work in their own `git worktree` checkouts, one per ticket:

```bash
git -C /path/to/learning-session-ai-integration \
  worktree add ../mealbox-worktrees/TEST-72 -b feat/TEST-72-recipe-crud
```

Never two sessions in one checkout. Branch names are `feat/<TICKET-KEY>-<slug>`, or `fix/<TICKET-KEY>-<slug>` for a bug — one branch per ticket, created off `main`.

**Never remove the worktree you are running in.** A session whose working directory disappears cannot be reached any more — it drops out of the project mid-flight, taking whatever it knew with it. Leave cleanup to the PM session, or move out of the directory first.

## If `git` is refused inside a worktree

A command proxy configured outside this repository rewrites `git ...` to `rtk git ...`. Inside a worktree that rewrite can then be refused by a worktree-isolation guard, because the guard cannot verify the rewritten command targets the worktree it is running in.

Call git by absolute path to skip the rewrite:

```bash
/usr/local/bin/git status
```

It is a tooling interaction, not a repository problem, and it does not change any of the rules below. Related: the same proxy filters command output — see the exit-code warning in [`testing.md`](./testing.md).

## Before committing

1. `git status`.
2. Read the complete diff.
3. Confirm only intended files changed.
4. Run the relevant tests and `npm run build` — check exit codes, see [`testing.md`](./testing.md).
5. Check for secrets.
6. Confirm every change belongs to your ticket.

## The commit

**One commit per ticket, documentation included.** However many steps the work took, squash before the branch is shared — a branch arrives as a single commit containing the code, its tests, the feature doc, and any reference-page updates the change triggered.

Never leave a `docs:` commit trailing behind an implementation. The change and its explanation are one unit: split them and a `git revert` removes the code while leaving documentation that still describes it.

- Subject: Conventional Commits with the ticket key, under ~72 characters — `feat(recipes): add recipe CRUD API (TEST-72)`.
- Body: a short bullet list **a non-engineer can read**. Say what the change does for the user; leave out file paths, function names and library choices. The same audience as the plain-language half of a ticket summary.
- **No `Co-Authored-By` trailer.** No tool attribution, no "generated with" footer.

Squash before a branch is shared, never after — rewriting history another worktree has already branched from strands that work.

## Merging to main

Post the ticket summary and set the ticket to Done **before** merging, not after.

```bash
git fetch origin
git rebase origin/main          # rebase; never merge main into your branch
# re-run the full suite AND the build here — this is the run that counts
git push origin <branch>:main
```

**Do not use `git checkout main && git merge --ff-only`.** It cannot work from a worktree: `main` is checked out in the primary directory and git refuses to touch a branch checked out elsewhere. The refspec push carries the same guarantee — git rejects it unless it is a fast-forward.

If the push is refused, `main` moved. Fetch, rebase, re-test, retry. **Never force-push `main`.**

Re-running the suite _after_ the rebase is the point: a green run before it proves nothing about the merged result. A rebase onto someone else's merged work may also bring new dependencies — run `npm install` before the tests, or an unresolvable import will look like a broken test.

Afterwards: add the merge commit SHA to the ticket summary, and tell the PM session it landed. The primary checkout's local `main` is stale until someone runs `git pull --ff-only` there.

## Order

Do not merge a branch whose dependencies are not yet in `main`. This is correctness, not permission — it is what stops a branch built against a stub landing before the thing it stubbed.

## Never

Discard or clean up another session's uncommitted work. `git reset --hard` without explicit instruction. Force-push. Rewrite or squash another session's commits. Resolve a conflict between two sessions' work by picking one without reading both — tell the PM session instead.
