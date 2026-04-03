from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models.judgment import Judgment
from config import settings
import json
import os

router = APIRouter()

SUMMARY_CACHE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "judgment_summaries.json")


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


@router.get("/summary/{reference:path}")
async def get_judgment_summary(reference: str, lang: str = "en"):
    """AI overview of a court judgment."""
    cache = {}
    if os.path.exists(SUMMARY_CACHE):
        with open(SUMMARY_CACHE) as f:
            cache = json.load(f)
    cache_key = f"{reference}_{lang}"
    if cache_key in cache:
        return {"reference": reference, "summary": cache[cache_key], "cached": True}

    # Find judgment in static data
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ecourts_judgments.json")
    jdata = None
    if os.path.exists(data_path):
        with open(data_path) as f:
            judgments = json.load(f)
        for j in judgments:
            if j.get("reference") == reference:
                jdata = j
                break

    if not jdata:
        return {"reference": reference, "summary": "Judgment not found.", "cached": False}

    prompt_lang = "Maltese" if lang == "mt" else "English"
    prompt = f"""You are a Maltese legal expert. Write a clear, plain-language summary of this court judgment in {prompt_lang}.
Include: what the case was about, the key legal issues, the court's decision, and practical implications.
Keep it to 2-3 paragraphs, accessible to non-lawyers.

Judgment details:
- Reference: {jdata.get('reference', '')}
- Court: {jdata.get('court', '')}
- Judge: {jdata.get('judge', '')}
- Parties: {jdata.get('parties', '')}
- Date: {jdata.get('date', '')}
- Year: {jdata.get('year', '')}

Write the summary now:"""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        summary = response.content[0].text
        cache[cache_key] = summary
        os.makedirs(os.path.dirname(SUMMARY_CACHE), exist_ok=True)
        with open(SUMMARY_CACHE, "w") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
        return {"reference": reference, "summary": summary, "cached": False}
    except Exception as e:
        fallback = f"Judgment {reference}: {jdata.get('parties', '')} ({jdata.get('court', '')}, {jdata.get('date', '')})"
        return {"reference": reference, "summary": fallback, "cached": False, "note": str(e)[:100]}


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
