#!/usr/bin/env bash
# ---------------------------------------------------------------
# start.sh – bootstrap and run the Waste Management backend with PostgreSQL
# ---------------------------------------------------------------
# This script:
#   1. Creates/activates a Python virtualenv and installs dependencies.
#   2. Starts a PostgreSQL container via podman-compose (or docker-compose).
#   3. Waits for the database to become healthy.
#   4. Exports DATABASE_URL so the backend connects to that Postgres instance.
#   5. Runs the FastAPI application with uvicorn (reload for development).
# ---------------------------------------------------------------

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ---- 1. Virtualenv & dependencies -----------------------------------
if [[ ! -d .venv ]]; then
  echo "Creating virtualenv .venv..."
  python3 -m venv .venv
fi
# shellcheck source=/dev/null
source .venv/bin/activate

pip install -U pip setuptools wheel
pip install -r backend/requirements.txt
pip install "pydantic[email]"
pip install python-multipart

# ---- 2. Prepare .env for compose ------------------------------------
if [[ ! -f .env ]]; then
  cat > .env <<'EOF'
POSTGRES_DB=waste_management
POSTGRES_USER=waste_user
POSTGRES_PASSWORD=waste_pass
JWT_SECRET_KEY=supersecretkey
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=uploads
EOF
  echo "Created default .env for compose"
fi

# ---- 3. Start PostgreSQL via podman-compose -------------------------
echo "Starting PostgreSQL container..."
if command -v podman-compose &>/dev/null; then
  COMPOSE_CMD="podman-compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  echo "ERROR: neither podman-compose nor docker-compose found. Install one to run the database." >&2
  exit 1
fi

$COMPOSE_CMD up -d postgres

# ---- 4. Wait for Postgres healthcheck -------------------------------
echo "Waiting for PostgreSQL to become healthy..."
for i in {1..30}; do
  if $COMPOSE_CMD ps postgres | grep -q "healthy"; then
    echo "PostgreSQL is healthy."
    break
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    echo "Timed out waiting for PostgreSQL healthcheck." >&2
    $COMPOSE_CMD logs postgres
    exit 1
  fi
done

# ---- 5. Export DATABASE_URL for the backend -------------------------
# The compose file maps host port 5432 to container port 5432.
export DATABASE_URL="postgresql+asyncpg://waste_user:waste_pass@localhost:5432/waste_management"
export JWT_SECRET_KEY="supersecretkey"
export JWT_ALGORITHM="HS256"
export ACCESS_TOKEN_EXPIRE_MINUTES=30
export REFRESH_TOKEN_EXPIRE_DAYS=7
export UPLOAD_DIR="uploads"

# ---- 6. Create uploads directory ------------------------------------
mkdir -p uploads

# ---- 7. Run the FastAPI application ---------------------------------
echo "Starting FastAPI backend on http://127.0.0.1:8000 ..."
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload