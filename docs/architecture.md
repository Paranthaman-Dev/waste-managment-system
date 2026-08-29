# Waste Management Platform — Complete Architecture

> **Version:** 2.1.0 (Unified Portal)  
> **Date:** 2026-08-30  
> **Branch:** `main` at `c1e4e2f` · Previous 4-port model preserved on `four-separate-login-panel-model` (`b1569da`)  
> **Stack:** FastAPI · SQLModel · PostgreSQL 16 / SQLite · React 19 · Vite 8 · Tailwind 4 · Leaflet · Podman

---

## 1. Executive Summary

Reclaim Civic Waste OS is a role-based, city-scale waste collection and recovery operating system. One **unified single-port portal** (`apps/web` on `:5173`) serves four roles — **Resident (user)**, **Collector**, **Recycler**, **Management (admin)** — through a single login panel, routing by JWT `role`. The platform handles pickup scheduling, collector queue → route → collected lifecycle, recycler batch claim → proof, admin site/user/voucher governance, and a points-based rewards ledger.

**Key invariants:**
- **PostgreSQL for prod, SQLite for dev** — same SQLModel schema, Alembic migrations, `DATABASE_URL` switch via `start.sh` (`backend/app/core/config.py:9`)
- **Single auth surface** — `POST /auth/login` JSON `{username,password}` → `{access_token,refresh_token,role}` (`backend/app/api/auth.py:50`), `wm_*` localStorage (`packages/shared/src/auth.tsx:19`)
- **Resident-only self-registration** — `POST /auth/register` hard-codes `UserRole.USER` (`backend/app/api/auth.py:41`); collectors/recyclers/admins are provisioned only via `POST /management/users` (`backend/app/api/management.py:127`)
- **Reward as ledger** — `points = floor(kg × rate[ waste_type ])` (`backend/app/core/config.py:42`), awarded on `COLLECTED` (`backend/app/api/collector.py`), consumed on voucher redeem

---

## 2. System Context (C4 Level 1)

```mermaid
C4Context
    title System Context — Reclaim Civic Waste OS
    Person(resident, "Resident", "Household — requests pickups, redeems rewards")
    Person(collector, "Collector", "Field staff — executes routes")
    Person(recycler, "Recycler", "Plant — claims batches, uploads proof")
    Person(admin, "Admin", "City ops — manages sites/users/vouchers/reports")
    System(wm, "Waste Management Platform", "Unified portal :5173 + API :8000 + PostgreSQL")
    System_Ext(map, "OpenStreetMap", "Tile provider for BinMap")
    System_Ext(mail, "SMTP (future)", "Notifications — not yet wired")
    Rel(resident, wm, "HTTPS :5173 → :8000", "JWT Bearer")
    Rel(collector, wm, "HTTPS :5173 → :8000", "JWT Bearer")
    Rel(recycler, wm, "HTTPS :5173 → :8000", "JWT Bearer")
    Rel(admin, wm, "HTTPS :5173 → :8000", "JWT Bearer")
    Rel(wm, map, "Leaflet TileLayer", "https://{s}.tile.openstreetmap.org")
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

**External actors:** 4 roles, one origin `http://localhost:5173` (CORS `allow_origins=["*"]` at `backend/app/main.py:28`).

---

## 3. Container Diagram (C4 Level 2)

```mermaid
C4Container
    title Container Diagram — Runtime
    Person(user, "User", "Any role, single login")
    Container(web, "Unified Portal", "React 19 + Vite 8 + Tailwind 4", "apps/web on :5173 — role-switched AppShell + dashboards")
    Container(shared, "Shared Package", "TS + Leaflet + Lucide", "packages/shared — @wm/shared: tokens, primitives, api, auth, router, BinMap")
    Container(api, "API", "FastAPI + SQLModel + SlowAPI", "backend/app on :8000 — 7 routers, JWT, RBAC, rewards")
    ContainerDb(db, "Primary DB", "PostgreSQL 16 / SQLite", "users, collectors, recyclers, pickup_requests, waste_batches, public_bins, reward_ledgers, vouchers, redemptions, audit_logs, reports")
    ContainerDb(uploads, "Object Store", "Filesystem", "$UPLOAD_DIR — /proofs/*.jpg|png|webp, /reports/*.csv")
    System_Ext(osm, "OSM Tiles", "Leaflet")
    Rel(user, web, "Browser", "HTTPS")
    Rel(web, shared, "npm link", "@wm/shared")
    Rel(web, api, "fetch", "JSON + Bearer, credentials:include")
    Rel(api, db, "SQLAlchemy async", "asyncpg / aiosqlite")
    Rel(api, uploads, "File I/O", "Path($UPLOAD_DIR)")
    Rel(web, osm, "TileLayer", "HTTPS")
    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

**Ports (dev):** `5173` web, `8000` api, `5432` postgres. `start.sh` is the single entrypoint; `podman-compose.yml` only runs `postgres`+`backend` for prod.

---

## 4. Monorepo Layout

```
waste-management/
├─ apps/
│  └─ web/                 @wm/web — unified portal (was 4 apps, see branch four-separate-login-panel-model)
│     ├─ index.html
│     ├─ vite.config.ts    alias ^@wm/shared$ → packages/shared/src/index.ts, server 5173
│     ├─ tsconfig.json     extends tsconfig.base.json
│     └─ src/
│        ├─ main.tsx       RootProviders → App
│        ├─ App.tsx        role switch: user/collector/recycler/management → AppShell + dashboard
│        └─ features/
│           ├─ resident/   ResidentDashboard.tsx (682 LOC) + RewardsSection.tsx (314 LOC)
│           ├─ collector/  CollectorDashboard.tsx (480 LOC)
│           ├─ recycler/   RecyclerDashboard.tsx (486 LOC)
│           └─ admin/      ManagementDashboard.tsx (950 LOC) + VouchersSection.tsx (392 LOC)
├─ packages/shared/        @wm/shared
│  ├─ src/
│  │  ├─ api.ts            API_URL, apiRequest(), getRewardBalance(), …
│  │  ├─ auth.tsx          AuthProvider (wm_access_token/refresh/role, fetchMe, refresh)
│  │  ├─ router.tsx        lightweight SPA router (history pushState, Link)
│  │  ├─ types/api.ts      Role, User, PickupRequest, WasteBatch, …
│  │  ├─ waste.ts          wasteTypeOptions
│  │  ├─ tokens.css, styles.css
│  │  └─ components/
│  │     ├─ auth/AuthPage.tsx   single login + resident-only register (no #r-role)
│  │     ├─ layout/AppShell.tsx desktop sidebar + mobile drawer/bottom nav, role badge
│  │     ├─ map/BinMap.tsx      Leaflet + custom pins, editable/draggable
│  │     ├─ ui/primitives.tsx   Button, Input, Select, Card, Badge, Modal, …
│  │     ├─ ui/charts.tsx       DonutChart, RadialGauge
│  │     └─ rewards/*           RewardCard, VoucherTile
│  └─ package.json         exports map (., ./styles.css, ./auth, …)
├─ backend/
│  ├─ app/
│  │  ├─ main.py            FastAPI + CORS + SlowAPI + startup create_all
│  │  ├─ core/config.py     Settings (DATABASE_URL, JWT, REWARD_RATES)
│  │  ├─ core/security.py   argon2, create_token_pair, decode, revoke (in-mem set)
│  │  ├─ api/               auth, user, collector, recycler, management, rewards, vouchers, deps
│  │  ├─ models/__init__.py UserRole, PickupStatus, BatchStatus, 11 tables
│  │  ├─ schemas/__init__.py UserCreate, Token, …
│  │  ├─ db/session.py      async engine + AsyncSessionLocal
│  │  └─ db/seed_demo.py    idempotent demo users (admin/user1/collector1/recycler1)
│  ├─ alembic/              0001_initial_schema, 0002_rewards
│  ├─ Containerfile
│  └─ requirements.txt
├─ package.json             workspaces ["apps/*","packages/*"], scripts build/dev/typecheck
├─ tsconfig.base.json
├─ podman-compose.yml       postgres + backend (frontend is local vite)
├─ start.sh                 one-command bootstrap (postgres|sqlite, venv, api, web)
└─ docs/architecture.md     this file
```

**Workspaces:** `package.json:6` `["apps/*","packages/*"]` → `npm install` links `@wm/*`. `tsconfig.base.json:14` `paths.@wm/shared` + `apps/web/vite.config.ts:8` alias give type + runtime sharing.

---

## 5. Frontend — Unified Portal

### 5.1 Single Login + Role Switch

```mermaid
sequenceDiagram
    participant U as Browser :5173
    participant A as AuthPage
    participant C as AuthProvider (auth.tsx)
    participant API as API :8000
    participant R as App.tsx (role switch)
    U->>A: GET / (no token) → AuthPage
    A->>C: login(username,password) → POST /auth/login
    C->>API: {username,password}
    API-->>C: {access_token (30m), refresh_token (7d), role}
    C->>C: localStorage wm_* + fetchMe(token) → role (server truth)
    C->>R: setRole(role), setUser(me)
    R->>R: switch(role) → Resident|Collector|Recycler|Admin dashboard
```

- **AuthPage** `packages/shared/src/components/auth/AuthPage.tsx:6` — `mode=login|register`, `login()` via `useAuth`, `handleRegister` `POST /auth/register` **without** `role` (resident-only hint `lines 183-186`). Demo quick-fill chips for 4 roles remain for dev.
- **AuthProvider** `packages/shared/src/auth.tsx:19` — `wm_access_token`, `wm_refresh_token`, `wm_role` + `loadUser` (`fetchMe`) overwrites local `role` with server `me.role`; `refresh()` rotates via `POST /auth/refresh`; `logout` revokes `POST /auth/logout`.
- **App** `apps/web/src/App.tsx:14` — `if (loading) Spinner; if (!user||!role) <AuthPage/>; switch(role) → <AppShell brand sub> + dashboard`. No cross-port redirects; one origin avoids per-port localStorage quirks.

### 5.2 Routing & Shell

- **Router** `packages/shared/src/router.tsx:13` — custom `RouterProvider` (`currentUrl = pathname+search`, `navigate` via `history.pushState`, `popstate` listener). No `react-router` dep.
- **AppShell** `packages/shared/src/components/layout/AppShell.tsx:29` — `navItems.find(href===pathname||pathname.startsWith(href))` for active; desktop `lg:fixed w-60` sidebar, mobile drawer + `Mobile Bottom Navigation` (`grid-flow-col`); brand `♻ Reclaim` + role badge (`user→Resident`) + `Operational` pulse + `Sign out`.

Per-role nav (`apps/web/src/App.tsx:10-35`):

| Role | Nav (`href → tab`) | Dashboard file |
|------|-------------------|----------------|
| `user` | `/→overview`, `/new`, `/requests`, `/rewards`, `/bins`, `/account` | `features/resident/ResidentDashboard.tsx:50` |
| `collector` | `/queue`, `/route→assigned`, `/schedule`, `/sites→bins` | `features/collector/CollectorDashboard.tsx:42` |
| `recycler` | `/available`, `/my-batches→mine`, `/analytics` | `features/recycler/RecyclerDashboard.tsx:42` |
| `management` | `/→overview`, `/sites→bins`, `/users`, `/vouchers`, `/audit`, `/reports` | `features/admin/ManagementDashboard.tsx:65` |

Each dashboard `getTabFromPath()` falls back to its default (`queue` for collector, etc.), so `GET /` shows the correct overview per role.

### 5.3 Data Layer & Map

- **api.ts** `packages/shared/src/api.ts:17` `apiRequest<T>(path, {method,body}, token?)` → `fetch(API_URL+path, {Authorization: Bearer, credentials:include})`, parses `detail` errors; helpers `getRewardBalance`, `getVouchers`, etc.
- **BinMap** `packages/shared/src/components/map/BinMap.tsx:12` — `react-leaflet` `MapContainer` + `TileLayer https://{s}.tile.openstreetmap.org`, `createCustomPin` `DivIcon` per waste color, `editable` drag + `onPick` click, `Circle 800m` for locate.

### 5.4 UI System

`packages/shared/src/components/ui/primitives.tsx:12` — `Button` (primary/outline/ghost, loading spinner), `Input`/`Textarea`/`Select`/`Label`, `Card`, `Badge` tones `sage/amber/info`, `StatCard`, `Modal`, `Pagination`, etc.; `tokens.css` + `styles.css` provide civic-paper variables.

---

## 6. Backend — FastAPI + SQLModel

### 6.1 App Bootstrap

`backend/app/main.py:14`

```python
app = FastAPI(title="Waste Management API")
limiter = Limiter(key_func=get_remote_address); app.state.limiter = limiter
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router) … # 7 routers
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
```

`engine` from `backend/app/db/session.py:6` `create_async_engine(settings.DATABASE_URL)`. `create_all` is demo-friendly; prod uses Alembic.

### 6.2 Config & Rewards

`backend/app/core/config.py:9` `Settings(BaseSettings)` — `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM=HS256`, `ACCESS 30m`, `REFRESH 7d`, `UPLOAD_DIR`.  
`REWARD_RATES` (`python:config.py:20`) — canonical `organic5 plastic10 e-waste15 metal10 paper8 glass5` + aliases; `calculate_points = int(kg * rate)` (`config.py:42`) raises on `≤0`.

### 6.3 Security

`backend/app/core/security.py:11` — `CryptContext(argon2)`, `revoked_token_ids:set`, `create_access_token({sub,role}, 30m, jti)`, `create_refresh_token(7d)`, `create_token_pair`, `decode_token` (`jwt.decode` HS256), `revoke/is_revoked`.

`backend/app/api/deps.py:16` — `OAuth2PasswordBearer(tokenUrl="/auth/login")`, `get_current_user` (decode, `type=="access"`, `is_active`), `require_roles([...])` → `require_user/collector/recycler/management/any_role`.

### 6.4 Routers & RBAC

| Router | Prefix | Guard | Key endpoints |
|--------|--------|-------|---------------|
| `auth` | `/auth` | `5/min` on `/login` | `POST /register` (forces `USER`), `POST /login` → `Token+Set-Cookie`, `POST /refresh` (rotation), `POST /logout` (revoke), `GET /me`, `POST /change-password` |
| `user` | `/user` | `require_user` | `GET /bins?waste_type`, `GET/POST /pickups`, `GET /analytics/summary`, `PUT /profile` |
| `collector` | `/collector` | `require_collector` | `GET /profile`, `PUT /profile`, `GET /pickups[?available]`, `POST /pickups/{id}/accept`, `PUT /pickups/{id}/status {en_route→collected (+WasteBatch + points)}`, `GET /schedule`, `GET /bins` |
| `recycler` | `/recycler` | `require_recycler` | `GET /batches[?available|my]`, `POST /batches/{id}/request`, `POST /batches/{id}/accept`, `POST /batches/{id}/proof` (`multipart`, `uploads/proofs`), `GET /analytics/summary` |
| `management` | `/management` | `require_management` | `GET /dashboard/summary`, `GET/POST /users` (auto-creates `Collector`/`Recycler` profile rows), `PUT/DELETE /users/{id}`, `GET/POST /collectors|recyclers`, `GET/POST/PUT/DELETE /bins`, `GET /audit-logs`, `POST/GET /reports/{users|pickups|batches|bins}` |
| `rewards` | `/rewards` | `require_any`/`require_user` | `GET /rates`, `GET /balance`, `GET /history` |
| `vouchers` | `/vouchers` | split | `GET /` (user), `GET /all` (mgmt), `POST /redeem/{id}` (user), `GET /my-redemptions`, `GET /redemptions` + `PATCH /redemptions/{id}?new_status=issued|cancelled` (mgmt), `POST/PATCH/DELETE /vouchers` (mgmt) |

**Seed:** `backend/app/db/seed_demo.py:52` idempotently upserts `admin/admin123(management)`, `user1/user123(user)`, `collector1/collector123(collector+profile Chennai)`, `recycler1/recycler123(recycler+profile)`.

---

## 7. Database

### 7.1 ER (Mermaid)

```mermaid
erDiagram
    users ||--o| collectors : "1-1 user_id unique"
    users ||--o| recyclers : "1-1 user_id unique"
    users ||--o{ pickup_requests : "1-N user_id"
    collectors ||--o{ pickup_requests : "1-N collector_id"
    pickup_requests ||--|| waste_batches : "1-1 pickup_request_id unique"
    recyclers ||--o{ waste_batches : "1-N recycler_id"
    users ||--o{ public_bins : "1-N created_by"
    users ||--o{ reward_ledgers : "1-N user_id"
    users ||--o{ redemptions : "1-N user_id"
    vouchers ||--o{ redemptions : "1-N voucher_id"
    users ||--o{ audit_logs : "1-N actor_user_id"
    users ||--o{ reports : "1-N generated_by"

    users {
        int id PK
        string username UQ
        string email UQ
        string password_hash
        enum role "user|collector|recycler|management" IX
        string phone
        datetime created_at
        bool is_active
    }
    collectors {
        int id PK
        int user_id FK UQ
        string service_area
        bool is_available
    }
    recyclers {
        int id PK
        int user_id FK UQ
        json accepted_waste_types
        float capacity_kg
        float rating
    }
    pickup_requests {
        int id PK
        int user_id FK
        int collector_id FK
        string waste_type IX
        float quantity_kg
        string location
        float latitude
        float longitude
        datetime preferred_time
        enum status "pending|assigned|en_route|collected|declined|cancelled" IX
        datetime requested_at
        datetime collected_at
    }
    waste_batches {
        int id PK
        int pickup_request_id FK UQ
        int recycler_id FK
        enum status "available|requested|accepted|processing|completed" IX
        datetime handed_over_at
        datetime processed_at
        string proof_url
    }
    public_bins {
        int id PK
        string name
        float latitude IX
        float longitude IX
        json accepted_waste_types
        float capacity_kg
        int created_by FK
        datetime created_at
        datetime updated_at
    }
    reward_ledgers {
        int id PK
        int user_id FK
        int points
        string waste_type
        float weight_kg
        datetime created_at
    }
    vouchers {
        int id PK
        string title
        string description
        int cost_points
        bool active
        datetime valid_until
    }
    redemptions {
        int id PK
        int user_id FK
        int voucher_id FK
        int points_spent
        enum status "pending|issued|cancelled"
        datetime created_at
    }
```

**Models:** `backend/app/models/__init__.py:8` enums `UserRole`, `PickupStatus`, `BatchStatus`, `RedemptionStatus`; 11 `SQLModel` tables.

### 7.2 Migrations

`backend/alembic/versions/0001_initial_schema.py` creates `users`, `collectors`, `recyclers`, `pickup_requests`, `waste_batches`, `public_bins` + indexes; `0002_rewards.py` adds `reward_ledgers`, `vouchers`, `redemptions`.

`backend/alembic/env.py:9` `config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)` — honors `DATABASE_URL` from env/`.env`, so `alembic.ini:12` `sqlalchemy.url` is just a placeholder.

**Commands:**
```bash
cd backend && alembic -c alembic.ini upgrade head   # prod
# dev: SQLModel.metadata.create_all on startup handles fresh DB
```

### 7.3 PostgreSQL vs SQLite

| Aspect | PostgreSQL (prod, `podman-compose`) | SQLite (dev, `start.sh --sqlite`) |
|--------|--------------------------------------|-----------------------------------|
| `DATABASE_URL` | `postgresql+asyncpg://waste_user:waste_pass@postgres:5432/waste_management` (container) / `@localhost:5432` (venv) | `sqlite+aiosqlite:///./test.db` |
| Driver | `asyncpg` (`requirements.txt:4`) | `aiosqlite` |
| Enums | Native `CREATE TYPE userrole` (`0001`) | Stored as text, `Enum` via SQLAlchemy |
| JSON | `JSONB` for `accepted_waste_types`, `pickup.waste_type` filters via `contains` | `JSON` text |
| Health | `pg_isready -U waste_user` (`podman-compose.yml:14`) | N/A |
| Init | `backend/init-db/` mounted to `/docker-entrypoint-initdb.d` (empty by default; see §8.4) | `SQLModel.metadata.create_all` |

`start.sh:124` switches `DATABASE_URL` for `--sqlite` vs `--postgres`; `backend/app/db/session.py:6` `create_async_engine` works for both (see §8.4 fixes: `pool_pre_ping`, `connect_args`).

---

## 8. Infrastructure

### 8.1 Podman Compose

`podman-compose.yml:3`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: waste-postgres
    environment: {POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD}
    volumes: [postgres_data:/var/lib/postgresql/data, ./backend/init-db:/docker-entrypoint-initdb.d]
    ports: ["5432:5432"]
    healthcheck: {test: ["CMD-SHELL","pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"], interval: 5s}
  backend:
    build: {context: ./backend, dockerfile: Containerfile}
    container_name: waste-backend
    environment: {DATABASE_URL: postgresql+asyncpg://…@postgres:5432/…, JWT_*, UPLOAD_DIR:/app/uploads}
    volumes: [./backend:/app, upload_data:/app/uploads]
    ports: ["8000:8000"]
    depends_on: {postgres: {condition: service_healthy}}
    command: sh -c "alembic -c alembic.ini upgrade head && python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
volumes: {postgres_data:, upload_data:}
```

`start.sh` only runs `postgres` via compose (`$COMPOSE up -d postgres`); backend + web run in venv/npm for fast reload.

### 8.2 Containerfile

`backend/Containerfile:1` `FROM python:3.12-slim`, `apt libpq-dev gcc`, `pip -r requirements.txt`, `COPY . .`, `mkdir -p /app/uploads`, `EXPOSE 8000`, `CMD uvicorn`.

### 8.3 One-Command Bootstrap

`start.sh:1` (`set -euo pipefail`)

1. **Args:** `--sqlite|--postgres|--postgres-only|--no-frontend|--no-backend`
2. **.env:** copies `.env.example` if missing, ensures `UPLOAD_DIR`, `VITE_API_URL`, toggles `DATABASE_URL` + `POSTGRES_*` per mode, `source .env`
3. **venv:** `python3 -m venv .venv`, `pip install -r backend/requirements.txt` + `pydantic[email] python-multipart`
4. **postgres:** `$COMPOSE up -d postgres`, 30×2s `pg_isready` loop, `alembic upgrade head`, `python -m app.db.seed` (admin)
5. **backend:** `lsof -ti:8000 | kill`, `uvicorn backend.app.main:app --reload` on `:8000`, 20×1s `curl /health`
6. **web:** `npm install`, `VITE_API_URL=http://localhost:8000 npm run dev -w @wm/web` on `:5173`, 25×1s `curl :5173`
7. **trap:** `cleanup` kills `waste-backend.pid` + `waste-web.pid` + `lsof :8000,5173`, keeps postgres (`$COMPOSE down` to stop)

### 8.4 PostgreSQL Fixes Applied (2026-08-30)

> See `docs/postgresql.md` for operator runbook.

- **Healthcheck env expansion** `podman-compose.yml:14` — use `$$` escape so `CMD-SHELL` sees container env: `pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}` + `start_period: 10s`, `retries: 10`.
- **Engine resilience** `backend/app/db/session.py:6` — `create_async_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"timeout": 10} if postgres else {})`; lazy getter `get_engine()` for alembic re-use.
- **Alembic URL override** `backend/alembic/env.py:9` already does `config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)`; `alembic.ini:12` is now a commented placeholder (`# overridden by env.py`) to avoid confusion.
- **init-db** `backend/init-db/01-init.sql` — `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` + comment for future `postgis` if geo queries added; ensures mount is not empty (compose warns on empty).
- **Compose volume & env** — `postgres_data` named volume for persistence; `backend` mounts `upload_data` to `/app/uploads` (`podman-compose.yml:30`).
- **.env.example restored** `619B` — documents `DATABASE_URL` for both modes, `POSTGRES_*`, `JWT_*`, `UPLOAD_DIR`.

---

## 9. Security

- **Passwords** `argon2-cffi` (`security.py:11`), never stored plain; `verify_password` on login.
- **JWT** HS256, `jti` revocation `revoked_token_ids` in-mem (`security.py:12`, resets on restart — prod should use Redis/DB). `access 30m`, `refresh 7d`, `HttpOnly` refresh cookie (`auth.py:71`), `WWW-Authenticate: Bearer` on 401.
- **RBAC** `require_roles` (`deps.py:63`) per router; frontend role switch is UX only, backend enforces.
- **Rate limit** `SlowAPI 5/min` on `POST /auth/login` (`auth.py:51`).
- **CORS** `["*"]` (`main.py:28`) — okay for dev; prod should lock to `https://app.reclaim.city`.
- **Uploads** `proof` validates `content_type in {image/jpeg,image/png,image/webp}` (`recycler.py`), writes to `UPLOAD_DIR/proofs/{uuid}`, served via `FileResponse` (not shown) — add virus scan for prod.

---

## 10. API Surface (abridged)

Base `http://localhost:8000`. Auth `Bearer <access_token>`. All JSON unless `FormData` for proof.

| Method | Path | Auth | Body / Query | Returns |
|--------|------|------|--------------|---------|
| `POST` | `/auth/register` | — | `{username,email,password,phone?}` (role ignored) | `201 User` |
| `POST` | `/auth/login` | `5/min` | `{username,password}` | `Token{access,refresh,role}` + cookie |
| `GET` | `/auth/me` | Bearer | — | `User` |
| `GET` | `/user/bins?waste_type=` | `user` | — | `PublicBin[]` |
| `POST` | `/user/pickups` | `user` | `{waste_type,quantity_kg,location,preferred_time?}` | `PickupRequest` |
| `GET` | `/collector/pickups/available` | `collector` | `is_available` guard | `PickupRequest[]` |
| `POST` | `/collector/pickups/{id}/accept` | `collector` | — | `PickupRequest(status=assigned)` |
| `PUT` | `/collector/pickups/{id}/status` | `collector` | `{status: en_route|collected|declined}` | `PickupCollectResponse{points_earned}` |
| `GET` | `/recycler/batches?status=available` | `recycler` | `page` | `Paginated<WasteBatch>` |
| `POST` | `/recycler/batches/{id}/request` | `recycler` | — | `WasteBatch(status=requested)` |
| `POST` | `/recycler/batches/{id}/proof` | `recycler` | `FormData{file}` | `WasteBatch(proof_url)` |
| `GET` | `/management/dashboard/summary` | `management` | — | `counts + by_waste_type + points` |
| `POST` | `/management/users` | `management` | `UserCreate{role}` | `User` + auto `Collector|Recycler` row |
| `GET` | `/vouchers` | `user` | — | `Voucher[]` active |
| `POST` | `/vouchers/redeem/{id}` | `user` | — | `Redemption(pending)` |
| `GET` | `/rewards/balance` | `user` | — | `{balance}` |
| `GET` | `/rewards/rates` | `any` | — | `REWARD_RATES` |

Full OpenAPI at `http://localhost:8000/docs`.

---

## 11. Development Workflow

```bash
npm install                              # link @wm/* once
DATABASE_URL=sqlite+aiosqlite:///./test.db JWT_SECRET_KEY=supersecretkey \
  ./.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
DATABASE_URL=sqlite+aiosqlite:///./test.db JWT_SECRET_KEY=supersecretkey \
  PYTHONPATH="$PWD/backend:$PWD" ./.venv/bin/python -m app.db.seed_demo
npm run dev -w @wm/web                   # :5173
npm run typecheck && npm run build      # all workspaces
PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q  # 20 passed

# postgres
./start.sh                 # postgres(via podman) + venv api + vite web
./start.sh --sqlite        # no podman, uses test.db
./start.sh --postgres-only # only postgres + alembic + seed
```

**Tests** `backend/tests/` use `aiosqlite` tmp DB + `UPLOAD_DIR=/tmp/...`; `conftest` fixtures.

---

## 12. Roadmap

- **Auth:** Persist `jti` revocation in DB/Redis; add email verification, `is_active` admin toggle via `PUT /management/users/{id}` already exists.
- **Geo:** PostGIS for `ST_DWithin` bin search (currently in-mem filter), `init-db` already prepares `pgcrypto`.
- **Realtime:** WebSocket for collector queue, recycler claim race (`SELECT … FOR UPDATE` already used in `collector.py:accept`).
- **Observability:** Structured logging, Prometheus `/metrics`, health `/health` already (`main.py:38`).
- **Multi-tenant:** `service_area` + `accepted_waste_types` scoping already in models.

---

## Appendix — File Index

| Path | Role |
|------|------|
| `apps/web/src/App.tsx:14` | Unified role switch |
| `packages/shared/src/auth.tsx:19` | AuthProvider, `wm_*` storage |
| `packages/shared/src/router.tsx:13` | SPA router |
| `backend/app/api/management.py:127` | `POST /management/users` + profile auto-create |
| `backend/app/main.py:14` | FastAPI + CORS + startup `create_all` |
| `backend/app/core/config.py:20` | `REWARD_RATES` |
| `podman-compose.yml:3` | `postgres` + `backend` services |
| `start.sh:124` | `DATABASE_URL` switch + `npm run dev -w @wm/web` |
| `backend/alembic/env.py:9` | `sqlalchemy.url` override from `settings.DATABASE_URL` |

