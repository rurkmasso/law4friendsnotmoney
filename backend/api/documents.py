"""
Document serving endpoint — proxies PDFs from source sites so they
open inline in our viewer without CORS issues.
"""
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from sqlalchemy import select
from database import get_db
from models.judgment import Judgment
from models.law import Law
from models.document import Document

router = APIRouter()


@router.get("/proxy-pdf")
async def proxy_pdf(url: str):
    """Proxy a PDF so it can be rendered inline without CORS issues."""
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "LexMalta-OpenSource/1.0"
            })
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="PDF ma nstabx")
        return Response(
            content=resp.content,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/judgment/{reference}")
async def get_judgment_doc(reference: str, db: AsyncSession = Depends(get_db)):
    """Full judgment with all cross-references resolved."""
    result = await db.execute(
        select(Judgment).where(Judgment.reference.ilike(reference))
    )
    j = result.scalar_one_or_none()
    if not j:
        raise HTTPException(status_code=404, detail="Sentenza ma nstabx")

    # Resolve cited laws
    cited_laws = []
    for chapter in (j.laws_cited or []):
        law_res = await db.execute(select(Law.chapter, Law.title, Law.source_url).where(Law.chapter.ilike(chapter)))
        row = law_res.first()
        if row:
            cited_laws.append({"chapter": row.chapter, "title": row.title, "url": row.source_url})

    # Resolve cited cases
    cited_cases = []
    for ref in (j.cases_cited or []):
        case_res = await db.execute(
            select(Judgment.reference, Judgment.court, Judgment.date, Judgment.source_url)
            .where(Judgment.reference.ilike(ref))
        )
        row = case_res.first()
        if row:
            cited_cases.append({"reference": row.reference, "court": row.court,
                                 "date": str(row.date), "url": row.source_url})

    return {
        "reference": j.reference,
        "court": j.court,
        "judge": j.judge,
        "parties": j.parties,
        "date": str(j.date) if j.date else None,
        "outcome": j.outcome,
        "full_text": j.full_text,
        "pdf_url": j.pdf_url,
        "source_url": j.source_url,
        "cited_laws": cited_laws,
        "cited_cases": cited_cases,
        "lawyers_appearing": j.lawyers_appearing,
    }


@router.get("/law/{chapter}")
async def get_law_doc(chapter: str, db: AsyncSession = Depends(get_db)):
    """Full law with subsidiary legislation and related cases."""
    result = await db.execute(select(Law).where(Law.chapter.ilike(chapter)))
    law = result.scalar_one_or_none()
    if not law:
        raise HTTPException(status_code=404, detail="Liġi ma nstabx")

    # Resolve related cases
    related_cases = []
    for ref in (law.related_cases or [])[:10]:
        case_res = await db.execute(
            select(Judgment.reference, Judgment.court, Judgment.date, Judgment.source_url)
            .where(Judgment.reference.ilike(ref))
        )
        row = case_res.first()
        if row:
            related_cases.append({"reference": row.reference, "court": row.court,
                                   "date": str(row.date), "url": row.source_url})

    return {
        "chapter": law.chapter,
        "title": law.title,
        "full_text": law.full_text,
        "last_amended": str(law.last_amended) if law.last_amended else None,
        "version_history": law.version_history,
        "subsidiary_legislation": law.subsidiary_legislation,
        "related_cases": related_cases,
        "source_url": law.source_url,
    }
