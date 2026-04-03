from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models.igaming_operator import IGamingOperator

router = APIRouter()


@router.get("/operators/")
async def list_operators(
    q: str = Query(None, description="Search company name or licence number"),
    licence_type: str = Query(None, description="B2C or B2B"),
    status: str = Query(None, description="Active / Suspended / Revoked"),
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(IGamingOperator)
    if q:
        stmt = stmt.where(
            or_(
                IGamingOperator.company_name.ilike(f"%{q}%"),
                IGamingOperator.licence_number.ilike(f"%{q}%"),
            )
        )
    if licence_type:
        stmt = stmt.where(IGamingOperator.licence_type.ilike(f"%{licence_type}%"))
    if status:
        stmt = stmt.where(IGamingOperator.status.ilike(f"%{status}%"))
    stmt = stmt.order_by(IGamingOperator.company_name).offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    ops = result.scalars().all()
    return [_to_dict(op) for op in ops]


@router.get("/operators/{licence_number}")
async def get_operator(licence_number: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(IGamingOperator).where(IGamingOperator.licence_number == licence_number)
    )
    op = result.scalar_one_or_none()
    if not op:
        return {"error": "Operator not found"}
    return _to_dict(op)


def _to_dict(op: IGamingOperator) -> dict:
    return {
        "id": op.id,
        "company_name": op.company_name,
        "licence_number": op.licence_number,
        "licence_type": op.licence_type,
        "status": op.status,
        "country": op.country,
        "source_url": op.source_url,
    }
