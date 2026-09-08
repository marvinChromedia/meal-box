# Running and deploying

## There is no deployment configuration

This repository has **no CI/CD pipeline, no container configuration and no deployment configuration**. There is no `.github/` directory, no Dockerfile, no `docker-compose.yml`, and no hosting-platform config.

Nothing here describes how to deploy MealBox, because nothing in the repository does. When deployment is set up, document it in this file. Do not follow or invent a deployment procedure that is not written down.

The story's definition of done mentions a staging environment; that environment does not exist yet, and the gap is real rather than an oversight in this document.

## Running it locally

Prerequisites: Node with npm workspaces support, and a running PostgreSQL.

```bash
npm install
```

Create `backend/.env` from the checked-in template:

```bash
cp backend/.env.example backend/.env
```

Variables, all of which the template lists with no real values:

| Variable            | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `PORT`              | Port the API listens on                           |
| `DATABASE_URL`      | Development database                              |
| `CORS_ORIGIN`       | The frontend origin the API accepts requests from |
| `TEST_DATABASE_URL` | Separate database for integration tests           |

`.env` is gitignored. Never commit a populated one.

Create the databases and apply the schema:

```bash
createdb recipe_box_dev
createdb recipe_box_test
npm run migrate:up -w backend
```

Run both packages together:

```bash
npm run dev
```

That starts the Vite dev server and the API side by side. Or run them separately with `npm run dev -w frontend` and `npm run dev -w backend`.

Check the stack is up by requesting `/health` on the API — it reports database connectivity, so a failure there means PostgreSQL is not reachable rather than the app being broken.

Visit `/design` in the running frontend for the live component gallery.

## Building

```bash
npm run build
```

Runs `tsc -b` and the production build for both workspaces. This is part of the definition of done: the dev server and the test suites can be green while the production build is broken, which is exactly what happened between the initial scaffold and TEST-217. Check the exit code, not the printed output — see [`testing.md`](./testing.md).
