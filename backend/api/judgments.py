from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models.judgment import Judgment

router = APIRouter()


@router.get("/")
async def list_judgments(
    q: str = Query(None, description="Fittex referenza, partijiet, jew imħallef"),
    court: str = Query(None),
    judge: str = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(
        Judgment.id, Judgment.reference, Judgment.court,
        Judgment.judge, Judgment.parties, Judgment.date,
        Judgment.outcome, Judgment.source_url
    )
    if q:
        stmt = stmt.where(or_(
            Judgment.reference.ilike(f"%{q}%"),
            Judgment.parties.ilike(f"%{q}%"),
            Judgment.judge.ilike(f"%{q}%"),
        ))
    if court:
        stmt = stmt.where(Judgment.court.ilike(f"%{court}%"))
    if judge:
        stmt = stmt.where(Judgment.judge.ilike(f"%{judge}%"))
    if date_from:
        stmt = stmt.where(Judgment.date >= date_from)
    if date_to:
        stmt = stmt.where(Judgment.date <= date_to)

    stmt = stmt.order_by(Judgment.date.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    return [dict(row._mapping) for row in result]


@router.get("/{reference}")
async def get_judgment(reference: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Judgment).where(Judgment.reference.ilike(reference))
    )
    j = result.scalar_one_or_none()
    if not j:
        return {"error": "Sentenza ma nstabx"}
    return {
        "reference": j.reference,
        "court": j.court,
        "judge": j.judge,
        "parties": j.parties,
        "plaintiff": j.plaintiff,
        "defendant": j.defendant,
        "date": str(j.date) if j.date else None,
        "outcome": j.outcome,
        "full_text": j.full_text,
        "laws_cited": j.laws_cited,
        "cases_cited": j.cases_cited,
        "lawyers_appearing": j.lawyers_appearing,
        "source_url": j.source_url,
        "pdf_url": j.pdf_url,
    }
