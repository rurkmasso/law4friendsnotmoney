from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from database import get_db
from models.alert import Alert

router = APIRouter()


class AlertRequest(BaseModel):
    email: EmailStr
    keywords: list[str]
    sources: list[str] = []  # empty = all sources


@router.post("/")
async def create_alert(req: AlertRequest, db: AsyncSession = Depends(get_db)):
    alert = Alert(
        email=req.email,
        keywords=req.keywords,
        sources=req.sources,
    )
    db.add(alert)
    await db.commit()
    return {"message": "Alert maħluq. Tirċievi email meta jidher kontenut ġdid.", "id": alert.id}


@router.delete("/{alert_id}")
async def delete_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert:
        await db.delete(alert)
        await db.commit()
    return {"message": "Alert imħassar."}
