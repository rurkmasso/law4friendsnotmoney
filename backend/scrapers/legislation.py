"""
Scraper for legislation.mt — all Malta laws.
Site uses AJAX DataTables — we POST to the partial endpoints directly.
"""
import re
import asyncio
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from rich import print

BASE_URL = "https://legislation.mt"

# All AJAX endpoints for different legislation types
ENDPOINTS = [
    {"name": "Acts",          "url": f"{BASE_URL}/Acts/ActsPartial2",         "params": {"YearString": "", "AgentString": "", "FilterString": "", "TitleString": ""}},
    {"name": "Legal Notices", "url": f"{BASE_URL}/LegalNotices/LegalNoticesPartial", "params": {"YearString": "", "AgentString": "", "FilterString": "", "TitleString": ""}},
]

LEGISLATION_AJAX = f"{BASE_URL}/Legislations/LegislationPartialGet"


class LegislationScraper(BaseScraper):

    async def scrape(self) -> list[dict]:
        laws = []

        # Main consolidated chapters via the legislation index page
        chapters = await self._get_chapters_from_index()
        laws.extend(chapters)
        print(f"[green]Chapters scraped: {len(chapters)}[/green]")

        # Acts by year (going back as far as possible)
        acts = await self._get_acts()
        laws.extend(acts)
        print(f"[green]Acts scraped: {len(acts)}[/green]")

        return laws

    async def _get_chapters_from_index(self) -> list[dict]:
        """Scrape the main legislation index — tries multiple URL patterns."""
        laws = []
        urls_to_try = [
            f"{BASE_URL}/Legislation",
            f"{BASE_URL}/legislation",
            f"{BASE_URL}/en/Legislation",
        ]
        for url in urls_to_try:
            try:
                resp = await self.get(url)
                soup = BeautifulSoup(resp.text, "lxml")
                rows = soup.select("#mainTable tbody tr, table.dataTable tr, tr[data-pdflink], tr[pdfLink]")
                if not rows:
                    # Try getting all table rows
                    rows = soup.select("table tr")
                for row in rows:
                    cells = row.select("td")
                    if len(cells) < 2:
                        continue
                    chapter = cells[0].get_text(strip=True) if cells else ""
                    title = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                    pdf_link = row.get("data-pdflink") or row.get("pdfLink") or ""
                    if chapter and title:
                        laws.append({
                            "chapter": chapter,
                            "title": title,
                            "full_text": f"{chapter} {title}",
                            "source_url": url,
                            "pdf_url": f"{BASE_URL}{pdf_link}" if pdf_link else None,
                        })
                if laws:
                    break
            except Exception as e:
                print(f"[yellow]{url}: {e}[/yellow]")
                continue
        return laws

    async def _get_acts(self) -> list[dict]:
        """Scrape Acts by POSTing to the AJAX endpoint."""
        acts = []
        from datetime import datetime
        current_year = datetime.now().year

        for year in range(current_year, 1900, -1):
            try:
                resp = await self.client.post(
                    f"{BASE_URL}/Acts/ActsPartial2",
                    data={"YearString": str(year), "AgentString": "", "FilterString": "", "TitleString": ""},
                    headers={**self.headers, "X-Requested-With": "XMLHttpRequest"},
                )
                soup = BeautifulSoup(resp.text, "lxml")
                rows = soup.select("tr")
                year_acts = []
                for row in rows:
                    cells = row.select("td")
                    if not cells:
                        continue
                    title = cells[0].get_text(strip=True) if cells else ""
                    if not title or len(title) < 5:
                        continue
                    pdf_link = row.get("data-url", "") or ""
                    year_acts.append({
                        "chapter": f"ACT/{year}",
                        "title": title,
                        "full_text": title,
                        "source_url": f"{BASE_URL}/Acts",
                        "pdf_url": f"{BASE_URL}{pdf_link}" if pdf_link else None,
                    })
                if year_acts:
                    acts.extend(year_acts)
                    print(f"[cyan]Acts {year}: {len(year_acts)}[/cyan]")
                elif year < current_year - 5:
                    # Stop if no acts found for older years
                    break
            except Exception as e:
                if year > current_year - 3:
                    print(f"[yellow]Acts {year}: {e}[/yellow]")
                continue
        return acts
