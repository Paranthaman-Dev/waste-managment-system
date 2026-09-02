"""FastAPI entry point.
Sets up the application, registers routers, and provides a simple health‑check.
Uses venv for runtime, postgres via podman for DB (no podman for backend).
"""

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.responses import JSONResponse as SlowJSONResponse

from pathlib import Path

from .db.session import engine
from .core.config import get_settings

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Waste Management API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda request, exc: SlowJSONResponse({"detail": "Rate limit exceeded"}, status_code=429))
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers from canonical api package (venv-based)
from .api import auth, user, collector, recycler, management, rewards, vouchers
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(collector.router)
app.include_router(recycler.router)
app.include_router(management.router)
app.include_router(rewards.router)
app.include_router(vouchers.router)
@app.on_event("startup")
async def on_startup():
    # Create tables if they don't exist (simple sync for demo purposes)
    from sqlmodel import SQLModel
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        # Backfill legacy rows where accepted_waste_types is NULL (project data)
        try:
            await conn.execute(text("UPDATE public_bins SET accepted_waste_types='[]' WHERE accepted_waste_types IS NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("UPDATE recyclers SET accepted_waste_types='[]' WHERE accepted_waste_types IS NULL"))
        except Exception:
            pass

@app.get("/health", response_class=JSONResponse)
async def health_check():
    return {"status": "ok"}


# Serve built frontend (apps/web/dist) when present — enables single-port on Render
try:
    dist = Path(__file__).resolve().parents[2] / "apps" / "web" / "dist"
    # also try repo root when running with different cwd (e.g. /app on Render)
    if not dist.exists():
        alt = Path.cwd() / "apps" / "web" / "dist"
        if alt.exists():
            dist = alt
    if dist.exists() and (dist / "index.html").exists():
        from fastapi.staticfiles import StaticFiles

        # mount at /assets first (vite hashed assets)
        if (dist / "assets").exists():
            app.mount("/assets", StaticFiles(directory=str(dist / "assets")), name="assets")
        # catch-all for SPA — must be last
        app.mount("/", StaticFiles(directory=str(dist), html=True), name="frontend")
except Exception:
    pass
