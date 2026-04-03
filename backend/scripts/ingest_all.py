"""
Master ingestion script — run this to populate the entire database.
Scrapes all sources, generates embeddings, stores everything.

Usage:
    python scripts/ingest_all.py              # full ingest
    python scripts/ingest_all.py --source ecourts
    python scripts/ingest_all.py --source legislation
    python scripts/ingest_all.py --source lawyers
    python scripts/ingest_all.py --source regulatory
    python scripts/ingest_all.py --source news
"""
import asyncio
import argparse
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from database import AsyncSessionLocal, init_db
from rag.embeddings import embed
from scrapers.legislation import LegislationScraper
from scrapers.ecourts import ECourtsScraper
from scrapers.lawyers_register import LawyersRegisterScraper
from scrapers.law_firms import LawFirmsScraper
from scrapers.regulatory import RegulatoryScraper
from scrapers.news import NewsScraper
from scrapers.eurlex import EurLexScraper
from scrapers.international import InternationalScraper
from models.law import Law
from models.judgment import Judgment
from models.lawyer import Lawyer
from models.law_firm import LawFirm
from models.document import Document
from rich import print
from rich.progress import track


async def ingest_legislation(db: AsyncSession):
    print("\n[bold cyan]Scraping legislation.mt...[/bold cyan]")
    scraper = LegislationScraper()
    laws = await scraper.scrape()
    await scraper.close()
    count = 0
    for item in track(laws, description="Storing laws..."):
        law = Law(
            chapter=item["chapter"],
            title=item["title"],
            full_text=item.get("full_text", ""),
            source_url=item.get("source_url", ""),
            embedding=embed(f"{item['chapter']} {item['title']} {item.get('full_text', '')[:2000]}"),
        )
        db.add(law)
        count += 1
        if count % 50 == 0:
            await db.commit()
    await db.commit()
    print(f"[green]Laws ingested: {count}[/green]")


async def ingest_ecourts(db: AsyncSession):
    print("\n[bold cyan]Scraping eCourts judgments...[/bold cyan]")
    scraper = ECourtsScraper()
    judgments = await scraper.scrape(start_year=2000)  # start from 2000 for speed; do 1944+ overnight
    await scraper.close()
    count = 0
    for item in track(judgments, description="Storing judgments..."):
        j = Judgment(
            reference=item["reference"],
            court=item.get("court", ""),
            judge=item.get("judge", ""),
            parties=item.get("parties", ""),
            full_text=item.get("full_text", ""),
            source_url=item.get("source_url", ""),
            pdf_url=item.get("pdf_url"),
            embedding=embed(f"{item.get('reference')} {item.get('parties')} {item.get('full_text', '')[:2000]}"),
        )
        db.add(j)
        count += 1
        if count % 100 == 0:
            await db.commit()
    await db.commit()
    print(f"[green]Judgments ingested: {count}[/green]")


async def ingest_lawyers(db: AsyncSession):
    print("\n[bold cyan]Scraping lawyers register...[/bold cyan]")
    scraper = LawyersRegisterScraper()
    lawyers = await scraper.scrape()
    await scraper.close()
    count = 0
    for item in track(lawyers, description="Storing lawyers..."):
        l = Lawyer(
            warrant_number=item.get("warrant_number", f"UNKNOWN-{count}"),
            full_name=item.get("full_name", ""),
            profession=item.get("profession", "Advocate"),
            firm=item.get("firm", ""),
            email=item.get("email", ""),
            phone=item.get("phone", ""),
            practice_areas=item.get("practice_areas", []),
            source_url=item.get("source_url", ""),
            embedding=embed(f"{item.get('full_name')} {item.get('firm', '')} {' '.join(item.get('practice_areas', []))}"),
        )
        db.add(l)
        count += 1
    await db.commit()
    print(f"[green]Lawyers ingested: {count}[/green]")


async def ingest_regulatory(db: AsyncSession):
    print("\n[bold cyan]Scraping regulatory bodies...[/bold cyan]")
    scraper = RegulatoryScraper()
    docs = await scraper.scrape()
    await scraper.close()
    count = 0
    for item in track(docs, description="Storing regulatory docs..."):
        d = Document(
            title=item["title"],
            source=item["source"],
            doc_type=item["doc_type"],
            body=item.get("body", ""),
            full_text=item.get("full_text", ""),
            source_url=item.get("source_url", ""),
            pdf_url=item.get("pdf_url"),
            embedding=embed(f"{item['title']} {item.get('full_text', '')[:2000]}"),
        )
        db.add(d)
        count += 1
        if count % 50 == 0:
            await db.commit()
    await db.commit()
    print(f"[green]Regulatory docs ingested: {count}[/green]")


async def ingest_news(db: AsyncSession):
    print("\n[bold cyan]Scraping legal news...[/bold cyan]")
    scraper = NewsScraper()
    articles = await scraper.scrape()
    await scraper.close()
    count = 0
    for item in track(articles, description="Storing news..."):
        d = Document(
            title=item["title"],
            source=item["source"],
            doc_type="news",
            body=item.get("body", ""),
            full_text=item.get("full_text", ""),
            source_url=item.get("source_url", ""),
            embedding=embed(f"{item['title']} {item.get('full_text', '')[:2000]}"),
        )
        db.add(d)
        count += 1
    await db.commit()
    print(f"[green]News articles ingested: {count}[/green]")


SOURCES = {
    "legislation": ingest_legislation,
    "ecourts": ingest_ecourts,
    "lawyers": ingest_lawyers,
    "regulatory": ingest_regulatory,
    "news": ingest_news,
}


async def main(source: str = "all"):
    print("[bold gold1]LexMalta Ingestion Script — Powered by Rark Musso[/bold gold1]")
    await init_db()
    async with AsyncSessionLocal() as db:
        if source == "all":
            for name, fn in SOURCES.items():
                try:
                    await fn(db)
                except Exception as e:
                    print(f"[red]{name} failed: {e}[/red]")
        elif source in SOURCES:
            await SOURCES[source](db)
        else:
            print(f"[red]Unknown source: {source}. Choose from: {', '.join(SOURCES.keys())}[/red]")

    print("\n[bold green]Done![/bold green]")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="all", help="Which source to ingest")
    args = parser.parse_args()
    asyncio.run(main(args.source))
