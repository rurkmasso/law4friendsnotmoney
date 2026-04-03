from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models.law import Law
from config import settings
import json
import os

router = APIRouter()

# Cache AI summaries to disk to avoid re-generating
SUMMARY_CACHE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "law_summaries.json")


def _load_summary_cache() -> dict:
    if os.path.exists(SUMMARY_CACHE):
        with open(SUMMARY_CACHE) as f:
            return json.load(f)
    return {}


def _save_summary_cache(cache: dict):
    os.makedirs(os.path.dirname(SUMMARY_CACHE), exist_ok=True)
    with open(SUMMARY_CACHE, "w") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


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


@router.get("/summary/{chapter:path}")
async def get_law_summary(chapter: str, lang: str = "en"):
    """Generate an AI overview/summary of what a law is about.
    Uses Claude to generate a concise, plain-language summary.
    Results are cached to disk so each law is only summarized once."""
    cache = _load_summary_cache()
    cache_key = f"{chapter}_{lang}"

    if cache_key in cache:
        return {"chapter": chapter, "summary": cache[cache_key], "cached": True}

    # Load legislation data to find the law
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "legislation.json")
    law_data = None
    if os.path.exists(data_path):
        with open(data_path) as f:
            laws = json.load(f)
        for law in laws:
            if law.get("chapter") == chapter:
                law_data = law
                break

    if not law_data:
        return {"chapter": chapter, "summary": "Law not found in database.", "cached": False}

    # Build prompt for Claude
    title = law_data.get("title", "")
    title_en = law_data.get("title_en", "")
    keywords = ", ".join(law_data.get("keywords", []))
    eli = law_data.get("eli_link", "")
    status = law_data.get("status", "In Force")
    eff_date = law_data.get("effective_date", "")

    prompt_lang = "Maltese" if lang == "mt" else "English"
    prompt = f"""You are a Maltese legal expert. Write a clear, plain-language summary of this Maltese law in {prompt_lang}.
Include: what the law covers, who it applies to, key provisions, and practical implications for citizens.
Keep it to 3-4 paragraphs, accessible to non-lawyers.

Law details:
- Chapter: {chapter}
- Title (MT): {title}
- Title (EN): {title_en}
- ELI: {eli}
- Keywords: {keywords}
- Status: {status}
- Effective date: {eff_date}

Write the summary now:"""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        summary = response.content[0].text

        # Cache it
        cache[cache_key] = summary
        _save_summary_cache(cache)

        return {"chapter": chapter, "summary": summary, "cached": False}
    except Exception as e:
        # Fallback: generate a basic summary from available metadata
        if lang == "mt":
            fallback = f"Din hija liġi Maltija ({chapter}) bit-titlu: {title}."
            if keywords:
                fallback += f" Tikkonċerna: {keywords}."
            if status:
                fallback += f" Status: {status}."
        else:
            fallback = f"This is a Maltese law ({chapter}): {title_en or title}."
            if keywords:
                fallback += f" It covers: {keywords}."
            if status:
                fallback += f" Status: {status}."
            if eff_date:
                fallback += f" Effective since {eff_date}."
        return {"chapter": chapter, "summary": fallback, "cached": False, "note": f"AI unavailable: {str(e)[:100]}"}


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
