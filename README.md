# Waste Management System

Role-based waste management platform for users, collectors, recyclers, and management.

## Stack

- Backend: FastAPI, SQLModel, PostgreSQL, asyncpg
- Auth: username/password, Argon2 password hashing, JWT access and refresh tokens
- Frontend: React, Vite, Tailwind CSS, Leaflet/OpenStreetMap
- Runtime: Podman-compatible containers

## Features

- Users can create pickup requests, review pickup history, and view public bins on a read-only map.
- Collectors can view available/assigned pickups, accept requests, update status, and view public bins.
- Recyclers can request/accept waste batches, update processing status, and upload proof images.
- Management can review dashboard metrics, create users, manage public bins on a map, and generate CSV reports.

## Prerequisites

- Podman and podman-compose
- Node.js 22+ for local frontend development
- Python 3.12 for local backend development

The backend dependency pins target Python 3.12. Python 3.14 is not currently supported by the pinned `pydantic-core` and `asyncpg` versions.

## Local Setup With Podman

1. Copy `.env.example` to `.env`.
2. Start the stack:

```bash
podman-compose up --build
```

3. Backend API: `http://localhost:8000`
4. Frontend: `http://localhost:5173`

## Demo Credentials

The backend seed script creates a default management user when the users table is empty:

- Username: `admin`
- Password: `admin123`
- Role: `management`

Change these before any non-local use.

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

## Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` if the API is not running at `http://localhost:8000`.

## Migrations

Alembic configuration lives in `backend/alembic.ini`, with migrations in `backend/alembic/versions`.

```bash
cd backend
alembic -c alembic.ini upgrade head
```

## Notes

- Public bin locations are persisted in PostgreSQL.
- Proof images and generated reports are served from `/uploads` and persisted by the `upload_data` named volume in `podman-compose.yml`.
- No Redis, MinIO, OAuth, SSO, or paid cloud services are required.
