from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models.law import Law

router = APIRouter()


@router.get("/")
async def list_laws(
    q: str = Query(None, description="Fittex titlu jew kapitolu"),
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Law.id, Law.chapter, Law.title, Law.last_amended, Law.source_url)
    if q:
        stmt = stmt.where(
            or_(Law.title.ilike(f"%{q}%"), Law.chapter.ilike(f"%{q}%"))
        )
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    return [dict(row._mapping) for row in result]


@router.get("/{chapter}")
async def get_law(chapter: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Law).where(Law.chapter.ilike(chapter)))
    law = result.scalar_one_or_none()
    if not law:
        return {"error": "Liġi ma nstabx"}
    return {
        "chapter": law.chapter,
        "title": law.title,
        "full_text": law.full_text,
        "last_amended": str(law.last_amended) if law.last_amended else None,
        "version_history": law.version_history,
        "subsidiary_legislation": law.subsidiary_legislation,
        "related_cases": law.related_cases,
        "source_url": law.source_url,
    }
