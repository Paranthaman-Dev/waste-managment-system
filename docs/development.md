# Development — Setup, Scripts, Testing

## Prereqs

- `Node 20+` `npm 10+` `Python 3.12+` (`3.14` ok) `Podman 4+` `podman-compose` (`pip install podman-compose`) optional.

## Install

```bash
npm install
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt "pydantic[email]" python-multipart
cp .env.example .env
```

## Scripts

| Command | What |
|---------|------|
| `npm run dev -w @wm/web` | Vite `:5173` `proxy /auth → :8000` `allowedHosts:true` |
| `npm run build` | `vite build` `1888 modules` `dist/index.html 2.25kB` |
| `npm run typecheck` | `tsc --noEmit` `0 errors` |
| `./start.sh` | venv + `alembic upgrade` + `seed` + `uvicorn :8000 --reload` + `vite :5173` + `caddy :8080` |
| `./start.sh --sqlite` | `DATABASE_URL sqlite+aiosqlite:///./test.db` |
| `./start.sh --postgres` | `podman-compose up -d postgres` + `localhost:5432` |
| `PYTHONPATH=backend pytest` | `20 passed` |
| `podman-compose -f podman-compose.yml up -d --build` | prod-like `:8080` single-port |

## Backend Dev

```bash
PYTHONPATH=backend UPLOAD_DIR=/tmp/uploads .venv/bin/uvicorn app.main:app --reload --port 8000
PYTHONPATH=backend .venv/bin/python -m app.db.seed_demo # 5 users + 4 pickups + 6 bins + 5 vouchers
PYTHONPATH=backend .venv/bin/pytest backend/tests -v
```

## Frontend Dev

`apps/web vite.config.ts:16 manualChunks(id) → react-vendor|leaflet|charts` `chunkSizeWarningLimit:600` `alias ^@wm/shared$ → packages/shared/src`.

`packages/shared` `BinMap.tsx:28 pickupPinIcon` `ResidentDashboard.tsx:528 pickupPin` `ManagementDashboard.tsx:652`.

## Testing

- `backend/tests/` `conftest.py` `AsyncSession` `test_auth_security` `test_rbac_and_bins` `test_reward_hardening` `test_rewards` `20 passed`.
- `webapp-testing` skill `scripts/with_server.py` `playwright` `sync_playwright` `networkidle` `screenshots`.
- `podman ps` `curl :8000/health` `curl :8080/user/bins` `GET /recycler/analytics/summary 25kg`.

## Migrations

`backend/alembic` `alembic -c alembic.ini upgrade head` (`env.py:13` `settings.DATABASE_URL` `NullPool`) `versions/0001_initial_schema` `0002_rewards`.
