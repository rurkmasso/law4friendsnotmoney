"""
Smart suggestions, trending searches, and daily feed.
Drives daily engagement — lawyers see fresh content every visit.
"""
import json
from datetime import datetime, date
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from database import get_db
from models.judgment import Judgment
from models.document import Document

router = APIRouter()

# Curated Malta law autocomplete terms
LEGAL_TERMS = [
    "kiri ta' proprjetà", "kuntratt ta' xogħol", "danni", "appell",
    "divorzju", "testment", "kompanija", "failliment", "akkuża kriminali",
    "inġunzjoni", "interdict", "proċedura ċivili", "kumpens", "garanzija",
    "ipoteka", "servitù", "lokazzjoni", "trasferiment ta' proprjetà",
    "FIAU AML", "MFSA liċenzja", "MGA gaming", "GDPR Malta",
    "CAP. 16", "CAP. 12", "CAP. 9", "CAP. 345", "CAP. 386", "CAP. 373",
    "Qorti Ċivili", "Qorti Kriminali", "Qorti tal-Appell", "Maġistrat",
    "employment contract", "lease agreement", "company law", "criminal procedure",
    "civil damages", "inheritance", "succession", "property transfer",
    "maritime lien", "ship registration", "gaming licence", "AML compliance",
]


@router.get("/autocomplete")
async def autocomplete(q: str, limit: int = 8):
    """Fast autocomplete — no DB query, just keyword matching."""
    q_lower = q.lower().strip()
    if len(q_lower) < 2:
        return []
    matches = [t for t in LEGAL_TERMS if q_lower in t.lower()][:limit]
    return matches


@router.post("/log-search")
async def log_search(request: Request):
    """Log a search term for trending calculation."""
    body = await request.json()
    query = body.get("query", "")[:200]
    if not query:
        return {}
    redis = request.app.state.redis
    today = date.today().isoformat()
    await redis.zincrby(f"lexmalta:trending:{today}", 1, query)
    await redis.expire(f"lexmalta:trending:{today}", 86400 * 7)
    return {}


@router.get("/trending")
async def trending(request: Request, limit: int = 8):
    """Top searches today."""
    redis = request.app.state.redis
    today = date.today().isoformat()
    results = await redis.zrevrange(f"lexmalta:trending:{today}", 0, limit - 1, withscores=True)
    return [{"query": q, "count": int(score)} for q, score in results]


@router.get("/daily-feed")
async def daily_feed(db: AsyncSession = Depends(get_db)):
    """New judgments and documents added today/this week — the daily digest."""
    # Latest 5 judgments
    j_result = await db.execute(
        select(Judgment.reference, Judgment.court, Judgment.parties, Judgment.date, Judgment.source_url)
        .order_by(Judgment.scraped_at.desc())
        .limit(5)
    )
    judgments = [
        {"type": "judgment", "title": f"{r.reference} — {r.parties}", "meta": r.court,
         "date": str(r.date), "url": r.source_url}
        for r in j_result
    ]

    # Latest 5 regulatory docs
    d_result = await db.execute(
        select(Document.title, Document.source, Document.published_at, Document.source_url)
        .order_by(Document.scraped_at.desc())
        .limit(5)
    )
    docs = [
        {"type": "document", "title": r.title, "meta": r.source,
         "date": str(r.published_at) if r.published_at else None, "url": r.source_url}
        for r in d_result
    ]

    return {"judgments": judgments, "documents": docs}


@router.get("/smart-followups")
async def smart_followups(query: str, language: str = "mt"):
    """Suggest 3 follow-up questions based on what was just asked."""
    followups_mt = {
        "kiri": ["X inhuma d-drittijiet tat-tenant?", "Kif tista' ttemm kuntratt ta' kiri?", "X inhuma l-obbligazzjonijiet tal-kerrej?"],
        "xogħol": ["X inhuma d-drittijiet tal-ħaddiem?", "Kif issir il-ħruġ legali?", "X inhi l-avviż minimu?"],
        "kompanija": ["Kif tiftaħ kompanija Malta?", "X inhuma r-responsabbiltajiet tad-direttur?", "Kif tagħlaq kompanija?"],
        "kriminali": ["X inhuma d-drittijiet tal-akkużat?", "Kif taħtar avukat kriminali?", "X inhi l-proċedura ta' appell?"],
        "proprjetà": ["Kif ssir it-trasferiment ta' proprjetà?", "X huma d-drittijiet tal-kerrej?", "Kif tapplika għal ipoteka?"],
    }
    followups_en = {
        "lease": ["What are tenant rights in Malta?", "How to terminate a lease legally?", "What are landlord obligations?"],
        "employment": ["What are employee rights?", "How to dismiss legally?", "What is the minimum notice period?"],
        "company": ["How to set up a company in Malta?", "What are director obligations?", "How to dissolve a company?"],
        "criminal": ["What are accused rights?", "How to appoint a criminal lawyer?", "What is the appeal procedure?"],
        "property": ["How is property transferred?", "What are ownership rights?", "How to apply for a mortgage?"],
    }

    q_lower = query.lower()
    followups = followups_mt if language == "mt" else followups_en
    for keyword, suggestions in followups.items():
        if keyword in q_lower:
            return suggestions
    # Default suggestions
    if language == "mt":
        return ["Spjega aktar dwar dan", "X inhuma l-każi rilevanti?", "Abbozza dokument relatat"]
    return ["Explain further", "What are the relevant cases?", "Draft a related document"]
