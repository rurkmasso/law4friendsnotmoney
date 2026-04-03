from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models.matter import Matter

router = APIRouter()


class MatterCreate(BaseModel):
    name: str
    description: str = ""
    owner_email: str
    sector: str = "legal"


class SaveQuery(BaseModel):
    matter_id: int
    query: str
    answer: str
    sources: list


@router.post("/")
async def create_matter(req: MatterCreate, db: AsyncSession = Depends(get_db)):
    matter = Matter(**req.model_dump())
    db.add(matter)
    await db.commit()
    await db.refresh(matter)
    return {"id": matter.id, "name": matter.name}


@router.get("/")
async def list_matters(email: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Matter).where(Matter.owner_email == email))
    matters = result.scalars().all()
    return [{"id": m.id, "name": m.name, "sector": m.sector, "created_at": str(m.created_at)} for m in matters]


@router.get("/{matter_id}")
async def get_matter(matter_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Matter).where(Matter.id == matter_id))
    matter = result.scalar_one_or_none()
    if not matter:
        return {"error": "Matter ma nstabx"}
    return {
        "id": matter.id,
        "name": matter.name,
        "description": matter.description,
        "sector": matter.sector,
        "saved_queries": matter.saved_queries,
        "saved_laws": matter.saved_laws,
        "saved_judgments": matter.saved_judgments,
        "notes": matter.notes,
        "created_at": str(matter.created_at),
    }


@router.post("/save-query")
async def save_query_to_matter(req: SaveQuery, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Matter).where(Matter.id == req.matter_id))
    matter = result.scalar_one_or_none()
    if not matter:
        return {"error": "Matter ma nstabx"}
    queries = matter.saved_queries or []
    queries.append({"query": req.query, "answer": req.answer, "sources": req.sources})
    matter.saved_queries = queries
    await db.commit()
    return {"message": "Mifgħud fil-matter."}


@router.delete("/{matter_id}")
async def delete_matter(matter_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Matter).where(Matter.id == matter_id))
    matter = result.scalar_one_or_none()
    if matter:
        await db.delete(matter)
        await db.commit()
    return {"message": "Matter imħassar."}
