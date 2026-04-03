from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from database import get_db
from models.lawyer import Lawyer
from config import settings
import json
import os

router = APIRouter()

SUMMARY_CACHE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "lawyer_summaries.json")


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


@router.get("/summary/{warrant_number:path}")
async def get_lawyer_summary(warrant_number: str, lang: str = "en"):
    """AI overview of a lawyer's profile."""
    cache = {}
    if os.path.exists(SUMMARY_CACHE):
        with open(SUMMARY_CACHE) as f:
            cache = json.load(f)
    cache_key = f"{warrant_number}_{lang}"
    if cache_key in cache:
        return {"warrant_number": warrant_number, "summary": cache[cache_key], "cached": True}

    # Find in static data
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "lawyers.json")
    ldata = None
    if os.path.exists(data_path):
        with open(data_path) as f:
            lawyers = json.load(f)
        for l in lawyers:
            if l.get("warrant_number") == warrant_number:
                ldata = l
                break

    if not ldata:
        return {"warrant_number": warrant_number, "summary": "Lawyer not found.", "cached": False}

    prompt_lang = "Maltese" if lang == "mt" else "English"
    prompt = f"""You are a Maltese legal directory assistant. Write a brief professional profile summary in {prompt_lang}.
Keep it to 1-2 paragraphs.

Lawyer details:
- Name: {ldata.get('full_name', '')}
- Warrant: {ldata.get('warrant_number', '')}
- Profession: {ldata.get('profession', 'Advocate')}
- Firm: {ldata.get('firm', 'Independent')}
- Practice Areas: {', '.join(ldata.get('practice_areas', []))}
- Email: {ldata.get('email', '')}

Write the profile summary:"""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        summary = response.content[0].text
        cache[cache_key] = summary
        os.makedirs(os.path.dirname(SUMMARY_CACHE), exist_ok=True)
        with open(SUMMARY_CACHE, "w") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
        return {"warrant_number": warrant_number, "summary": summary, "cached": False}
    except Exception as e:
        fallback = f"{ldata.get('full_name', '')} — {ldata.get('profession', 'Advocate')}"
        if ldata.get('firm'):
            fallback += f" at {ldata['firm']}"
        return {"warrant_number": warrant_number, "summary": fallback, "cached": False}


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
