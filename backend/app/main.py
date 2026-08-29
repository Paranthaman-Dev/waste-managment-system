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
from .api import auth, user, collector, recycler, management
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(collector.router)
app.include_router(recycler.router)
app.include_router(management.router)
@app.on_event("startup")
async def on_startup():
    # Create tables if they don't exist (simple sync for demo purposes)
    from sqlmodel import SQLModel
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

@app.get("/health", response_class=JSONResponse)
async def health_check():
    return {"status": "ok"}
