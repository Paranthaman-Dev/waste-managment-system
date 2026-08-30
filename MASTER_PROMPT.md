# Master Prompt — Waste Management Platform

Unified spec distilled from `handoff.md`, `README.md`, `package.json`, and `CHECK.md` Actual Goal (7 bullets).
Standalone source of truth for stack, roles, auth, workflows, data/maps, constraints, and done criteria.
No secrets — placeholder env only (`dev-secret-change-in-production` in `.env.example`).

## Stack

- **Backend:** FastAPI 0.111 + SQLModel 0.0.21 + Pydantic 2.7 + SQLAlchemy 2.0 (async)
  - Uvicorn 0.30, async engine `app/db/session.py`, bootstraps `SQLModel.metadata.create_all`
  - `backend/app/main.py` mounts routers `auth/user/collector/recycler/management` + `GET /health`
- **DB:** PostgreSQL 16 prod / SQLite+aiosqlite dev
  - Prod: `docker.io/library/postgres:16-alpine`, DSN `postgresql+asyncpg://waste_user:waste_pass@localhost:5432/waste_management`
  - Dev: `sqlite+aiosqlite:///./test.db` (auto-create tables, no external service)
  - Migrations: `backend/alembic/` + `alembic.ini` env imports models; `alembic upgrade head` → 9 tables + 3 enums
- **Auth libs:** `python-jose[cryptography]` 3.3 HS256 JWT + `passlib[argon2]` 1.7 + `slowapi` 0.1.9
  - Argon2 `get_password_hash`/`verify_password` in `core/security.py`, no OAuth/SSO, no Redis
- **Frontend:** React 19 + Vite 8.2 + Tailwind 4 + Leaflet/OSM
  - OSRM `router.project-osrm.org` `/route`+`/trip` `roundtrip=false source=first`, no key, timeout 8s
  - Single portal `apps/web:5173` + shared `packages/shared` (`@wm/shared`) `tokens.css`/`BinMap`/`RouteMap`/`AppShell`/`AuthPage`
- **Monorepo:** npm workspaces `apps/*` + `packages/*` (root `package.json:2.0.0` `type:module`)
  - Scripts: `build` → `build -w @wm/web`, `dev -w @wm/web`, `typecheck` (`tsc --noEmit`)
  - Node 20+, Python 3.12+ (3.14 verified), alias `vite.config.ts` `find:/^@wm\\/shared$/` + `tsconfig.base.json`
- **Deploy:** Podman + `podman-compose.yml` (services `postgres` + `backend`)
  - `backend/Containerfile` `python:3.12-slim` + `gcc`/`libpq-dev`, frontend local via `npm run dev`
  - `start.sh` venv+deps+postgres healthcheck+uvicorn+portal; `frontend/Containerfile` after scaffold
- **Testing/QA:** `pytest` 8.2 + `pytest-asyncio` + `pytest-cov` + `faker` + `reportlab`/`openpyxl`
  - `ruff --select F401` clean, `py_compile` clean, `tsc` 0 errors, `vite build` 1886 modules ~499kB

## Roles

- **Resident / User (`user`)** — self-registers via `POST /auth/register`
  - JSON `username,password,role=user` → 201; dashboards: Overview / New Request / My Requests / My Rewards / Disposal Sites / Account
  - Read-only `GET /user/bins` with waste-type filter + `BinMap`; demo `user1/user123`
- **Collector (`collector`)** — provisioned by Management via `POST /management/users` (no self-register)
  - Dashboards: Queue / My Route / Schedule; `GET available|assigned`, accept/decline, `PATCH status`
  - `RouteMap` bins + numbered pickups + OSRM polyline (truck `#2563EB` bin `#10B981` bag `#ff4d00`); demo `collector1/collector123`
- **Recycler (`recycler`)** — provisioned by Management
  - Available Batches / My Batches / Plant Analytics; browse/request/accept, patch status, `POST proof` → `uploads/proofs`
  - Demo `recycler1/recycler123`
- **Management / Admin (`management`)** — seeded `seed.py`/`seed_demo.py` (`admin/admin123`)
  - Overview / Disposal Sites / Users / Rewards & Vouchers / Audit Log / Reports
  - CRUD users/collectors/recyclers, `CRUD /management/bins` map click/drag, audit logs, CSV/PDF `uploads/reports`
- Single `AuthPage` on `:5173` with demo chips routes by JWT `role`; legacy 4-port on `four-separate-login-panel-model`
  - `GET /health` unauthenticated `{"status":"ok"}`, `VITE_API_URL` default `http://localhost:8000`, CORS `*`

## Auth

- Username/password only; Argon2 hashing `core/security.py`, env `JWT_SECRET_KEY`/`JWT_ALGORITHM=HS256`
  - `ACCESS_TOKEN_EXPIRE_MINUTES=30`, `REFRESH_TOKEN_EXPIRE_DAYS=7` (placeholders in `.env.example`)
- Login `POST /auth/login` JSON `{username,password}` → `{access_token, refresh_token, role, token_type}`
  - Access 30m + refresh 7d, `jti` claim for revocation; stored `localStorage` `wm_access_token/wm_refresh_token/wm_role`
- Refresh `POST /auth/refresh` `{refresh_token}` → new pair + revokes old `jti`
  - Logout `POST /auth/logout` revokes `jti`; `GET /auth/me` + password change; `decode_token`+`is_token_revoked` per request
- Rate limiting: `Limiter(get_remote_address)` + `SlowAPIMiddleware` + `RateLimitExceeded→429` (`main.py:19`)
  - `@limiter.limit("5/minute")` on `auth.py:51` login → verified 5×401 `Incorrect username or password` then 429 `Rate limit exceeded` via sequential `curl`
- RBAC: `api/deps.py:get_current_user` + `require_roles(...roles)` + guards `require_user/collector/recycler/management`
  - All `/user`, `/collector`, `/recycler`, `/management` routers protected; live test `POST /management/bins` user→403 vs management→201

## Core Workflows

- **Resident:** profile GET/PUT, `POST /user/pickups` (parses `location` fallback `"lat,lng"` → lat/lng)
  - Enforces 429 after 5 active, list history/status, analytics, read-only bin map + waste-type filter, rewards/redemptions
- **Collector:** profile, `GET /collector/pickups/available|assigned`, accept/decline (`SELECT ... FOR UPDATE` tx), `PATCH status`
  - Schedule view, `GET /collector/bins` read-only, `RouteMap` bottom `height 340` + Locate me/fullscreen + 250m corridor
- **Recycler:** profile, `GET /recycler/batches` browse/request/accept, `PATCH batch status`
  - `POST proof upload` → `uploads/proofs`, analytics; `GET /recycler/bins` context
- **Management:** dashboard summary, CRUD users/collectors/recyclers (`POST /management/users` + list)
  - `CRUD /management/bins` via map click/drag pin (lat/lng + metadata), `GET /management/audit-logs`, `POST /management/reports` CSV/PDF → `uploads/reports` + listing, vouchers admin
  - Frontend all wired via `VITE_API_URL` real fetches, no permanent mocks (build 68 modules ok)

## Data & Maps

- **Models `backend/app/models/__init__.py`:** `users` (username unique), `collectors`/`recyclers` 1:1 users
  - `collectors` has no `vehicle_type`; `public_bins` has no `status`/`condition` (fields `latitude/longitude`,`waste_type`,`capacity`,`location_name`)
  - `pickup_requests` (user→collector FK), `waste_batches` (collector→recycler), `audit_logs`, `reports`, rewards/balances; JSON list cols, `created_at`
  - FK enforced (verified `psql` FK constraints + `ForeignKeyViolationError` on bad insert `INSERT ... 99999`)
- **Migrations:** `backend/alembic/` + `alembic.ini` (`env.py` imports models)
  - `alembic upgrade head` creates 9 tables + 3 enums (`0001_initial_schema` + `0002_rewards`); `alembic_version` tracked
  - `create_all` fallback for SQLite/fresh DB
- **Maps:** Leaflet/OSM `BinMap` (editable management, read-only resident/collector) + `RouteMap`
  - Bins + pickups, OSRM fallback straight line, OSM tiles, bottom placement, `editable=false` resident picker fix
  - Bins persisted via `GET /management/bins` + `GET /user/bins`; survive `waste-postgres` restart (`postgres_data` volume)
- **Uploads:** `UPLOAD_DIR` env (`/app/uploads` container, `./uploads` local), auto subdirs `proofs`/`reports`, static mount `/uploads`
  - Persist via `upload_data` volume; overridden to `/tmp/...` in tests; `.gitignore` excludes `uploads/`
- **API contracts:** Pydantic/SQLModel schemas `app/schemas/__init__.py`; malformed → 422 per role; CORS `allow_origins=["*"]`

## Constraints

- Stack fixed: FastAPI, PostgreSQL, JWT+Argon2, Podman, React/Vite/Tailwind, Leaflet/OSM — do not change
- No paid cloud, no Redis/MinIO/OAuth/SSO; Podman-compatible only (no Docker-only features)
- Preserve `app/api/*`, `app/models`, `app/schemas`, `app.db.session:engine`, `backend/Containerfile`, `podman-compose.yml`
- Preserve `UPLOAD_DIR` + `uploads/proofs|reports` structure, JWT secret handling (env value only), `slowapi` 5/min/IP
- Public bin model + required fields unchanged; existing routers/endpoints not removed; schema via migrations only
- No secrets in repo: `.env` ignored (placeholder `dev-secret-change-in-production` in `.env.example`), no API keys pasted; `grep` verified
- Frontend single-portal `apps/web:5173` shared via `packages/shared` alias (`vite.config.ts` + `tsconfig.base.json` + `exports` map); no permanent mocks

## Acceptance Criteria

- End-to-end workflows functional with real backend persistence (not disconnected APIs/placeholder UI/mocked flows)
  - Resident pickup→collector queue/route→recycler batch→admin overview all live
- Auth/RBAC verified: register 201, login 200 pair, refresh 200 rotation + old `jti` revoked, logout revoke, 401 unauth, 403 role reject; `pytest` + live `curl` pass
- DB migration-managed: `alembic upgrade head` + `psql \dt` 9 tables + FK enforced + `alembic_version` checked
- Public-bin map: management click/drag create/edit/delete + resident/collector read-only + filter + persistence after reload/`podman` restart (`GET /user/bins` == `GET /management/bins`)
- Uploads/proofs/reports persist via named volumes across restart
- Quality: `python -m py_compile` clean, `ruff --select F401` clean, `tsc --noEmit` 0 errors, `vite build` 1886 modules ~499kB gzip 140kB, `pytest` 20/20 pass
- Podman: `cp .env.example .env && podman-compose up -d postgres` healthy; `DATABASE_URL=... uvicorn backend.app.main:app --port 8001` health 200; `npm run dev -w @wm/web` on `:5173`
- Docs: `README.md` (stack, quick-start SQLite, demo creds), `handoff.md`, and this `MASTER_PROMPT.md` present and consistent
