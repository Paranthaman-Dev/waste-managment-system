# Docs — Reclaim Dictionary

> **Botanical Garden** `Fern #4a7c59` • `Cream #f5f3ed` • `7` guides + `1` glossary • all `md` themed via `Tech Innovation`/`Forest Canopy`

| Doc | Purpose | Key Files |
|-----|---------|-----------|
| `architecture.md` | `C4` + containers + `podman single-file` | `podman-compose.yml:1` `Caddyfile:3` `backend/Containerfile:1` |
| `api.md` | `7 routers` `RBAC` `schemas` | `backend/app/api/*.py:21` `main.py:88` |
| `deployment.md` | `Podman :8080` + `Render MCP` `https://mcp.render.com/mcp` | `start.sh:153` `render` `srv-dabh7gm1egvs73c3l10g` |
| `development.md` | `npm 20+` `Python 3.12` `pytest 20` `typecheck 0` | `package.json` `vite.config.ts:16` |
| `database.md` | `11 tables` `Alembic` `seed 25kg + 6 bins` | `models:32` `seed_demo.py:53` |
| `frontend.md` | `Portal 17 routes` `BinMap pinpoint` `lazy 1888 modules` | `App.tsx:86` `BinMap.tsx:28` |
| `glossary.md` | Domain terms `pickup→batch→bin→voucher` | `models:78` `services/rewards.py:35` |

**Quick links:** `../README.md` `../AGENTS.md` `../Caddyfile` `../podman-compose.yml:1` `../start.sh:153`

**Theme:** `Forest Canopy` `Forest Green #2d4a2b` `Sage #7d8471` `Olive #a4ac86` `Ivory #faf9f6` `FreeSerif/FreeSans` — for sustainability reports.

**Verify:** `podman-compose up -d` `curl :8000/health 200` `curl :8080/analytics 200 no-cache` `GET /recycler/analytics 25kg` `GET /user/bins 6` `POST /management/reports/users 200`.
