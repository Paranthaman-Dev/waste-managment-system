# AGENTS.md – Quick‑Start & Gotchas for the Waste‑Management Repo

## Core entrypoints
- **Backend (FastAPI)** – `backend/app/main.py`.  Run with `uvicorn backend.app.main:app`.
- **Frontend (React/Vite)** – `frontend/` – start with `npm run dev`.
- **Container stack** – `podman-compose.yml` defines `postgres`, `backend`, `frontend` services.

## Local development without containers
1. **Create a venv (Python 3.12 recommended)**
   ```bash
   python3.12 -m venv venv
   source venv/bin/activate
   pip install -U pip setuptools wheel
   pip install -r backend/requirements.txt
   pip install "pydantic[email]" python-multipart
   ```
2. **Create `.env`** (copy from `.env.example` if missing).  At minimum:
   ```text
   DATABASE_URL=sqlite+aiosqlite:///./test.db
   JWT_SECRET_KEY=supersecretkey
   ```
3. **Run the API**
   ```bash
   uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The startup hook creates all tables on first run.*
4. **Frontend dev** (from `frontend/`):
   ```bash
   npm install
   npm run dev   # defaults to http://localhost:5173
   ```
   Set `VITE_API_URL=http://localhost:8000` if the API runs on a different host/port.

## Quick full‑stack start (PostgreSQL) – use the provided `start.sh`
```bash
./start.sh   # sets up venv, installs deps, starts Postgres via podman‑compose, then launches FastAPI
```
- The script:
  - Installs all deps (including email‑validator & python‑multipart).
  - Starts a PostgreSQL container (`podman-compose up -d postgres`).
  - Waits for the health‑check to succeed.
  - Exports `DATABASE_URL` pointing to the local Postgres instance.
  - Runs `uvicorn` on `http://127.0.0.1:8000`.
- **If you don’t have `podman‑compose`**, install it (`pip install podman-compose`) or replace the start‑up block with a local Docker command.

## Database & migrations
- **Migrations** live in `backend/alembic/`.  Apply the latest schema with:
  ```bash
  cd backend
  alembic -c alembic.ini upgrade head
  ```
- The `backend/app/main.py` startup also runs `SQLModel.metadata.create_all`, which creates tables automatically for SQLite or a fresh Postgres DB.  Use this for rapid prototyping; run the Alembic command for production‑grade migrations.

## Tests
- Tests live in `backend/tests/` and rely on a temporary uploads dir.
- Run a single test file or the whole suite with:
  ```bash
  PYTHONPATH=backend UPLOAD_DIR=/tmp/waste‑test-uploads venv/bin/pytest backend/tests/<test_file>.py
  ```
- **Important:** the test suite expects the database to be reachable.  For SQLite, ensure `DATABASE_URL` points to a file you can write to; for Postgres, start the container first (the `start.sh` script does this automatically).

## Authentication workflow (API)
1. **Register** a user:
   ```bash
   curl -X POST http://localhost:8000/auth/register \
        -H "Content-Type: application/json" \
        -d '{"email":"user@example.com","password":"secret","role":"user"}'
   ```
2. **Login** to obtain JWTs:
   ```bash
   curl -X POST http://localhost:8000/auth/login \
        -d "username=user@example.com&password=secret"
   ```
   The response contains `access_token`, `refresh_token`, and `token_type`.
3. **Refresh** the access token:
   ```bash
   curl -X POST http://localhost:8000/auth/refresh \
        -H "Content-Type: application/json" \
        -d '{"refresh_token":"<REFRESH_TOKEN>"}'
   ```
4. **Protected routes** (e.g. `/user/ping`) require an `Authorization: Bearer <access_token>` header.

## Common gotchas
- **Missing `python-multipart`** → FastAPI will error on `/auth/login`.  It is installed by `start.sh`; add it manually if you bypass the script.
- **Email validation** → Pydantic v2 needs `pydantic[email]`.  Install it as shown above.
- **Python version** – The backend pins packages that only build on Python 3.12.  Using Python 3.14 (as in the CI runner) works for most, but some pins may fail; stick to 3.12 for a smooth experience.
- **`.env` is ignored**.  If you accidentally commit it, Git will refuse; ensure it stays local.
- **Uploads directory** – The backend writes files to `$UPLOAD_DIR`.  The repo’s `.gitignore` excludes `uploads/` and `backend/uploads/`; create it manually (`mkdir -p uploads`) when running locally.
- **Podman vs Docker** – The compose file is written for Podman.  If you only have Docker, replace `podman-compose` with `docker-compose` in `start.sh`.
- **Seed admin script** – `backend/app/db/seed.py` is a stub; the repo currently seeds admin via the README demo credentials (admin/admin123).  No automatic seed is run on startup.

## Cleaning up remote branches
If stray branches appear on the GitHub remote, delete them in one line:
```bash
git branch -r | grep -v "origin/master" | sed 's|origin/||' | xargs -n1 git push origin --delete
```
(Adjust the protected branch name if you use `main` instead of `master`).

## Reference files (high‑value sources)
- `README.md` – overall stack, dev commands, demo credentials.
- `podman-compose.yml` – container definitions.
- `backend/app/main.py` – FastAPI entry point and DB bootstrap.
- `backend/requirements.txt` – exact backend deps; note the need for `pydantic[email]` and `python-multipart`.
- `start.sh` – the single‑command dev entry point.
- `backend/tests/` – shows required fixtures and DB usage.
- `backend/alembic/` – migration source of truth.

---
**Bottom line for an agent:**
- Use `./start.sh` for the quickest full‑stack start (it handles venv, deps, Postgres, and uvicorn).  
- For container‑free work, follow the three‑step venv → .env → `uvicorn` flow.  
- Never forget to install `python-multipart` and `pydantic[email]`; otherwise login will crash.  
- Run migrations only when you need schema changes; otherwise rely on the automatic `create_all`.
