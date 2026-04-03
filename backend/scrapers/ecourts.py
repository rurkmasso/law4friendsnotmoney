"""
Scraper for eCourts.gov.mt — Malta court judgments from 1944+.
Free, unlimited use per their own terms.
"""
import re
from datetime import datetime
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from rich import print

BASE_URL = "https://ecourts.gov.mt"
SEARCH_URL = f"{BASE_URL}/onlineservices/Judgements"


class ECourtsScraper(BaseScraper):

    async def scrape(self, start_year: int = 1944, end_year: int = 2025) -> list[dict]:
        judgments = []
        for year in range(start_year, end_year + 1):
            year_results = await self._scrape_year(year)
            judgments.extend(year_results)
            print(f"[green]Year {year}: {len(year_results)} judgments[/green]")
        return judgments

    async def _scrape_year(self, year: int) -> list[dict]:
        results = []
        page = 1
        while True:
            batch = await self._scrape_page(year, page)
            if not batch:
                break
            results.extend(batch)
            page += 1
        return results

    async def _scrape_page(self, year: int, page: int) -> list[dict]:
        params = f"?year={year}&page={page}&pageSize=50"
        resp = await self.get(f"{SEARCH_URL}{params}")
        soup = BeautifulSoup(resp.text, "lxml")

        rows = soup.select("table.judgments-table tr, .judgment-row, tr[data-ref]")
        if not rows:
            return []

        judgments = []
        for row in rows:
            cells = row.select("td")
            if len(cells) < 3:
                continue
            link = row.select_one("a[href]")
            if not link:
                continue
            detail_url = BASE_URL + link["href"] if link["href"].startswith("/") else link["href"]
            try:
                judgment = await self._scrape_judgment(detail_url)
                if judgment:
                    judgments.append(judgment)
            except Exception as e:
                print(f"[red]  Failed judgment {detail_url}: {e}[/red]")
        return judgments

    async def _scrape_judgment(self, url: str) -> dict | None:
        resp = await self.get(url)
        soup = BeautifulSoup(resp.text, "lxml")

        def extract(label: str) -> str:
            el = soup.find(string=re.compile(label, re.I))
            if el and el.parent:
                return el.parent.find_next_sibling().get_text(strip=True) if el.parent.find_next_sibling() else ""
            return ""

        reference = extract("reference|case no")
        court = extract("court")
        judge = extract("judge|magistrate")
        parties = extract("parties|plaintiff|applicant")
        date_str = extract("date")
        full_text_el = soup.select_one(".judgment-text, #judgment-content, main article")
        full_text = full_text_el.get_text(separator="\n", strip=True) if full_text_el else ""

        pdf_link = soup.find("a", href=re.compile(r"\.pdf", re.I))
        pdf_url = (BASE_URL + pdf_link["href"] if pdf_link and pdf_link["href"].startswith("/") else
                   pdf_link["href"] if pdf_link else None)

        # Parse lawyers from parties / representation section
        lawyers_el = soup.find(string=re.compile(r"represented by|counsel|avukat", re.I))
        lawyers_text = lawyers_el.parent.get_text() if lawyers_el and lawyers_el.parent else ""

        return {
            "reference": reference or url.split("/")[-1],
            "court": court,
            "judge": judge,
            "parties": parties,
            "date_raw": date_str,
            "full_text": full_text,
            "pdf_url": pdf_url,
            "lawyers_text": lawyers_text,
            "source_url": url,
        }
