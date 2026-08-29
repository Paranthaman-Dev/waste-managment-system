"""Recycler router – waste batch handling.
Provides endpoints:
- GET /recycler/batches – list all available batches.
- GET /recycler/batches/my – list batches assigned to the recycler.
- POST /recycler/batches/{id}/request – request assignment of a batch.
- POST /recycler/batches/{id}/accept – accept a batch (mark as processing).
- POST /recycler/batches/{id}/proof – upload proof image for a batch.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import select, update

from ..core.dependencies import get_current_user, get_db
from ..models import WasteBatch, User

router = APIRouter(prefix="/recycler", tags=["recycler"])

def _ensure_recycler(user: User):
    if user.role != "recycler":
        raise HTTPException(status_code=403, detail="Recycler role required")
    return user

@router.get("/batches")
async def list_available(db = Depends(get_db), user: User = Depends(get_current_user)):
    _ensure_recycler(user)
    result = await db.exec(select(WasteBatch).where(WasteBatch.recycler_id == None))
    return {"items": result.all()}

@router.get("/batches/my")
async def list_mine(db = Depends(get_db), user: User = Depends(get_current_user)):
    _ensure_recycler(user)
    result = await db.exec(select(WasteBatch).where(WasteBatch.recycler_id == user.id))
    return {"items": result.all()}

@router.post("/batches/{batch_id}/request")
async def request_batch(batch_id: int, db = Depends(get_db), user: User = Depends(get_current_user)):
    _ensure_recycler(user)
    stmt = (
        update(WasteBatch)
        .where(WasteBatch.id == batch_id, WasteBatch.recycler_id == None)
        .values(recycler_id=user.id, status="requested")
        .execution_options(synchronize_session=False)
    )
    result = await db.exec(stmt)
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=400, detail="Batch not available")
    return {"msg": "Batch requested"}

@router.post("/batches/{batch_id}/accept")
async def accept_batch(batch_id: int, db = Depends(get_db), user: User = Depends(get_current_user)):
    _ensure_recycler(user)
    stmt = (
        update(WasteBatch)
        .where(WasteBatch.id == batch_id, WasteBatch.recycler_id == user.id)
        .values(status="processing")
        .execution_options(synchronize_session=False)
    )
    result = await db.exec(stmt)
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Batch not found or not assigned to you")
    return {"msg": "Batch accepted"}

@router.post("/batches/{batch_id}/proof")
async def upload_proof(batch_id: int, file: UploadFile = File(...), db = Depends(get_db), user: User = Depends(get_current_user)):
    _ensure_recycler(user)
    # In a real app, save the file to storage and store the URL.
    # For this scaffold, just record a placeholder URL.
    stmt = (
        update(WasteBatch)
        .where(WasteBatch.id == batch_id, WasteBatch.recycler_id == user.id)
        .values(proof_url=f"/uploads/{file.filename}")
        .execution_options(synchronize_session=False)
    )
    result = await db.exec(stmt)
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Batch not found or not assigned to you")
    return {"msg": "Proof uploaded", "filename": file.filename}
