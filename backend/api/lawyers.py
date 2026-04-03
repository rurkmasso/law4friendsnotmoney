from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from database import get_db
from models.lawyer import Lawyer

router = APIRouter()


@router.get("/")
async def list_lawyers(
    q: str = Query(None, description="Fittex isem, firma, jew speċjalizzazzjoni"),
    profession: str = Query(None),
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Lawyer)
    if q:
        stmt = stmt.where(
            or_(
                Lawyer.full_name.ilike(f"%{q}%"),
                Lawyer.firm.ilike(f"%{q}%"),
            )
        )
    if profession:
        stmt = stmt.where(Lawyer.profession.ilike(f"%{profession}%"))

    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    lawyers = result.scalars().all()
    return [_lawyer_to_dict(l) for l in lawyers]


@router.get("/{warrant_number}")
async def get_lawyer(warrant_number: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Lawyer).where(Lawyer.warrant_number == warrant_number)
    )
    lawyer = result.scalar_one_or_none()
    if not lawyer:
        return {"error": "Avukat ma nstabx"}
    return _lawyer_to_dict(lawyer)


def _lawyer_to_dict(l: Lawyer) -> dict:
    return {
        "warrant_number": l.warrant_number,
        "full_name": l.full_name,
        "profession": l.profession,
        "firm": l.firm,
        "email": l.email,
        "phone": l.phone,
        "practice_areas": l.practice_areas,
        "case_count": l.case_count,
        "courts_active_in": l.courts_active_in,
        "first_case_date": str(l.first_case_date) if l.first_case_date else None,
        "last_case_date": str(l.last_case_date) if l.last_case_date else None,
        "source_url": l.source_url,
    }
