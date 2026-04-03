"""Admin endpoint to trigger scrapers manually."""
from fastapi import APIRouter, BackgroundTasks
from scrapers.legislation import LegislationScraper
from scrapers.ecourts import ECourtsScraper
from scrapers.lawyers_register import LawyersRegisterScraper
from scrapers.regulatory import RegulatoryScraper
from scrapers.news import NewsScraper
from rich import print

router = APIRouter()


async def run_all_scrapers():
    print("[bold green]Starting full scrape...[/bold green]")
    for ScraperClass in [
        LegislationScraper,
        ECourtsScraper,
        LawyersRegisterScraper,
        RegulatoryScraper,
        NewsScraper,
    ]:
        scraper = ScraperClass()
        try:
            results = await scraper.scrape()
            print(f"[green]{ScraperClass.__name__}: {len(results)} items[/green]")
        except Exception as e:
            print(f"[red]{ScraperClass.__name__} failed: {e}[/red]")
        finally:
            await scraper.close()


@router.post("/run")
async def trigger_scrape(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_all_scrapers)
    return {"message": "Scrapers bdew jaħdmu fil-background."}
