"""
Cross-reference script — links lawyers to their cases, laws to judgments.
Run after ingest_all.py.

Usage:
    python scripts/cross_reference.py
"""
import asyncio
import re
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from database import AsyncSessionLocal, init_db
from models.judgment import Judgment
from models.lawyer import Lawyer
from models.law import Law
from rich import print
from rich.progress import track


async def link_lawyers_to_cases(db: AsyncSession):
    """Scan judgment text for lawyer names and update their case counts."""
    print("\n[bold cyan]Cross-referencing lawyers ↔ cases...[/bold cyan]")
    lawyers_result = await db.execute(select(Lawyer))
    lawyers = lawyers_result.scalars().all()

    for lawyer in track(lawyers, description="Linking lawyers..."):
        result = await db.execute(
            select(Judgment.id, Judgment.reference)
            .where(Judgment.full_text.ilike(f"%{lawyer.full_name}%"))
        )
        cases = result.all()
        if cases:
            lawyer.case_count = len(cases)
            lawyer.cases = [c.reference for c in cases]
    await db.commit()
    print(f"[green]Lawyers linked to cases.[/green]")


async def link_laws_to_cases(db: AsyncSession):
    """Find CAP. references in judgments and link them to laws."""
    print("\n[bold cyan]Cross-referencing laws ↔ judgments...[/bold cyan]")
    judgments_result = await db.execute(select(Judgment.id, Judgment.reference, Judgment.full_text))
    judgments = judgments_result.all()

    law_refs: dict[str, list[str]] = {}  # chapter → [judgment refs]

    for j in track(judgments, description="Scanning judgments for law citations..."):
        if not j.full_text:
            continue
        chapters = re.findall(r"CAP\.?\s*\d+[A-Z]?", j.full_text, re.IGNORECASE)
        chapters = list({c.upper().replace(" ", "").replace("CAP.", "CAP. ") for c in chapters})
        if chapters:
            await db.execute(
                update(Judgment)
                .where(Judgment.id == j.id)
                .values(laws_cited=chapters)
            )
            for ch in chapters:
                law_refs.setdefault(ch, []).append(j.reference)

    # Update laws with related cases
    for chapter, refs in law_refs.items():
        await db.execute(
            update(Law)
            .where(Law.chapter.ilike(chapter))
            .values(related_cases=refs[:50])  # cap at 50 per law
        )

    await db.commit()
    print(f"[green]Laws linked to {len(law_refs)} unique citation patterns.[/green]")


async def main():
    print("[bold green]Ligi4Friends Cross-Reference Script[/bold green]")
    await init_db()
    async with AsyncSessionLocal() as db:
        await link_lawyers_to_cases(db)
        await link_laws_to_cases(db)
    print("\n[bold green]Done![/bold green]")


if __name__ == "__main__":
    asyncio.run(main())
