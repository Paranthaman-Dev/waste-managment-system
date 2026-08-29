"""FastAPI entry point.
Sets up the application, registers routers, and provides a simple health‑check.
"""

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .db.database import engine

app = FastAPI(title="Waste Management API", version="0.1.0")

# Register routers
from .routers import auth, user, collector, recycler, management
app.include_router(auth.router)
app.include_router(user.router, prefix="/user", tags=["user"])
app.include_router(collector.router, prefix="/collector", tags=["collector"])
app.include_router(recycler.router, prefix="/recycler", tags=["recycler"])

app.include_router(management.router, prefix="/management", tags=["management"])
@app.on_event("startup")
async def on_startup():
    # Create tables if they don't exist (simple sync for demo purposes)
    from sqlmodel import SQLModel
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

@app.get("/health", response_class=JSONResponse)
async def health_check():
    return {"status": "ok"}
