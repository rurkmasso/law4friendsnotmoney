"""
24/7 Scraper Scheduler — runs continuously, keeps all data fresh.
Powered by Rark Musso.

Schedule:
- News: every 30 minutes (cases break in news daily)
- eCourts new judgments: every 2 hours
- Regulatory docs (FIAU/MFSA/MGA etc): every 6 hours
- Legislation: every 24 hours (laws don't change that often)
- EU law / international: every 24 hours
- Law firms & lawyers: every 7 days

Usage:
    python scripts/scheduler.py
"""
import asyncio
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from database import AsyncSessionLocal, init_db
from rag.embeddings import embed
from scrapers.news import NewsScraper
from scrapers.ecourts import ECourtsScraper
from scrapers.regulatory import RegulatoryScraper
from scrapers.legislation import LegislationScraper
from scrapers.eurlex import EurLexScraper
from scrapers.international import InternationalScraper
from scrapers.lawyers_register import LawyersRegisterScraper
from scrapers.law_firms import LawFirmsScraper
from models.document import Document
from models.judgment import Judgment
from models.law import Law
from models.lawyer import Lawyer
from models.law_firm import LawFirm
from rich import print
from datetime import datetime


async def run_scraper(ScraperClass, ModelClass, field_map: dict, label: str):
    """Generic runner — scrapes + stores with embeddings."""
    print(f"[bold cyan][{datetime.now().strftime('%H:%M')}] Running {label}...[/bold cyan]")
    scraper = ScraperClass()
    try:
        items = await scraper.scrape()
        async with AsyncSessionLocal() as db:
            count = 0
            for item in items:
                try:
                    obj = ModelClass(**{k: item.get(v) for k, v in field_map.items() if item.get(v)})
                    text_for_embed = " ".join(str(item.get(f, "")) for f in ["title", "full_text", "reference", "chapter"])[:3000]
                    obj.embedding = embed(text_for_embed)
                    db.add(obj)
                    count += 1
                    if count % 100 == 0:
                        await db.commit()
                except Exception as e:
                    pass
            await db.commit()
        print(f"[green][{datetime.now().strftime('%H:%M')}] {label}: {count} items stored[/green]")
    except Exception as e:
        print(f"[red][{datetime.now().strftime('%H:%M')}] {label} failed: {e}[/red]")
    finally:
        await scraper.close()


async def scrape_news():
    await run_scraper(NewsScraper, Document, {
        "title": "title", "source": "source", "doc_type": "doc_type",
        "full_text": "full_text", "source_url": "source_url",
    }, "News (all Malta outlets)")


async def scrape_ecourts():
    await run_scraper(ECourtsScraper, Judgment, {
        "reference": "reference", "court": "court", "judge": "judge",
        "parties": "parties", "full_text": "full_text", "source_url": "source_url",
    }, "eCourts Judgments")


async def scrape_regulatory():
    await run_scraper(RegulatoryScraper, Document, {
        "title": "title", "source": "source", "doc_type": "doc_type",
        "full_text": "full_text", "source_url": "source_url",
    }, "Regulatory Bodies (FIAU/MFSA/MGA/etc)")


async def scrape_legislation():
    await run_scraper(LegislationScraper, Law, {
        "chapter": "chapter", "title": "title",
        "full_text": "full_text", "source_url": "source_url",
    }, "Legislation.mt")


async def scrape_eu():
    await run_scraper(EurLexScraper, Document, {
        "title": "title", "source": "source", "doc_type": "doc_type",
        "full_text": "full_text", "source_url": "source_url",
    }, "EUR-Lex + CJEU")


async def scrape_international():
    await run_scraper(InternationalScraper, Document, {
        "title": "title", "source": "source", "doc_type": "doc_type",
        "full_text": "full_text", "source_url": "source_url",
    }, "International Law (ECtHR/IMO/CoE)")


async def scrape_lawyers():
    await run_scraper(LawyersRegisterScraper, Lawyer, {
        "warrant_number": "warrant_number", "full_name": "full_name",
        "profession": "profession", "source_url": "source_url",
    }, "Lawyers Register")


async def scrape_law_firms():
    await run_scraper(LawFirmsScraper, LawFirm, {
        "name": "name", "website": "website", "email": "email",
        "phone": "phone", "address": "address",
    }, "Law Firms")


async def main():
    print("[bold gold1]LexMalta 24/7 Scheduler — Powered by Rark Musso[/bold gold1]")
    await init_db()

    # Run everything once on startup
    for job in [scrape_news, scrape_ecourts, scrape_regulatory, scrape_legislation,
                scrape_eu, scrape_international, scrape_lawyers, scrape_law_firms]:
        await job()

    scheduler = AsyncIOScheduler()

    # News every 30 minutes — cases break in the news constantly
    scheduler.add_job(scrape_news, IntervalTrigger(minutes=30), id="news")

    # New judgments every 2 hours
    scheduler.add_job(scrape_ecourts, IntervalTrigger(hours=2), id="ecourts")

    # Regulatory every 6 hours
    scheduler.add_job(scrape_regulatory, IntervalTrigger(hours=6), id="regulatory")

    # Legislation daily
    scheduler.add_job(scrape_legislation, IntervalTrigger(hours=24), id="legislation")

    # EU + international daily
    scheduler.add_job(scrape_eu, IntervalTrigger(hours=24), id="eurlex")
    scheduler.add_job(scrape_international, IntervalTrigger(hours=24), id="international")

    # Lawyers + firms weekly
    scheduler.add_job(scrape_lawyers, IntervalTrigger(days=7), id="lawyers")
    scheduler.add_job(scrape_law_firms, IntervalTrigger(days=7), id="law_firms")

    scheduler.start()
    print("[green]Scheduler running. Press Ctrl+C to stop.[/green]")

    try:
        await asyncio.Event().wait()  # run forever
    except KeyboardInterrupt:
        scheduler.shutdown()
        print("[yellow]Scheduler stopped.[/yellow]")


if __name__ == "__main__":
    asyncio.run(main())
