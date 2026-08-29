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

- Current phase: Backend/frontend scaffold and migrations exist; project is in verification and integration hardening phase.
- Current objective: Verify backend/runtime, finish tests, and confirm Podman full-stack boot end-to-end.
- Last completed task: Added CHECK.md, repository ignore files, JWT token revocation, Alembic initial migration, admin seed script, README, backend test skeleton, and React/Vite/Tailwind/Leaflet frontend scaffold with role panels wired to real API calls.
- Next task: Run frontend build, then verify backend using Python 3.12/container because the local Python 3.14 venv cannot install pinned backend dependencies.

## Master TODO

### Authentication And Authorization
- [x] Define username/password auth endpoints in backend.
- [x] Hash passwords with Argon2 in backend security utilities.
- [x] Issue JWT access and refresh token pair on login.
- [x] Implement server-side logout/token invalidation or token revocation; current implementation uses in-process JWT `jti` revocation.
- [ ] Verify refresh token rotation behavior with runtime test.
- [ ] Verify login rate limiting by manually triggering repeated failed login attempts against a running backend.
- [ ] Verify every route under `/user`, `/collector`, `/recycler`, and `/management` is protected by the correct RBAC dependency.

### Backend API
- [x] Create FastAPI app with routers for auth, user, collector, recycler, and management.
- [x] Implement user pickup request endpoints.
- [x] Implement collector pickup assignment/status endpoints.
- [x] Implement recycler waste batch endpoints and proof upload endpoint.
- [x] Implement management user/profile/bin/report/audit endpoints.
- [ ] Verify all endpoints from the original API spec exist and return expected response shapes.
- [ ] Verify malformed requests return Pydantic 422 responses for one endpoint per role.
- [ ] Review and remove unused imports without changing behavior.

### Database
- [x] Define SQLModel models for users, collectors, recyclers, pickup requests, waste batches, public bins, audit logs, and reports.
- [x] Confirm `collectors` has no `vehicle_type` column in model.
- [x] Confirm `public_bins` has no `status` or `condition` column in model.
- [x] Add Alembic configuration and initial migration.
- [ ] Verify migrations create the exact expected schema.
- [ ] Verify foreign keys are enforced at DB level with a running PostgreSQL database.

### Public Bin Map
- [x] Backend management public-bin CRUD endpoints exist.
- [x] Backend user and collector read-only public-bin endpoints exist.
- [x] Build management UI to create bins by click/drag pin on map.
- [x] Build management UI to edit bin location and metadata.
- [x] Build management UI to delete bins.
- [x] Build user read-only map showing all bins with waste-type filtering.
- [ ] Verify non-management roles receive 403 for management bin create/update/delete.
- [ ] Verify bin persistence after reload and container restart.

### Frontend
- [x] Scaffold React + Vite + Tailwind frontend.
- [x] Add role-aware authentication state and protected routes.
- [x] Build user panel with real API calls.
- [x] Build collector panel with real API calls.
- [x] Build recycler panel with real API calls.
- [x] Build management panel with real API calls.
- [x] Add Leaflet/OpenStreetMap map components.
- [ ] Confirm no permanent mocked UI responses remain.

### Containerization And Deployment
- [x] Add `backend/Containerfile`.
- [x] Add `podman-compose.yml` with PostgreSQL, backend, and frontend service definitions.
- [x] Add frontend `Containerfile` after frontend scaffold exists.
- [ ] Verify `podman-compose up` boots from a clean clone after copying `.env.example` to `.env`.
- [x] Remove or fix compose references to paths that do not yet exist, such as missing Alembic config/frontend container files.
- [ ] Verify upload data persists through container restart via named volume.

### Testing And Quality
- [x] Add pytest suite.
- [ ] Cover auth login/register/refresh behavior.
- [x] Cover RBAC/role-check behavior.
- [ ] Cover public-bin permission behavior.
- [ ] Run pytest successfully.
- [x] Run Python syntax compilation successfully before dependency install.
- [ ] Run backend import/runtime validation after dependencies install.
- [x] Add README with fresh-clone setup steps and demo admin credentials.

## Discovered TODOs

- [ ] Local git commit `bf30c4d` accidentally tracked Python `__pycache__` files; staged deletions exist and should be committed with `.gitignore`.
- [x] `podman-compose.yml` runs `alembic upgrade head`, but no Alembic config/migrations exist yet; backend container will fail until migrations are added or command is adjusted.
- [x] `podman-compose.yml` references `./frontend` and `frontend/Containerfile`; frontend scaffold/container file are missing.
- [ ] `podman-compose.yml` references `./backend/init-db`; that directory is not present.
- [ ] Backend dependency installation in local venv failed because host Python is 3.14 and pinned `asyncpg==0.29.0` / `pydantic-core==2.18.4` do not build against Python 3.14. Use Python 3.12 or container.
- [ ] `backend/app/main.py` will create a FastAPI instance with a `/health` endpoint (currently in progress).
- [x] `backend/app/main.py` mounts `settings.UPLOAD_DIR` at import time; local import may fail unless `/app/uploads` exists or `UPLOAD_DIR` is overridden.
- [ ] Run `npm run build` for the new frontend and fix any TypeScript/build errors.
- [ ] Backend auth tests currently cover password hashing/token creation/revocation helpers but do not yet run endpoint-level register/login/refresh flows against a test database.
- [ ] User pasted an OpenCode/9router API key in conversation; it was not found in project files by grep and must not be committed or recorded.

## Blockers

- [ ] Backend runtime cannot be verified on local Python 3.14; use Python 3.12 or container build.
- [ ] Full-stack compose cannot be verified until missing Alembic/frontend container pieces are added or compose is adjusted.
- [ ] Original master prompt sections are not present as a standalone file in the repository; available project goal/spec context currently comes from `handoff.md` and the user's audit/checklist messages.

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
- [ ] Backend dependencies installed successfully in local venv.
- [ ] Backend imports successfully with `PYTHONPATH=backend`.
- [ ] Backend starts successfully.
- [ ] Database connection works.
- [ ] Alembic migrations execute successfully.
- [ ] Authentication endpoint returns valid access/refresh tokens.
- [ ] Refresh endpoint rotates token and rejects invalid refresh tokens.
- [ ] Logout invalidates/rejects token server-side.
- [ ] Protected routes reject unauthenticated requests.
- [ ] Role restrictions are enforced for all role routers.
- [ ] Public-bin management CRUD rejects non-management roles.
- [ ] User and collector public-bin read endpoints work.
- [ ] Pytest suite passes.
- [ ] `podman-compose up` boots full stack from clean clone.
- [ ] Frontend builds and connects to backend.
- [ ] Public-bin map workflows persist data end-to-end.

## Definition of Done

- [ ] All original role workflows implemented end-to-end with real frontend actions and backend persistence.
- [ ] Authentication and authorization work correctly and are verified with tests.
- [ ] JWT refresh/logout behavior meets the spec.
- [ ] Database schema is migration-managed and verified against the required tables/columns.
- [ ] Public-bin map management and read-only views work with persisted data.
- [ ] Uploaded proof images and generated reports persist across container restarts.
- [ ] Required pytest coverage exists and passes cleanly.
- [ ] Podman deployment boots the full stack from a fresh clone using documented steps.
- [ ] README documents setup, testing, and demo credentials.
- [ ] No permanent mocks, placeholders, or disconnected UI remain for required features.
