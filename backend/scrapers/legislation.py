"""
Scraper for legislation.mt — all chapters of the Laws of Malta.
Respects ToS by crawling slowly and for public-interest research only.
"""
import re
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from rich import print

BASE_URL = "https://legislation.mt"
INDEX_URL = f"{BASE_URL}/en/legislation/primary"


class LegislationScraper(BaseScraper):

    async def scrape(self) -> list[dict]:
        laws = []
        chapters = await self._get_chapter_list()
        print(f"[green]Found {len(chapters)} chapters on legislation.mt[/green]")
        for chapter_url, chapter_ref, title in chapters:
            try:
                law = await self._scrape_chapter(chapter_url, chapter_ref, title)
                if law:
                    laws.append(law)
                    print(f"[cyan]  Scraped {chapter_ref}: {title[:60]}[/cyan]")
            except Exception as e:
                print(f"[red]  Failed {chapter_ref}: {e}[/red]")
        return laws

    async def _get_chapter_list(self) -> list[tuple]:
        resp = await self.get(INDEX_URL)
        soup = BeautifulSoup(resp.text, "lxml")
        chapters = []
        for row in soup.select("table tr, .legislation-list li, a[href*='/legislation/']"):
            href = row.get("href", "")
            if not href:
                continue
            full_url = BASE_URL + href if href.startswith("/") else href
            text = row.get_text(strip=True)
            match = re.search(r"(CAP\.?\s*\d+[A-Z]?)", text, re.IGNORECASE)
            chapter_ref = match.group(1).upper() if match else text[:20]
            title = text.replace(chapter_ref, "").strip(" -–")
            chapters.append((full_url, chapter_ref, title))
        return chapters

    async def _scrape_chapter(self, url: str, chapter_ref: str, title: str) -> dict | None:
        resp = await self.get(url)
        soup = BeautifulSoup(resp.text, "lxml")

        # Extract full text from main content area
        content = soup.select_one("main, .legislation-content, article, #content")
        full_text = content.get_text(separator="\n", strip=True) if content else ""

        # Get PDF link if available
        pdf_link = soup.find("a", href=re.compile(r"\.pdf", re.I))
        pdf_url = (BASE_URL + pdf_link["href"] if pdf_link and pdf_link["href"].startswith("/") else
                   pdf_link["href"] if pdf_link else None)

        # Get last amended date
        amended_text = soup.find(string=re.compile(r"amended|updated|revised", re.I))
        last_amended = str(amended_text).strip() if amended_text else None

        return {
            "chapter": chapter_ref,
            "title": title,
            "full_text": full_text,
            "source_url": url,
            "pdf_url": pdf_url,
            "last_amended_raw": last_amended,
        }
