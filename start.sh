#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# start.sh – one-command dev bootstrap for Waste Management Platform
#
# Starts ALL required services (dev + optional prod single-port):
#   • Backend     → local venv + uvicorn on :8000 (NOT podman)  OR podman backend (sqlite) via podman-compose
#   • Frontend    → local npm + vite on :5173, proxied to backend (VITE_API_URL="" → same-port)
#   • Caddy       → podman caddy on :8080 merges frontend+backend to single port (prod, optional)
#   • SQLite      → file ./test.db (host venv) + /app/data/waste.db (podman volume sqlite_data, persists)
#
# Usage:
#   ./start.sh                 # default: sqlite + backend (venv) + frontend (vite) + caddy (podman :8080 if available)
#   ./start.sh --sqlite        # same as default (sqlite)
#   ./start.sh --postgres      # use PostgreSQL podman (manual fallback, requires postgres: in compose)
#   ./start.sh --postgres-only # only start postgres + run migrations
#   ./start.sh --no-frontend   # backend + caddy only
#   ./start.sh --help
#
# Env handling:
#   - Copies .env.example → .env if missing
#   - Ensures DATABASE_URL=sqlite+aiosqlite:///./test.db for host venv
#   - Podman backend uses sqlite+aiosqlite:////app/data/waste.db (hardcoded in podman-compose.yml, not via host env)
#   - VITE_API_URL="" enables same-port proxy (vite/caddy: fetch('/auth/login') via proxy), for ngrok use VITE_API_URL=https://xxx.ngrok-free.app ./start.sh
#
# Single-port architecture:
#   - Dev:  vite on :5173 proxies /auth etc → :8000 (vite.config.ts proxy)
#   - Prod: caddy on :8080 reverse_proxy → backend:8000 + host.docker.internal:5173 (Caddyfile)
#   - Full podman: podman-compose up -d backend caddy (backend sqlite at /app/data/waste.db, volume sqlite_data)
#
# Requirements:
#   - python3 (3.12+ recommended, 3.14 works with current pins)
#   - node + npm (for frontend)
#   - podman + podman-compose (only for caddy :8080 single-port and optional --postgres fallback; falls back to docker)
# ---------------------------------------------------------------------------

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ---------- args ----------
MODE="sqlite"   # sqlite | postgres (podman now sqlite-only)
RUN_FRONTEND=1
RUN_BACKEND=1
ONLY_POSTGRES=0

for arg in "$@"; do
  case "$arg" in
    --sqlite) MODE="sqlite" ;;
    --postgres) MODE="postgres" ;;
    --postgres-only) ONLY_POSTGRES=1 ;;
    --no-frontend) RUN_FRONTEND=0 ;;
    --no-backend) RUN_BACKEND=0 ;;
    --help|-h)
      cat <<'HELPEOF'
start.sh – one-command dev bootstrap for Waste Management Platform

  • Backend     → local venv + uvicorn on :8000 (or podman backend sqlite via podman-compose)
  • Frontend    → local npm + vite on :5173, proxied to backend (VITE_API_URL="" → same-port)
  • Caddy       → podman caddy on :8080 (single-port prod, reverse_proxy to backend + vite)
  • SQLite      → ./test.db (host venv) + /app/data/waste.db (podman volume sqlite_data)

Usage:
  ./start.sh                 # default: sqlite (venv) + backend (venv) + frontend (vite) + caddy (:8080 if podman available)
  ./start.sh --sqlite        # same as default (sqlite, no postgres)
  ./start.sh --postgres      # use PostgreSQL podman (manual fallback, requires postgres: in compose)
  ./start.sh --postgres-only # only start postgres + run migrations
  ./start.sh --no-frontend   # backend + caddy only
  ./start.sh --no-backend    # frontend + caddy only
  ./start.sh --help

Env handling:
  - Copies .env.example → .env if missing
  - For host venv: DATABASE_URL=sqlite+aiosqlite:///./test.db
  - Podman backend: DATABASE_URL=sqlite+aiosqlite:////app/data/waste.db (hardcoded in podman-compose.yml, not from host .env)
  - VITE_API_URL="" enables same-port proxy (vite/caddy: fetch('/auth/login') via proxy); for ngrok use VITE_API_URL=https://xxx.ngrok-free.app ./start.sh

Single-port architecture:
  - Dev:  vite on :5173 proxies /auth etc → :8000 (vite.config.ts proxy)
  - Prod: caddy on :8080 reverse_proxy → backend:8000 + host.docker.internal:5173 (Caddyfile)
  - Full podman: podman-compose up -d backend caddy (backend sqlite at /app/data/waste.db, volume sqlite_data)
HELPEOF
      exit 0
      ;;
    *) echo "Unknown arg: $arg (try --help)"; exit 1 ;;
  esac
done

# ---------- helpers ----------
bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "→ %s\n" "$*"; }
ok()   { printf "✓ %s\n" "$*"; }
warn() { printf "⚠ %s\n" "$*" >&2; }

# detect compose
COMPOSE=""
if command -v podman-compose >/dev/null 2>&1; then
  COMPOSE="podman-compose"
elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
  COMPOSE="podman compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE=""
fi

# detect compose file (canonical: compose.yml -> docker-compose.yml -> podman-compose.yml)
COMPOSE_FILE=""
for f in compose.yml compose.yaml docker-compose.yml docker-compose.yaml podman-compose.yml; do
  if [[ -f "$f" ]]; then COMPOSE_FILE="$f"; break; fi
done
[[ -z "$COMPOSE_FILE" ]] && COMPOSE_FILE="podman-compose.yml"

# ---------- 1. .env ----------
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    ok "Created .env from .env.example"
  else
    cat > .env <<EOF
DATABASE_URL=sqlite+aiosqlite:///./test.db
JWT_SECRET_KEY=supersecretkey
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=./uploads
POSTGRES_DB=waste_management
POSTGRES_USER=waste_user
POSTGRES_PASSWORD=waste_pass
VITE_API_URL=
EOF
    ok "Created minimal .env (VITE_API_URL='' for same-port proxy)"
  fi
fi

# ensure file ends with newline before appending
ensure_newline() { tail -c1 "$1" | read -r _ || echo >> "$1"; }
ensure_newline .env
# ensure UPLOAD_DIR and VITE_API_URL exist in .env (VITE_API_URL="" is correct for same-port vite/caddy proxy)
grep -q "^UPLOAD_DIR=" .env || echo "UPLOAD_DIR=./uploads" >> .env
grep -q "^VITE_API_URL=" .env || echo "VITE_API_URL=" >> .env

# Adjust DATABASE_URL for chosen mode
if [[ "$MODE" == "sqlite" ]]; then
  if ! grep -q "sqlite+aiosqlite" .env; then
    warn "Switching DATABASE_URL to SQLite for --sqlite mode (backing up .env → .env.bak)"
    cp .env .env.bak
    # replace DATABASE_URL line
    if grep -q "^DATABASE_URL=" .env; then
      sed -i 's|^DATABASE_URL=.*|DATABASE_URL=sqlite+aiosqlite:///./test.db|' .env
    else
      ensure_newline .env
      echo "DATABASE_URL=sqlite+aiosqlite:///./test.db" >> .env
    fi
  fi
  ok "Mode: SQLite (no podman postgres)"
else
  # postgres mode – ensure DATABASE_URL points to localhost for venv backend
  # podman backend would use `postgres` hostname, but venv needs localhost
  if grep -q "^DATABASE_URL=sqlite" .env; then
    warn "Switching DATABASE_URL to PostgreSQL for postgres mode (backing up .env → .env.bak)"
    cp .env .env.bak
    sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql+asyncpg://waste_user:waste_pass@localhost:5432/waste_management|' .env
  fi
  # ensure DATABASE_URL exists at all
  if ! grep -q "^DATABASE_URL=" .env; then
    ensure_newline .env
    echo "DATABASE_URL=postgresql+asyncpg://waste_user:waste_pass@localhost:5432/waste_management" >> .env
  fi
  # ensure postgres vars exist (with newline safety)
  ensure_newline .env
  grep -q "^POSTGRES_DB=" .env || echo "POSTGRES_DB=waste_management" >> .env
  grep -q "^POSTGRES_USER=" .env || echo "POSTGRES_USER=waste_user" >> .env
  grep -q "^POSTGRES_PASSWORD=" .env || echo "POSTGRES_PASSWORD=waste_pass" >> .env
  # ensure JWT vars
  ensure_newline .env
  grep -q "^JWT_SECRET_KEY=" .env || echo "JWT_SECRET_KEY=supersecretkey" >> .env
  grep -q "^JWT_ALGORITHM=" .env || echo "JWT_ALGORITHM=HS256" >> .env
  ok "Mode: PostgreSQL (podman) + venv backend + vite frontend"
fi

# load .env for this shell (for uvicorn, alembic)
# Preserve externally exported VITE_API_URL (e.g. ngrok) before sourcing .env — .env would otherwise override it
_PRE_VITE_API_URL="${VITE_API_URL:-__UNSET__}"
set -a
# shellcheck disable=SC1091
source .env
set +a
# Restore externally exported value if present (takes precedence over .env for ngrok use-case)
if [[ "$_PRE_VITE_API_URL" != "__UNSET__" ]]; then
  VITE_API_URL="$_PRE_VITE_API_URL"
fi
# Normalize old default http://localhost:8000 / http://127.0.0.1:8000 → "" for same-port vite/caddy proxy
# Empty VITE_API_URL makes frontend fetch('/auth/login') go via vite proxy (dev) or caddy (prod :8080)
if [[ "${VITE_API_URL:-}" == "http://localhost:8000" || "${VITE_API_URL:-}" == "http://127.0.0.1:8000" ]]; then
  VITE_API_URL=""
fi
# Persist normalization back to .env so next runs stay clean (keep key, empty value for docs)
if grep -q "^VITE_API_URL=http://localhost:8000" .env || grep -q "^VITE_API_URL=http://127.0.0.1:8000" .env; then
  sed -i 's|^VITE_API_URL=.*|VITE_API_URL=|' .env
  info "Normalized .env VITE_API_URL=http://localhost:8000 → VITE_API_URL='' (same-port proxy)"
fi
# ensure UPLOAD_DIR is absolute or relative correctly
export UPLOAD_DIR="${UPLOAD_DIR:-./uploads}"
export PYTHONPATH="${PYTHONPATH:-}:$PROJECT_ROOT/backend:$PROJECT_ROOT"
export DATABASE_URL
export JWT_SECRET_KEY
export JWT_ALGORITHM="${JWT_ALGORITHM:-HS256}"
export VITE_API_URL
# DATABASE_URL note: host venv uses sqlite+aiosqlite:///./test.db; podman backend is hardcoded
# in podman-compose.yml to sqlite+aiosqlite:////app/data/waste.db (volume sqlite_data) — host env not used there

# ---------- 2. venv ----------
if [[ ! -d .venv ]]; then
  bold "Creating virtualenv .venv..."
  python3 -m venv .venv
fi
# shellcheck source=/dev/null
source .venv/bin/activate

info "Upgrading pip/setuptools/wheel..."
pip install -U pip setuptools wheel -q

info "Installing backend requirements (venv)..."
pip install -q -r backend/requirements.txt
pip install -q "pydantic[email]" python-multipart httpx2 2>/dev/null || pip install -q "pydantic[email]" python-multipart

# ---------- 3. uploads ----------
mkdir -p "${UPLOAD_DIR}"
mkdir -p "${UPLOAD_DIR}/proofs" "${UPLOAD_DIR}/reports" 2>/dev/null || true
mkdir -p uploads  # legacy path used by some code/tests
ok "Upload dirs ready: $UPLOAD_DIR"

# ---------- 4. postgres via podman (only required container) — now sqlite-only, postgres kept for --postgres manual  ----------
if [[ "$MODE" == "postgres" ]] && grep -q "postgres:" "$COMPOSE_FILE"; then
  if [[ -z "$COMPOSE" ]]; then
    echo "ERROR: podman-compose (or docker compose) not found but --postgres mode requires it." >&2
    echo "Install podman-compose (pip install podman-compose) or use --sqlite" >&2
    exit 1
  fi
  info "Starting PostgreSQL via $COMPOSE (only postgres service)..."
  # ensure init-db exists (compose mounts it)
  mkdir -p backend/init-db
  # pull is handled by compose; use -d
  $COMPOSE up -d postgres

  info "Waiting for postgres to be healthy..."
  for i in {1..30}; do
    if $COMPOSE ps 2>/dev/null | grep -q "waste-postgres"; then
      # try pg_isready via podman exec
      if podman exec waste-postgres pg_isready -U "${POSTGRES_USER:-waste_user}" -d "${POSTGRES_DB:-waste_management}" >/dev/null 2>&1; then
        ok "Postgres is healthy"
        break
      fi
    fi
    # fallback: try localhost connection
    if pg_isready -h localhost -p 5432 -U "${POSTGRES_USER:-waste_user}" >/dev/null 2>&1; then
      ok "Postgres is healthy (localhost)"
      break
    fi
    sleep 2
    if [[ $i -eq 30 ]]; then
      warn "Postgres healthcheck timed out, continuing anyway (check 'podman logs waste-postgres')"
    fi
  done

  info "Running Alembic migrations..."
  (cd backend && DATABASE_URL="$DATABASE_URL" JWT_SECRET_KEY="$JWT_SECRET_KEY" ../.venv/bin/alembic -c alembic.ini upgrade head)
  ok "Migrations applied"

  info "Seeding admin (admin / admin123) if needed..."
  DATABASE_URL="$DATABASE_URL" JWT_SECRET_KEY="$JWT_SECRET_KEY" PYTHONPATH="$PROJECT_ROOT/backend:$PROJECT_ROOT" "$PROJECT_ROOT/.venv/bin/python" -m app.db.seed || true
  ok "Seed done"

  if [[ $ONLY_POSTGRES -eq 1 ]]; then
    bold "Postgres-only mode: leaving postgres running, exiting."
    echo "DATABASE_URL=$DATABASE_URL"
    echo "Run './start.sh' without --postgres-only to launch backend + frontend."
    exit 0
  fi
fi

# for sqlite mode, ensure migrations + seed (no postgres)
if [[ "$MODE" == "sqlite" ]]; then
  info "Running Alembic migrations (sqlite)..."
  (cd backend && DATABASE_URL="$DATABASE_URL" JWT_SECRET_KEY="$JWT_SECRET_KEY" ../.venv/bin/alembic -c alembic.ini upgrade head) || warn "Alembic sqlite failed"
  ok "Migrations applied (sqlite)"
  info "Seeding admin (admin / admin123) if needed..."
  DATABASE_URL="$DATABASE_URL" JWT_SECRET_KEY="$JWT_SECRET_KEY" PYTHONPATH="$PROJECT_ROOT/backend:$PROJECT_ROOT" "$PROJECT_ROOT/.venv/bin/python" -m app.db.seed || true
  ok "Seed done (sqlite)"
fi

# ---------- 5. backend via venv ----------
if [[ $RUN_BACKEND -eq 1 ]]; then
  info "Starting backend (venv) on http://127.0.0.1:8000 ..."
  # kill any old 8000
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  fi
  # start uvicorn in background
  DATABASE_URL="$DATABASE_URL" JWT_SECRET_KEY="$JWT_SECRET_KEY" JWT_ALGORITHM="$JWT_ALGORITHM" \
    UPLOAD_DIR="$UPLOAD_DIR" PYTHONPATH="$PROJECT_ROOT/backend:$PROJECT_ROOT" \
    .venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload \
    > /tmp/waste-backend.log 2>&1 &
  BACKEND_PID=$!
  echo "$BACKEND_PID" > /tmp/waste-backend.pid
  # wait for health
  for i in {1..20}; do
    if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
      ok "Backend healthy (PID $BACKEND_PID) → http://127.0.0.1:8000 (log: /tmp/waste-backend.log)"
      break
    fi
    sleep 1
    if [[ $i -eq 20 ]]; then
      warn "Backend did not become healthy in 20s (see /tmp/waste-backend.log)"
      cat /tmp/waste-backend.log | tail -n 50 || true
    fi
  done
else
  info "Skipping backend (--no-backend)"
fi

# ---------- 6. frontend — unified single-port app (@wm/web on :5173) ----------
if [[ $RUN_FRONTEND -eq 1 ]]; then
  if [[ ! -d apps/web ]]; then
    warn "apps/web not found, skipping frontend"
  else
    if ! command -v npm >/dev/null 2>&1; then
      warn "npm not found, skipping frontend (install nodejs)"
    else
      info "Installing workspace deps (npm install)..."
      (cd "$PROJECT_ROOT" && npm install --silent || npm install)
      port=5173
      name=web
      info "Starting unified portal @wm/web on http://127.0.0.1:$port ..."
      if command -v lsof >/dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
      fi
      # VITE_API_URL="" enables same-origin proxy mode (vite proxies /auth etc to backend); for ngrok: VITE_API_URL=https://xxx.ngrok-free.app ./start.sh
      (cd "$PROJECT_ROOT" && VITE_API_URL="${VITE_API_URL:-}" npm run dev -w "@wm/web" -- --port "$port" --host > "/tmp/waste-$name.log" 2>&1) &
      echo "$!" > "/tmp/waste-$name.pid"
      for i in {1..25}; do
        if curl -sf "http://127.0.0.1:$port" >/dev/null 2>&1; then
          ok "Unified portal healthy → http://127.0.0.1:$port (log: /tmp/waste-$name.log)"
          break
        fi
        sleep 1
        if [[ $i -eq 25 ]]; then
          warn "Unified portal not responding (see /tmp/waste-$name.log)"
          tail -n 20 "/tmp/waste-$name.log" || true
        fi
      done
    fi
  fi
else
  info "Skipping frontend (--no-frontend)"
fi

# ---------- 6b. caddy — optional single-port :8080 (podman) ----------
# Dev uses vite proxy on :5173; prod/single-port uses caddy on :8080 (Caddyfile reverse_proxy).
# For full podman prod: podman-compose up -d backend caddy (backend sqlite at /app/data/waste.db, volume sqlite_data).
if grep -q "caddy:" "$COMPOSE_FILE" 2>/dev/null; then
  if [[ -n "$COMPOSE" ]]; then
    info "Starting Caddy (single-port :8080) via $COMPOSE..."
    if $COMPOSE up -d caddy 2>&1 | tail -n 20; then
      ok "Caddy container started (waste-caddy, volume sqlite_data persists /app/data/waste.db)"
      # wait briefly for caddy to be reachable (proxies to backend:8000 + host.docker.internal:5173)
      for i in {1..10}; do
        if curl -sf http://127.0.0.1:8080/health >/dev/null 2>&1; then
          ok "Caddy healthy → http://127.0.0.1:8080 (single-port, proxies to backend + vite)"
          break
        fi
        if curl -sf http://127.0.0.1:8080/ >/dev/null 2>&1; then
          ok "Caddy responding → http://127.0.0.1:8080 (single-port)"
          break
        fi
        sleep 1
        if [[ $i -eq 10 ]]; then
          warn "Caddy not yet healthy on :8080 (check 'podman logs waste-caddy'; vite must be on :5173 for host.docker.internal)"
        fi
      done
    else
      warn "Caddy start failed (is podman running? try: $COMPOSE up -d caddy)"
    fi
  else
    info "Skipping Caddy (podman-compose not found) — dev uses vite proxy on :5173"
    info "  To run single-port prod: podman-compose up -d backend caddy  (or '$COMPOSE up -d caddy' alongside venv)"
  fi
else
  info "No caddy service in $COMPOSE_FILE — skipping single-port"
fi

# ---------- 7. summary & wait ----------
bold "All services started!"
echo "  Backend : http://127.0.0.1:8000  (health http://127.0.0.1:8000/health, docs http://127.0.0.1:8000/docs)"
echo "  Unified Portal (vite proxy) : http://127.0.0.1:5173  (all roles via single login; VITE_API_URL='${VITE_API_URL:-}' → fetch('/auth/login') via vite proxy)"
if grep -q "caddy:" "$COMPOSE_FILE" 2>/dev/null && [[ -n "$COMPOSE" ]] && $COMPOSE ps 2>/dev/null | grep -q "waste-caddy"; then
  echo "  Caddy (single-port) : http://127.0.0.1:8080  (Caddyfile reverse_proxy to backend:8000 + host.docker.internal:5173)"
elif grep -q "caddy:" "$COMPOSE_FILE" 2>/dev/null; then
  echo "  Caddy (single-port) : not running — start with: $COMPOSE up -d caddy  → http://127.0.0.1:8080"
fi
if [[ "$MODE" == "postgres" ]]; then
  echo "  Postgres: localhost:5432  db=${POSTGRES_DB:-waste_management} user=${POSTGRES_USER:-waste_user} (container waste-postgres via $COMPOSE, volume postgres_data)"
else
  echo "  SQLite : ./test.db (host venv, DATABASE_URL=$DATABASE_URL) + /app/data/waste.db (podman volume sqlite_data, hardcoded in compose)"
fi
echo "  Logs    : /tmp/waste-backend.log  /tmp/waste-web.log  (caddy: podman logs waste-caddy)"
echo ""
echo "Demo credentials (seeded): admin/admin123, user1/user123, collector1/collector123, recycler1/recycler123"
echo "  (seed with: PYTHONPATH=backend ./.venv/bin/python -m app.db.seed_demo)"
echo "Press Ctrl+C to stop all (backend on :8000 + vite on :5173). Caddy on :8080 and Postgres (if any) keep running."
echo "  Stop caddy/postgres: $COMPOSE down  (volumes sqlite_data + upload_data persist; use '$COMPOSE down -v' to wipe)"
echo "  Full podman prod: $COMPOSE up -d backend caddy  (uses sqlite at /app/data/waste.db, volume sqlite_data)"
echo ""

# trap for cleanup of venv services (keep caddy/postgres + volumes)
cleanup() {
  echo ""
  warn "Shutting down backend (venv :8000) + portal (vite :5173)..."
  [[ -f /tmp/waste-backend.pid ]] && kill "$(cat /tmp/waste-backend.pid)" 2>/dev/null || true
  [[ -f /tmp/waste-web.pid ]] && kill "$(cat /tmp/waste-web.pid)" 2>/dev/null || true
  # also kill by port as fallback
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
  else
    pkill -f "uvicorn backend.app.main:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
  fi
  # caddy + postgres are podman containers — intentionally left running (single-port :8080, volumes persist)
  # to stop them: podman-compose down   (or: podman stop waste-caddy waste-postgres)
  # volumes sqlite_data + upload_data persist across restarts (podman volume ls)
  if grep -q "caddy:" "$COMPOSE_FILE" 2>/dev/null && [[ -n "$COMPOSE" ]] && $COMPOSE ps 2>/dev/null | grep -q "waste-caddy"; then
    ok "Backend/portal stopped. Caddy still running on :8080 (use '$COMPOSE down' to stop; volume sqlite_data persists)."
  elif [[ "$MODE" == "postgres" ]] && grep -q "postgres:" "$COMPOSE_FILE" 2>/dev/null && $COMPOSE ps 2>/dev/null | grep -q "waste-postgres"; then
    ok "Backend/portal stopped. Postgres still running (use '$COMPOSE down' or 'podman stop waste-postgres'; volume persists)."
  else
    ok "Backend/portal stopped. Podman volumes sqlite_data + upload_data persist (use '$COMPOSE down -v' to wipe)."
  fi
  exit 0
}
trap cleanup INT TERM

# if both backend and frontend were backgrounded, wait indefinitely
if [[ $RUN_BACKEND -eq 1 || $RUN_FRONTEND -eq 1 ]]; then
  wait
else
  # postgres-only already exited earlier
  exit 0
fi
