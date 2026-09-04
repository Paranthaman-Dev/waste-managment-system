# Deployment — Podman Single-File + Render

> `podman-compose.yml` **canonical** (no `docker-compose.yml`) `Caddy :8080` `Uploads /app/uploads` `AUTO_SEED=1`

## Podman (prod-like)

```bash
podman-compose -f podman-compose.yml up -d --build
# backend: python:3.12-slim + curl + alembic + seed_demo → :8000 healthy
# frontend: node:20-alpine --npm ci --build → nginx:alpine :80 try_files
# caddy: caddy:2-alpine :8080 handle /auth* → backend:8000 handle { frontend:80 }
podman ps # waste-backend healthy :8000, waste-frontend :80, waste-caddy :8080
curl :8000/health # {"status":"ok"}
curl :8080/ # <!doctype html> no-cache
curl :8080/assets/index-*.js # 200 immutable
curl :8080/uploads/reports/*.csv # 200 text/csv utf-8-sig
podman-compose down      # volumes sqlite_data + upload_data persist
podman-compose down -v   # wipe → next up auto-seeds 6 bins + 25kg + 5 vouchers
```

**Env:** `DATABASE_URL sqlite+aiosqlite:////app/data/waste.db` (`sqlite_data:/app/data`) `JWT_SECRET_KEY supersecretkey` `UPLOAD_DIR /app/uploads` `VITE_API_URL=""` `PYTHONPATH /app` `Containerfile:21 mkdir -p /app/uploads`.

## Render (MCP https://mcp.render.com/mcp)

`service srv-dabh7gm1egvs73c3l10g` `https://waste-managment-system-873w.onrender.com` `branch main` `env python` `build: pip install -r backend/requirements.txt && pip install pydantic[email] python-multipart && npm install && npm run build` `start: alembic upgrade head; PYTHONPATH=backend python -m app.db.seed_demo; uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT` `health /health` `plan free` `region oregon`.

`backend/app/main.py:93` serves `dist` + `/uploads` single-port `FileResponse no-cache` for `index.html` + `StaticFiles` for `/assets` `immutable` + `ErrorBoundary` `chunk-reload` auto-reload on `Failed to fetch dynamically imported module`.

**Caddy:** `Caddyfile:3 handle /vouchers*` (not `/vouchers/*`) + `handle /auth|/user|/collector|/recycler|/management|/rewards|/health|/docs|/openapi.json|/uploads → backend:8000`.

**MCP:** `~/.config/opencode/opencode.jsonc: render: { url: https://mcp.render.com/mcp, headers: {Authorization: rnd_kxyrKFGt...}}` `curl -H "Authorization: Bearer $TOKEN" https://api.render.com/v1/services/.../deploys` `POST /deploys clearCache`.

## Nginx

`apps/web/nginx.conf:7 try_files $uri $uri/ /index.html` `location /assets/ expires 1y immutable`.

## ENV

`.env.example` `DATABASE_URL` `JWT_SECRET_KEY` `JWT_ALGORITHM HS256` `ACCESS_TOKEN_EXPIRE_MINUTES 30` `REFRESH_TOKEN_EXPIRE_DAYS 7` `UPLOAD_DIR` `VITE_API_URL=""` `POSTGRES_*` for `start.sh --postgres`.
