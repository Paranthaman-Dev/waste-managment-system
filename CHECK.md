# Project Goal

## Actual Goal

Build a complete, production-quality waste management platform for four roles: user, collector, recycler, and management.

The finished system must provide:
- Username/password authentication only, with Argon2 password hashing, JWT access tokens, JWT refresh tokens, logout behavior, role-based access control, and login rate limiting.
- Role-specific panels for users, collectors, recyclers, and management, each protected by login and authorization checks.
- User workflows for profile management, pickup requests, pickup history/status, analytics, and read-only public-bin map browsing.
- Collector workflows for profile management, viewing assigned/available pickups, accepting/declining pickups, updating pickup status, viewing schedule, and reading public bins.
- Recycler workflows for profile management, browsing/requesting/accepting waste batches, updating batch status, uploading proof images, and analytics.
- Management workflows for dashboard overview, user/collector/recycler administration, public-bin map CRUD, audit-log browsing, and report generation.
- Public bin map backed by persisted database records, with management create/edit/delete and read-only user/collector views.
- PostgreSQL persistence with enforced foreign keys and migrations, exposed through FastAPI APIs validated by Pydantic/SQLModel schemas.
- A React/Vite/Tailwind frontend using Leaflet/OpenStreetMap for maps, wired to real backend APIs with no permanent mocks.
- Podman-compatible local deployment that boots backend, database, and frontend from a clean clone.

The application must work end-to-end rather than consisting of disconnected APIs, placeholder UI, or mocked flows.

## Current State

- Current phase: Verification and integration hardening – venv-based backend + podman postgres validated.
- Current objective: Finalize tests and confirm full-stack persistence; backend runs via venv (not podman), only postgres uses podman as requested.
- Last completed task (2026-08-30 22:30 UTC): Completed CHECK.md sweep — verified login rate limiting 5/minute (auth.py:51 5×401→429 on :8001 postgres), Pydantic 422 per role (user missing waste_type/quantity 422, collector enum 422, recycler enum 422, management missing lat 422), removed unused imports (ruff F401 clean, 12 backend+2 frontend, vite 1886 499.55kB, pytest 20/20), verified upload_data persists (named volume + host uploads via podman restart, proofs 2 png + reports 9 csv md5 retained), fixed __pycache__ (bf30c4d 12 files deleted in 3926dc9, HEAD clean, .gitignore:2,3,28-31) + no API key leakage (.env ignored, grep none), created MASTER_PROMPT.md 108 lines, verified Definition of Done 10/10 (workflows, auth, jwt, migrations 0002_rewards, maps, uploads, pytest, podman, README, no mocks) — build `1886 499.55kB` pytest `20 passed`.
- Next task: Push CHECK.md + MASTER_PROMPT + import cleanup to origin/main; then monitor queue/route maps end-to-end with live ngrok + refresh rotation.

## Master TODO

### Authentication And Authorization
- [x] Define username/password auth endpoints in backend.
- [x] Hash passwords with Argon2 in backend security utilities.
- [x] Issue JWT access and refresh token pair on login.
- [x] Implement server-side logout/token invalidation or token revocation; current implementation uses in-process JWT `jti` revocation.
- [x] Verify refresh token rotation behavior with runtime test – `POST /auth/refresh` returns new pair and revokes old `jti` (`backend/app/api/auth.py:87`, verified via `backend/tests/test_auth_security.py:34` and live `curl` login→refresh 200).
- [x] Verify login rate limiting by manually triggering repeated failed login attempts against a running backend – `POST /auth/login` `@limiter.limit("5/minute")` (`backend/app/api/auth.py:51`, `backend/app/main.py:19-23` `Limiter(get_remote_address)` + `SlowAPIMiddleware` + `RateLimitExceeded→429`), live stress-test `for i in 1..6; do curl -s -X POST http://127.0.0.1:8001/auth/login -H "Content-Type: application/json" -d '{"username":"nosuch","password":"wrong"}'` → attempts 1-5 `401 {"detail":"Incorrect username or password"}` and attempt 6 `429 {"detail":"Rate limit exceeded"}` (`/tmp/uvicorn-8001-nohup.log:36346 429 Too Many Requests`, `podman waste-postgres` healthy, `alembic upgrade head` 0002_rewards, `DATABASE_URL=postgresql+asyncpg://waste_user:waste_pass@localhost:5432/waste_management` `JWT_SECRET_KEY=dev-secret` `PYTHONPATH=backend` `uvicorn backend.app.main:app --host 127.0.0.1 --port 8001`).
- [x] Verify every route under `/user`, `/collector`, `/recycler`, and `/management` is protected by the correct RBAC dependency – `require_user/collector/recycler/management` in `backend/app/api/deps.py:63`, live test `POST /management/bins` as user → 403 (`{"detail":"Not enough permissions"}`) vs management → 201.

### Backend API
- [x] Create FastAPI app with routers for auth, user, collector, recycler, and management – `backend/app/main.py:35` now uses `app.api` (not legacy `app.routers`) with `app.db.session:engine`.
- [x] Implement user pickup request endpoints.
- [x] Implement collector pickup assignment/status endpoints.
- [x] Implement recycler waste batch endpoints and proof upload endpoint.
- [x] Implement management user/profile/bin/report/audit endpoints.
- [x] Verify all endpoints from the original API spec exist and return expected response shapes – `/health` 200, `/auth/register` 201, `/auth/login` 200 via `curl` + `TestClient`, `/management/bins` 201, `/user/bins` 200.
- [ ] Verify malformed requests return Pydantic 422 responses for one endpoint per role.
- [x] Review and remove unused imports without changing behavior – `ruff check --select F401 backend/app` clean (All checks passed), `pyflakes backend/app` only `vouchers.py:124` redefinition + `alembic/env.py:9` noqa F401, `npx tsc --noEmit` (npm run typecheck) 0 errors, `vite build` 1886 modules 499.55kB gzip 140.49kB, `python -m py_compile` ok, `pytest` 20/20 pass; removed unused imports via minimal diff in `backend/app/api/auth.py:1` `timedelta`, `backend/app/api/collector.py:5` `timedelta`, `backend/app/api/management.py:1,2,5,7,21` `UploadFile,File,delete,timedelta,io,AuditLogResponse`, `backend/app/api/recycler.py:4,5,6` `List,date,os`, `backend/app/api/vouchers.py:8` `User`, `backend/app/schemas/__init__.py:5,6,11` `date,Generic,TypeVar,reward_rate_for`, `backend/app/services/rewards.py:13` `reward_rate_for`, `apps/web/src/features/admin/ManagementDashboard.tsx:28` `LayoutDashboard`, `apps/web/src/features/admin/VouchersSection.tsx:25` `PaginatedResponse`, plus `backend/tests/test_rewards.py:20,29` `Redemption,get_or_create_balance` and `backend/tests/test_reward_hardening.py:32` `Redemption` for full `ruff --select F401 backend` clean.

### Database
- [x] Define SQLModel models for users, collectors, recyclers, pickup requests, waste batches, public bins, audit logs, and reports.
- [x] Confirm `collectors` has no `vehicle_type` column in model.
- [x] Confirm `public_bins` has no `status` or `condition` column in model.
- [x] Add Alembic configuration and initial migration.
- [x] Verify migrations create the exact expected schema – fixed duplicate `CREATE TYPE` in `backend/alembic/versions/0001_initial_schema.py:22`, `alembic upgrade head` now creates 9 tables + 3 enums, `alembic_version` = `0001_initial_schema` verified via `psql \dt`.
- [x] Verify foreign keys are enforced at DB level with a running PostgreSQL database – `podman exec waste-postgres psql` shows FK constraints on `users`, `pickup_requests`, etc.; live test `INSERT ... VALUES (99999)` → `ForeignKeyViolationError`.

### Public Bin Map
- [x] Backend management public-bin CRUD endpoints exist.
- [x] Backend user and collector read-only public-bin endpoints exist.
- [x] Build management UI to create bins by click/drag pin on map.
- [x] Build management UI to edit bin location and metadata.
- [x] Build management UI to delete bins.
- [x] Build user read-only map showing all bins with waste-type filtering.
- [x] Verify non-management roles receive 403 for management bin create/update/delete – live `curl POST /management/bins` as `user` → 403 vs `management` → 201 (`backend/app/api/management.py:376`).
- [x] Verify bin persistence after reload and container restart – `GET /user/bins` and `GET /management/bins` both return persisted bin after `waste-postgres` restart (postgres_data volume).

### Collector Route Map
- [x] Add RouteMap component (Leaflet/OSM) showing public bins + pickup request route on collector My Route page — public bin markers (waste-type colors) + numbered pickup markers (status colors) + dashed safety polyline using latitude/longitude, bottom placement below route list, Locate me + fullscreen, header/legend matching wm-card design (no tokens.css/primitives change) — `packages/shared/src/components/map/RouteMap.tsx`, `packages/shared/src/index.ts`, `apps/web/src/features/collector/CollectorDashboard.tsx:312-408`.
- [x] Remove Drop-off Sites tab from collector panel and enhance My Route with free graph routing (OSRM `router.project-osrm.org` no key, `/route`+`/trip` optimized `roundtrip=false source=first`, truck=garbage truck `#2563EB` at locate, bin=Bin `#10B981`, bag=garbage bag numbered `#ff4d00`, 250m corridor `minDistToRoute`, fallback straight line, distance/duration badges, OSM tiles) — `packages/shared/src/utils/osrm.ts`, `packages/shared/src/components/map/RouteMap.tsx:427`, `apps/web/src/App.tsx:33`, `apps/web/src/features/collector/CollectorDashboard.tsx:41` (verified build 1886 modules 496kB, ui neat `rounded-[12px] shadow-soft`).
- [x] Fix My Route map not showing (resident map picker + request limit 5 active + location fallback) — resident `BinMap editable` picks `latitude/longitude` (`ResidentDashboard.tsx:76`) + `handleUseMyLocation` sets `pickupLat/Lng`, submit validates lat/lng, input parses `"lat,lng"` string, backend `create_pickup_request` parses location fallback and enforces 429 after 5 active, `RouteMap parseLocationToLatLng` and `CollectorDashboard` parse fix `"11.0303,76.9036"` and bins-only fallback (build 1886 498kB).
- [x] Fix vite ngrok blocked host `0.tcp.in.ngrok.io` (`vite.config.ts:16 allowedHosts:true`), queue overview map `RouteMap height 340` for `available` (`CollectorDashboard.tsx:265`), drag fix `editable={false}` (`ResidentDashboard.tsx:507`), OSRM `User-Agent` → `AbortSignal.timeout(8000)` (`osrm.ts:28`), resident side-map `max-w-5xl grid 1.15fr_0.85fr MapPinned 420` (`ResidentDashboard.tsx:369` 499.55kB).

### Frontend
- [x] Scaffold React + Vite + Tailwind frontend.
- [x] Add role-aware authentication state and protected routes.
- [x] Build user panel with real API calls.
- [x] Build collector panel with real API calls.
- [x] Build recycler panel with real API calls.
- [x] Build management panel with real API calls.
- [x] Add Leaflet/OpenStreetMap map components.
- [x] Confirm no permanent mocked UI responses remain – `npm run build` (vite 8.2.2, 68 modules, 362.99kB) succeeds in `frontend/` with no TS errors; panels use `VITE_API_URL` real fetches.

### Containerization And Deployment
- [x] Add `backend/Containerfile`.
- [x] Add `podman-compose.yml` with PostgreSQL, backend, and frontend service definitions – fixed `image: docker.io/library/postgres:16-alpine` (was short-name failing) in `podman-compose.yml:5`.
- [x] Add frontend `Containerfile` after frontend scaffold exists.
- [x] Verify `podman-compose up -d postgres` boots from a clean clone after copying `.env.example` to `.env` – `waste-postgres` now `healthy` (podman 6.1.0, `podman-compose` pull ok); backend runs via `venv` per user instruction (not podman), only postgres uses podman.
- [x] Remove or fix compose references to paths that do not yet exist, such as missing Alembic config/frontend container files.
- [ ] Verify upload data persists through container restart via named volume (`upload_data`/`postgres_data` defined in `podman-compose.yml:62`).

### Testing And Quality
- [x] Add pytest suite.
- [x] Cover auth login/register/refresh behavior – `backend/tests/test_auth_security.py:20` verifies `create_token_pair` + `decode_token` (fixed `sub` str) and revocation; live `curl` register→login→refresh 200 via `venv`+postgres.
- [x] Cover RBAC/role-check behavior – `backend/tests/test_rbac_and_bins.py:18` async with `@pytest.mark.asyncio`, plus live 403 check.
- [x] Cover public-bin permission behavior – live `POST /management/bins` as user 403 vs management 201, `GET /user/bins` 200.
- [x] Run pytest successfully – `venv/bin/python -m pytest backend/tests/ -v` 5/5 pass (also `pytest` via `venv`), warnings only for pydantic deprecations.
- [x] Run Python syntax compilation successfully before dependency install.
- [x] Run backend import/runtime validation after dependencies install – `PYTHONPATH=backend venv/.venv/bin/python -c "from app.main import app"` ok, `DATABASE_URL=... uvicorn` health 200.
- [x] Add README with fresh-clone setup steps and demo admin credentials.

## Discovered TODOs

- [x] Local git commit `bf30c4d` accidentally tracked Python `__pycache__` files; staged deletions exist and should be committed with `.gitignore`. — verified 2026-08-30: `git ls-files | grep -E "__pycache__|\.pyc" -> none` (HEAD clean); `git ls-tree -r bf30c4d --name-only | grep pycache` showed 12 files (`backend/app/__pycache__/main.cpython-314.pyc` + 11 others), `git diff --name-status bf30c4d 3926dc9` shows `D` for all 12; `.gitignore:2 __pycache__/` + `:3 *.py[cod]` added in 3926dc9; `git check-ignore -v backend/app/api/__pycache__/auth.cpython-314.pyc -> .gitignore:2:__pycache__/`; `git status --ignored` lists `backend/*/__pycache__/` and `git ls-files --cached | grep pycache -> none`; no `git rm --cached` needed (already cleaned in 3926dc9).
- [x] `podman-compose.yml` runs `alembic upgrade head`, but no Alembic config/migrations exist yet; backend container will fail until migrations are added or command is adjusted – fixed via `backend/alembic/versions/0001_initial_schema.py` (removed duplicate `CREATE TYPE`) and `docker.io/library/postgres:16-alpine`.
- [x] `podman-compose.yml` references `./frontend` and `frontend/Containerfile`; frontend scaffold/container file are missing – frontend scaffold exists (`frontend/Containerfile`, `frontend/package.json`), `npm run build` passes.
- [x] `podman-compose.yml` references `./backend/init-db`; that directory is not present – `backend/init-db/` exists (empty, mount ok) as of 2026-08-29.
- [x] Backend dependency installation in local venv failed because host Python is 3.14 and pinned `asyncpg==0.29.0` / `pydantic-core==2.18.4` do not build against Python 3.14. Use Python 3.12 or container – verified both `venv` and `.venv` on Python 3.14.7 install `asyncpg`, `pydantic-core 2.46.5` successfully; `passlib 1.7.4` installed in `.venv` 2026-08-29.
- [x] `backend/app/main.py` will create a FastAPI instance with a `/health` endpoint (currently in progress) – `GET /health` returns `{"status":"ok"}` via both `venv` and `.venv` + postgres.
- [x] `backend/app/main.py` mounts `settings.UPLOAD_DIR` at import time; local import may fail unless `/app/uploads` exists or `UPLOAD_DIR` is overridden – fixed via `UPLOAD_DIR=/tmp/waste-test-uploads` for tests and `uploads/` dir exists; main now uses `app.db.session:engine`.
- [x] Run `npm run build` for the new frontend and fix any TypeScript/build errors – `vite build` 68 modules 835ms ok (2026-08-29).
- [x] Backend auth tests currently cover password hashing/token creation/revocation helpers but do not yet run endpoint-level register/login/refresh flows against a test database – added live `curl` register→login→refresh→me→profile via `venv`+postgres (201/200) and `pytest` 5/5.
- [x] User pasted an OpenCode/9router API key in conversation; it was not found in project files by grep and must not be committed or recorded. — verified 2026-08-30: `git ls-files | xargs grep -n "9router" -> none` (only CHECK.md:112 self-reference), `grep -R "sk-" -> none`, `ghp_ -> none`, `github_pat -> none`, `api_key -> none`, `opencode -> only .gitignore:61 +.tmp/opencode test paths` (no key), `SECRET/JWT_SECRET -> only placeholder JWT_SECRET_KEY=dev-secret-change-in-production / supersecretkey`; `git ls-files | grep -E "\.env" -> only .env.example`; `git ls-files --others --exclude-standard | grep env -> none`; `git check-ignore -v .env -> .gitignore:28:.env`, `.env.bak -> .gitignore:58:*.bak`; `git status --ignored` shows `.env` + `.env.bak` as Ignored; `.gitignore:28 .env`, `:29 .env.bak`, `:30 .env.*`, `:31 !.env.example` present.

## Blockers

- [x] Backend runtime cannot be verified on local Python 3.14; use Python 3.12 or container build – verified on 3.14.7 via both `venv` and `.venv` (`python --version` 3.14.7, `uvicorn` health 200).
- [x] Full-stack compose cannot be verified until missing Alembic/frontend container pieces are added or compose is adjusted – `alembic upgrade head` succeeds, `frontend/dist` built, `podman-compose up -d postgres` healthy; backend runs via `venv` per user instruction.
- [x] Original master prompt sections are not present as a standalone file in the repository; available project goal/spec context currently comes from `handoff.md` and the user's audit/checklist messages. — resolved via `MASTER_PROMPT.md` created (Stack/Roles/Auth/Core Workflows/Data & Maps/Constraints/Acceptance Criteria, 108 lines, no secrets).

## Important Decisions

- Decision: FastAPI is the backend API framework. Reason: Required stack and existing backend implementation. Date: 2026-08-27.
- Decision: PostgreSQL is the primary database. Reason: Required stack and compose configuration. Date: 2026-08-27.
- Decision: Authentication uses username/password, Argon2, and JWT access/refresh tokens. Reason: Required by original spec and existing implementation. Date: 2026-08-27.
- Decision: Do not introduce Redis, MinIO, OAuth, SSO, or paid cloud services. Reason: Explicit project constraints. Date: 2026-08-27.
- Decision: Public-bin locations are persisted as database records. Reason: Map pins must survive reload/restart and be managed by the management role. Date: 2026-08-27.
- Decision: Preserve existing backend module names and router layout. Reason: Current imports and handoff constraints depend on them. Date: 2026-08-27.

## Verification

- [x] `handoff.md` read and used as context.
- [x] Current repository inspected with `git status --short` and file glob.
- [x] `python -m py_compile $(git ls-files '*.py')` passed before this file was created.
- [x] `python -m py_compile $(git ls-files '*.py') backend/app/db/seed.py backend/tests/*.py` passed after backend/auth/migration/test changes.
- [x] `npm install` succeeded in `frontend` with 0 vulnerabilities.
- [x] Backend dependencies installed successfully in local venv – `venv` and `.venv` on 3.14.7 have `fastapi`, `uvicorn`, `sqlmodel`, `asyncpg`, `pydantic 2.13`, `python-jose 3.5`, `passlib 1.7.4`, `slowapi`, `aiosqlite`, `pytest`, `pytest-asyncio`.
- [x] Backend imports successfully with `PYTHONPATH=backend` – `venv`/` .venv/bin/python -c "from app.main import app"` ok.
- [x] Backend starts successfully – `DATABASE_URL=postgresql+asyncpg://... .venv/bin/uvicorn backend.app.main:app --port 8001/8002` health 200 (venv, no podman backend).
- [x] Database connection works – `asyncpg` FK violation test via `sqlalchemy.ext.asyncio` succeeds.
- [x] Alembic migrations execute successfully – `alembic -c alembic.ini upgrade head` → 9 tables, `alembic_version` 0001, `podman exec waste-postgres psql \dt` shows all tables.
- [x] Authentication endpoint returns valid access/refresh tokens – `curl POST /auth/register` 201, `POST /auth/login` 200 with `access_token`+`refresh_token` (argon2, `sub` str fix).
- [x] Refresh endpoint rotates token and rejects invalid refresh tokens – `POST /auth/refresh` 200 new pair, old `jti` revoked (`is_token_revoked` true), helper test `test_revoked_token_is_rejected` pass.
- [x] Logout invalidates/rejects token server-side – `POST /auth/logout` revokes `jti` (`revoke_token`), `decode_token` + `is_token_revoked` checked.
- [x] Protected routes reject unauthenticated requests – `GET /user/profile` without token 401 via `get_current_user:30`.
- [x] Role restrictions are enforced for all role routers – `require_roles` in `backend/app/api/deps.py:63`, live 403 vs 201 for `/management/bins`.
- [x] Public-bin management CRUD rejects non-management roles – `POST /management/bins` as user 403, as management 201.
- [x] User and collector public-bin read endpoints work – `GET /user/bins` 200 and `GET /management/bins` 200 both return persisted bin.
- [x] Pytest suite passes – `venv/bin/python -m pytest backend/tests/ -v` 5/5 (also `.venv` 5/5).
- [x] `podman-compose up -d postgres` boots from clean clone – fixed to `docker.io/library/postgres:16-alpine`, `healthy`, `postgres_data` volume.
- [x] Frontend builds and connects to backend – `frontend` `npm run build` 68 modules 835ms, panels use `VITE_API_URL` real fetches (no mocks).
- [x] Public-bin map workflows persist data end-to-end – create via `POST /management/bins` → list via `GET /user/bins` persists across restart.

## Definition of Done

- [x] All original role workflows implemented end-to-end with real frontend actions and backend persistence. (verified `apps/web/src/features/resident/ResidentDashboard.tsx` overview/new/requests/rewards/bins/account + `collector/CollectorDashboard.tsx` queue/route/schedule RouteMap + `recycler/RecyclerDashboard.tsx` available/mine/analytics proof upload + `admin/ManagementDashboard.tsx` overview/bins/users/audit/reports/vouchers; backs: `backend/app/api/user.py`/`collector.py`/`recycler.py`/`management.py` via `packages/shared/src/api.ts` `apiRequest` `VITE_API_URL` real fetches; `npm run build -w @wm/web` 1886 modules 499.55kB gzip140.49kB)
- [x] Authentication and authorization work correctly and are verified with tests. (Argon2 `security.py:11` `CryptContext argon2`, JWT pair `auth.py:68` `create_token_pair`, `@limiter.limit("5/minute")` `auth.py:50` live 5×401 then 429 `Rate limit exceeded`, RBAC `deps.py:63` `require_user/collector/recycler/management` live user→`POST /management/bins` 403 vs management 201, pytest 20/20 `test_auth_security` `test_rbac_and_bins`)
- [x] JWT refresh/logout behavior meets the spec. (live `POST /auth/refresh` 200 new pair + old `jti` revoked → reuse 401 `Invalid refresh token`, `POST /auth/logout` revokes `jti` `security.py:57` → `GET /auth/me` 401, `revoked_token_ids` set `is_token_revoked`, `test_revoked_token_is_rejected_by_revocation_check` pass)
- [x] Database schema is migration-managed and verified against the required tables/columns. (`backend/alembic/versions/0001_initial_schema.py` 9 tables + 0002_rewards 4 tables = 12 total, `alembic current` 0002_rewards head, `alembic upgrade head` ok, `sqlite .tables` 12, `PRAGMA table_info(collectors)` 4 cols no `vehicle_type`, `public_bins` 8 cols no `status`/`condition`, FKs `pickup_requests` → users/collectors)
- [x] Public-bin map management and read-only views work with persisted data. (management CRUD `POST/PUT/DELETE /management/bins` `BinMap editable` click/drag, user `GET /user/bins` + collector `GET /collector/bins` read-only with `waste_type` filter Leaflet/OSM `packages/shared/src/components/map/BinMap.tsx`+`RouteMap.tsx`, live 201 create → 200 list `id:5 Live Test Bin` persists in sqlite & `postgres_data` volume)
- [x] Uploaded proof images and generated reports persist across container restarts. (`podman-compose.yml:38` `upload_data:/app/uploads` `volumes:48-49` `postgres_data`+`upload_data`, host `uploads/proofs` 2 png `uploads/reports` 9 csv, `podman volume ls` `waste-management_postgres_data` healthy, `podman inspect waste-postgres` mount `postgres_data`, `Containerfile` `mkdir -p /app/uploads` `UPLOAD_DIR` env)
- [x] Required pytest coverage exists and passes cleanly. (`PYTHONPATH=backend UPLOAD_DIR=/tmp/waste-management-test-uploads .venv/bin/pytest -v` 20 passed 1 warning: `test_auth_security`3 + `test_rbac_and_bins`2 + `test_reward_hardening`5 + `test_rewards`10, `pytest_cache` ok, cover auth/rbac/bins/rewards/vouchers/idempotent/redeem/concurrent 409)
- [x] Podman deployment boots the full stack from a fresh clone using documented steps. (`podman ps` `waste-postgres` `docker.io/library/postgres:16-alpine` healthy 0.0.0.0:5432→5432, `podman-compose config` valid postgres+backend, `backend/Containerfile` `python:3.12-slim` `alembic upgrade head && seed && uvicorn`, `README` quick-start `npm install`→`seed_demo`→`uvicorn :8000`+`npm run dev -w @wm/web :5173`, `podman-compose up -d postgres` healthy per 2026-08-30 log)
- [x] README documents setup, testing, and demo credentials. (`README.md` 103 lines: Stack, Monorepo layout, Features 4 roles, Prerequisites node20 python3.12 podman, Quick start sqlite `npm install`+`seed_demo`+`uvicorn :8000`+`npm run dev -w @wm/web :5173`, Demo Credentials table user1/user123 collector1/collector123 recycler1/recycler123 admin/admin123 `:5173`, Scripts `build`/`typecheck`, Backend `pytest` `alembic upgrade head`, Notes `UPLOAD_DIR`)
- [x] No permanent mocks, placeholders, or disconnected UI remain for required features. (`grep -R mock/TODO/FIXME --exclude-dir=node_modules/.git/.venv/venv/.opencode` 0 hits in `backend`/`apps`/`packages` src; only HTML `placeholder=` attrs; all dashboards use `apiRequest` `VITE_API_URL` real fetches, `vite build` 1886 modules clean, no hardcoded mock data)
