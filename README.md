# MealBox

Personal recipe box + shopping list app. Save recipes, generate a de-duplicated shopping list from them. Tracked as Beacon ticket [`TEST-71`](https://beacon.chro.media/browse/TEST-71); conventions live in [`CLAUDE.md`](./CLAUDE.md).

## Prerequisites

- Node.js v24+
- npm
- A local PostgreSQL server running

## Setup

```bash
npm install
createdb mealbox_dev
cp backend/.env.example backend/.env
```

`npm install` at the root installs all three workspaces (`frontend/`, `backend/`, `shared/`). `backend/.env` holds your local config — never commit it.

## Running

```bash
npm run dev
```

Runs frontend and backend together. Individually:

```bash
npm run dev -w frontend   # http://localhost:5173
npm run dev -w backend    # http://localhost:4000
```

## Verifying it's up

```bash
curl localhost:4000/api/health      # {"status":"ok"}
curl localhost:4000/api/health/db   # {"status":"ok"} — confirms Postgres is reachable
```

Then open `http://localhost:5173` (app) and `http://localhost:5173/design` (design system).

## Testing

```bash
npm test                     # both workspaces
npm run test -w frontend
npm run test -w backend
```

## Linting / formatting

```bash
npm run lint
npm run format
```

## Project structure

```
frontend/   Vite + React + TypeScript + Tailwind app
backend/    Express + TypeScript API
shared/     Types shared between frontend and backend
docs/       Written reference docs (e.g. the design system)
```

See [`CLAUDE.md`](./CLAUDE.md) for full conventions (folder layout, naming, testing, git, security).
