# Waste Management System

Role-based waste management platform built as an npm workspaces monorepo: **unified single-port portal** (`apps/web` on `:5173`) serving all roles (resident / collector / recycler / admin) via one login panel, sharing a common design-system + API package. Previous 4-port model is preserved on branch `four-separate-login-panel-model`.

## Stack

- Backend: FastAPI, SQLModel, SQLite (dev) / PostgreSQL (prod), asyncpg
- Auth: username/password, Argon2 password hashing, JWT access and refresh tokens (resident-only self-registration; other roles provisioned by admin)
- Frontend: React 19, Vite, Tailwind CSS 4, Leaflet/OpenStreetMap — unified portal `apps/web`
- Workspaces: npm, `apps/web` + `packages/shared` (shared UI & API layer)

## Monorepo layout

```
waste-management/
├─ apps/
│  └─ web/        → http://localhost:5173   (all roles via one login panel)
├─ packages/shared/  @wm/shared — design tokens, UI primitives, API client, auth, map
├─ backend/          FastAPI app
└─ package.json      workspace root (scripts below)
```

## Features

- **Resident** — request pickups, track request status, view disposal sites map.
- **Collector** — browse available requests, add to route, update pickup status, view drop‑off sites.
- **Recycler** — claim/process waste batches, upload proof images, view plant analytics.
- **Management (Admin)** — city dashboards, manage disposal sites on a map, manage user accounts, audit log, CSV report exports.

## Prerequisites

- Node.js 20+ and npm
- Python 3.12+ (`3.14` works with current pins)
- Podman/podman-compose only if you run PostgreSQL; dev mode uses SQLite.

## Quick start (SQLite, no containers)

```bash
# 1. Install workspace dependencies
npm install

# 2. Seed demo users for every role
DATABASE_URL="sqlite+aiosqlite:///./test.db" JWT_SECRET_KEY=supersecretkey \
  PYTHONPATH="$PWD/backend:$PWD" ./.venv/bin/python -m app.db.seed_demo

# 3. Backend on :8000
DATABASE_URL="sqlite+aiosqlite:///./test.db" JWT_SECRET_KEY=supersecretkey \
  ./.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

# 4. Unified portal (single port for all roles)
npm run dev -w @wm/web     # :5173 — login as any role on one panel
```

## Demo Credentials

`./.venv/bin/python -m app.db.seed_demo` seeds one account per role (all on the **same portal** `:5173`):

| Role      | Username     | Password     | Portal |
|-----------|--------------|--------------|--------|
| Resident  | `user1`      | `user123`    | :5173  |
| Collector | `collector1` | `collector123`| :5173 |
| Recycler  | `recycler1`  | `recycler123`| :5173 |
| Admin     | `admin`      | `admin123`   | :5173  |

The single login panel shows these as one‑click demo chips. Only residents can self-register via `Create account`; collectors/recyclers/admins are provisioned by an admin under **Users → Provision Account**.

## Scripts (root `package.json`)

```bash
npm run build              # build unified portal to apps/web/dist
npm run dev -w @wm/web     # run unified portal dev server on :5173
npm run typecheck          # typecheck all workspaces
```

Backend runs from the root `./.venv` (see `start.sh` for the full bootstrap).

## Backend Development

```bash
python3.12 -m venv venv
venv/bin/pip install -r backend/requirements.txt
PYTHONPATH=backend UPLOAD_DIR=/tmp/waste-management-uploads venv/bin/python -c "from app.main import app; print(app.title)"
```

Run tests:

```bash
PYTHONPATH=backend UPLOAD_DIR=/tmp/waste-management-test-uploads venv/bin/pytest backend/tests
```

## Migrations

Alembic lives in `backend/alembic`, configured via `backend/alembic.ini`.

```bash
cd backend
alembic -c alembic.ini upgrade head
```

## Notes

- Proof images and generated reports are served from `$UPLOAD_DIR` (default `./uploads`).
- No Redis, MinIO, OAuth, SSO, or paid cloud services are required.
