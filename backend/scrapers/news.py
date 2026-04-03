"""
Maltese legal news scraper — all major local news orgs.
Cases are regularly mentioned in news, giving us real-time court coverage.
Sources: Times of Malta, Malta Today, The Malta Independent, MaltaToday, ONE News,
         MaltaLegal.com, Business Today Malta, The Shift News.
"""
import re
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from rich import print

NEWS_SOURCES = {
    "Times of Malta": {
        "sections": [
            "https://timesofmalta.com/section/courts-and-crime",
            "https://timesofmalta.com/section/business",
        ],
        "article_sel": "article, .story-item",
        "title_sel": "h2, h3",
        "body_sel": ".article-body, .story-body",
        "date_sel": "time",
    },
    "Malta Today": {
        "sections": [
            "https://maltatoday.com.mt/news/court_and_police",
            "https://maltatoday.com.mt/news/national",
        ],
        "article_sel": ".article-item, article",
        "title_sel": "h2, h3",
        "body_sel": ".article-body, .content",
        "date_sel": ".date, time",
    },
    "The Malta Independent": {
        "sections": [
            "https://www.independent.com.mt/articles/Court",
            "https://www.independent.com.mt/articles/Business",
        ],
        "article_sel": ".news-item, article, .article",
        "title_sel": "h2, h3",
        "body_sel": ".article-body",
        "date_sel": ".date, time",
    },
    "The Shift News": {
        "sections": [
            "https://theshiftnews.com/category/investigations",
        ],
        "article_sel": "article, .post",
        "title_sel": "h2, h3",
        "body_sel": ".entry-content, .post-content",
        "date_sel": "time",
    },
    "Business Today Malta": {
        "sections": [
            "https://businesstoday.com.mt/local",
        ],
        "article_sel": "article, .post",
        "title_sel": "h2, h3",
        "body_sel": ".entry-content",
        "date_sel": "time",
    },
    "MaltaLegal": {
        "sections": [
            "https://maltalegal.com",
        ],
        "article_sel": "article, .post, .entry",
        "title_sel": "h2, h3",
        "body_sel": ".entry-content, .post-content",
        "date_sel": "time, .date",
    },
}

# Legal keywords to filter for relevant articles
LEGAL_KEYWORDS = re.compile(
    r"court|judge|judgment|tribunal|sentence|acquit|convict|law|legal|lawyer|advocate|"
    r"qorti|imħallef|sentenza|avukat|liġi|kawża|akkuża|ħelsien|piena|appell|"
    r"fiau|mfsa|mga|mccaa|police|magistrate|criminal|civil|appeal|ruling|verdict|"
    r"arrest|charge|fine|penalty|bail|prison|compensation|damages|injunction",
    re.IGNORECASE
)


class NewsScraper(BaseScraper):

    async def scrape(self) -> list[dict]:
        articles = []
        for source_name, config in NEWS_SOURCES.items():
            for section_url in config["sections"]:
                try:
                    results = await self._scrape_section(source_name, section_url, config)
                    articles.extend(results)
                    print(f"[green]{source_name} ({section_url.split('/')[-1]}): {len(results)} articles[/green]")
                except Exception as e:
                    print(f"[red]{source_name} failed: {e}[/red]")
        return articles

    async def _scrape_section(self, source_name: str, url: str, config: dict) -> list[dict]:
        resp = await self.get(url)
        soup = BeautifulSoup(resp.text, "lxml")
        articles = []

        for item in soup.select(config["article_sel"])[:30]:
            title_el = item.select_one(config["title_sel"])
            link = item.select_one("a[href]")
            date_el = item.select_one(config["date_sel"])
            if not title_el or not link:
                continue

            title = title_el.get_text(strip=True)
            if not LEGAL_KEYWORDS.search(title):
                continue  # skip non-legal news

            href = link["href"]
            # Resolve relative URLs
            if href.startswith("/"):
                base = "/".join(url.split("/")[:3])
                full_url = base + href
            elif href.startswith("http"):
                full_url = href
            else:
                continue

            date_str = (date_el.get("datetime") or date_el.get_text(strip=True)) if date_el else None

            # Fetch full article
            full_text = ""
            extracted_cases = []
            try:
                detail = await self.get(full_url)
                detail_soup = BeautifulSoup(detail.text, "lxml")
                body = detail_soup.select_one(config["body_sel"])
                if body:
                    full_text = body.get_text(separator="\n", strip=True)
                    # Extract case references mentioned in article
                    extracted_cases = re.findall(
                        r"(?:Case|Kawża|Sentenza|Judgment)\s*(?:No\.?|Nru\.?)?\s*[\w\/\-]+",
                        full_text, re.IGNORECASE
                    )
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
                "case_references": list(set(extracted_cases))[:10],  # cases mentioned in article
            })

        return articles
