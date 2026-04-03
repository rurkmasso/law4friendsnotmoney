"""
Legal news scraper — Times of Malta, Malta Today, MaltaLegal.
Gives real-time case tracking so lawyers know when new judgments drop.
"""
import re
from datetime import datetime
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from rich import print

NEWS_SOURCES = {
    "Times of Malta": {
        "url": "https://timesofmalta.com/section/courts-and-crime",
        "article_selector": "article, .story",
        "title_selector": "h2, h3",
        "body_selector": ".article-body, .story-body",
        "date_selector": "time",
    },
    "Malta Today": {
        "url": "https://maltatoday.com.mt/news/court_and_police",
        "article_selector": ".article-item, article",
        "title_selector": "h2, h3",
        "body_selector": ".article-body",
        "date_selector": ".date, time",
    },
}


class NewsScraper(BaseScraper):

    async def scrape(self) -> list[dict]:
        articles = []
        for source_name, config in NEWS_SOURCES.items():
            try:
                results = await self._scrape_source(source_name, config)
                articles.extend(results)
                print(f"[green]{source_name}: {len(results)} articles[/green]")
            except Exception as e:
                print(f"[red]{source_name} failed: {e}[/red]")
        return articles

    async def _scrape_source(self, source_name: str, config: dict) -> list[dict]:
        resp = await self.get(config["url"])
        soup = BeautifulSoup(resp.text, "lxml")
        articles = []

        for item in soup.select(config["article_selector"])[:50]:  # latest 50
            title_el = item.select_one(config["title_selector"])
            link = item.select_one("a[href]")
            date_el = item.select_one(config["date_selector"])
            if not title_el or not link:
                continue

            title = title_el.get_text(strip=True)
            # Filter to legal/court news only
            if not re.search(r"court|judge|judgment|tribunal|sentence|acquit|convict|law|legal", title, re.I):
                continue

            href = link["href"]
            full_url = href if href.startswith("http") else f"https://{source_name.lower().replace(' ', '')}.com{href}"
            date_str = date_el.get("datetime") or date_el.get_text(strip=True) if date_el else None

            # Fetch article body
            full_text = ""
            try:
                detail = await self.get(full_url)
                detail_soup = BeautifulSoup(detail.text, "lxml")
                body = detail_soup.select_one(config["body_selector"])
                full_text = body.get_text(separator="\n", strip=True) if body else ""
            except Exception:
                pass

            articles.append({
                "title": title,
                "source": source_name,
                "doc_type": "news",
                "body": source_name,
                "full_text": full_text,
                "source_url": full_url,
                "published_at_raw": date_str,
            })

        return articles
