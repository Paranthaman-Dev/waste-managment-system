#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# start.sh – one-command dev bootstrap for Waste Management Platform
#
# Starts ALL required services using the requested split:
#   • PostgreSQL  → podman (only required container service)
#   • Backend     → local venv + uvicorn (NOT podman)
#   • Frontend    → local npm + vite  (NOT podman)
#
# Usage:
#   ./start.sh                 # default: postgres (podman) + backend (venv) + frontend (vite)
#   ./start.sh --sqlite        # skip podman, use SQLite test.db (no postgres)
#   ./start.sh --postgres-only # only start postgres + run migrations
#   ./start.sh --no-frontend   # backend + postgres only
#   ./start.sh --help
#
# Env handling:
#   - Copies .env.example → .env if missing
#   - For postgres mode, ensures DATABASE_URL points to localhost (venv) and
#     POSTGRES_* vars exist for podman-compose
#   - For sqlite mode, ensures DATABASE_URL=sqlite+aiosqlite:///./test.db
#
# Requirements:
#   - python3 (3.12+ recommended, 3.14 works with current pins)
#   - node + npm (for frontend)
#   - podman + podman-compose (only for postgres mode; falls back to docker)
# ---------------------------------------------------------------------------

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ---------- args ----------
MODE="postgres"   # postgres | sqlite
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

  • PostgreSQL  → podman (only required container service)
  • Backend     → local venv + uvicorn (NOT podman)
  • Frontend    → local npm + vite  (NOT podman)

Usage:
  ./start.sh                 # default: postgres (podman) + backend (venv) + frontend (vite)
  ./start.sh --sqlite        # skip podman, use SQLite test.db (no postgres)
  ./start.sh --postgres-only # only start postgres + run migrations
  ./start.sh --no-frontend   # backend + postgres only
  ./start.sh --no-backend    # frontend + postgres only
  ./start.sh --help

Env handling:
  - Copies .env.example → .env if missing
  - For postgres mode, ensures DATABASE_URL points to localhost (venv)
  - For sqlite mode, ensures DATABASE_URL=sqlite+aiosqlite:///./test.db
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
VITE_API_URL=http://localhost:8000
EOF
    ok "Created minimal .env"
  fi
fi

# ensure file ends with newline before appending
ensure_newline() { tail -c1 "$1" | read -r _ || echo >> "$1"; }
ensure_newline .env
# ensure UPLOAD_DIR and VITE_API_URL exist in .env
grep -q "^UPLOAD_DIR=" .env || echo "UPLOAD_DIR=./uploads" >> .env
grep -q "^VITE_API_URL=" .env || echo "VITE_API_URL=http://localhost:8000" >> .env

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
set -a
# shellcheck disable=SC1091
source .env
set +a
# ensure UPLOAD_DIR is absolute or relative correctly
export UPLOAD_DIR="${UPLOAD_DIR:-./uploads}"
export PYTHONPATH="${PYTHONPATH:-}:$PROJECT_ROOT/backend:$PROJECT_ROOT"
export DATABASE_URL
export JWT_SECRET_KEY
export JWT_ALGORITHM="${JWT_ALGORITHM:-HS256}"

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

# ---------- 4. postgres via podman (only required container) ----------
if [[ "$MODE" == "postgres" ]]; then
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
    .venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload \
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

# ---------- 6. frontend via npm ----------
if [[ $RUN_FRONTEND -eq 1 ]]; then
  if [[ ! -d frontend ]]; then
    warn "frontend/ not found, skipping frontend"
  else
    if ! command -v npm >/dev/null 2>&1; then
      warn "npm not found, skipping frontend (install nodejs)"
    else
      info "Installing frontend deps (npm install)..."
      (cd frontend && npm install --silent || npm install)
      # ensure VITE_API_URL points to backend
      if ! grep -q "VITE_API_URL" frontend/.env 2>/dev/null; then
        echo "VITE_API_URL=http://localhost:8000" > frontend/.env
      fi
      info "Starting frontend (vite) on http://127.0.0.1:5173 ..."
      if command -v lsof >/dev/null 2>&1; then
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
      fi
      (cd frontend && VITE_API_URL=http://localhost:8000 npm run dev -- --host 0.0.0.0 --port 5173 > /tmp/waste-frontend.log 2>&1) &
      FRONTEND_PID=$!
      echo "$FRONTEND_PID" > /tmp/waste-frontend.pid
      for i in {1..20}; do
        if curl -sf http://127.0.0.1:5173 >/dev/null 2>&1; then
          ok "Frontend healthy (PID $FRONTEND_PID) → http://127.0.0.1:5173 (log: /tmp/waste-frontend.log)"
          break
        fi
        sleep 1
        if [[ $i -eq 15 ]]; then
          info "Frontend still starting (vite can take ~10s)..."
        fi
        if [[ $i -eq 20 ]]; then
          warn "Frontend not yet responding (see /tmp/waste-frontend.log)"
          tail -n 30 /tmp/waste-frontend.log || true
        fi
      done
    fi
  fi
else
  info "Skipping frontend (--no-frontend)"
fi

# ---------- 7. summary & wait ----------
bold "All services started!"
echo "  Backend : http://127.0.0.1:8000  (health http://127.0.0.1:8000/health, docs http://127.0.0.1:8000/docs)"
echo "  Frontend: http://127.0.0.1:5173  (VITE_API_URL=http://localhost:8000)"
if [[ "$MODE" == "postgres" ]]; then
  echo "  Postgres: localhost:5432  db=${POSTGRES_DB:-waste_management} user=${POSTGRES_USER:-waste_user} (container waste-postgres via $COMPOSE, volume postgres_data)"
else
  echo "  SQLite : ./test.db (DATABASE_URL=$DATABASE_URL)"
fi
echo "  Logs    : /tmp/waste-backend.log  /tmp/waste-frontend.log  (podman logs waste-postgres)"
echo ""
echo "Demo credentials (seeded): admin / admin123  (role: management)"
echo "Press Ctrl+C to stop all (backend+frontend). Postgres will keep running (use '$COMPOSE down' to stop)."
echo ""

# trap for cleanup of venv services (keep postgres)
cleanup() {
  echo ""
  warn "Shutting down backend/frontend..."
  [[ -f /tmp/waste-backend.pid ]] && kill "$(cat /tmp/waste-backend.pid)" 2>/dev/null || true
  [[ -f /tmp/waste-frontend.pid ]] && kill "$(cat /tmp/waste-frontend.pid)" 2>/dev/null || true
  # also kill by port as fallback
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
  else
    pkill -f "uvicorn backend.app.main:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
  fi
  ok "Backend/frontend stopped. Postgres still running (use '$COMPOSE down' or 'podman stop waste-postgres')."
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
