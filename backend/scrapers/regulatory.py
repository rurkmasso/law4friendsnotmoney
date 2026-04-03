"""
Scrapers for all Malta regulatory bodies:
FIAU, MFSA, MGA, MCCAA, OHSA, ERA, IDPC, Transport Malta, CFR, MBR
"""
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from rich import print

SOURCES = {
    "FIAU": {
        "url": "https://fiaumalta.org/publications",
        "doc_type": "guidance",
        "selectors": ["article", ".publication", "li.document"],
    },
    "MFSA": {
        "url": "https://www.mfsa.mt/publications",
        "doc_type": "circular",
        "selectors": [".circular", ".publication", "article"],
    },
    "MGA": {
        "url": "https://mga.org.mt/publications",
        "doc_type": "guidance",
        "selectors": [".publication", "article", ".document"],
    },
    "MCCAA": {
        "url": "https://mccaa.org.mt/publications",
        "doc_type": "guidance",
        "selectors": [".publication", "article"],
    },
    "OHSA": {
        "url": "https://ohsa.mt/legislation",
        "doc_type": "guidance",
        "selectors": [".document", "li", "article"],
    },
    "CFR": {
        "url": "https://cfr.gov.mt/en/legislation/Pages/Tax-Legislation.aspx",
        "doc_type": "tax-ruling",
        "selectors": [".doc", "li", "a[href*='.pdf']"],
    },
    "IDPC": {
        "url": "https://idpc.org.mt/publications",
        "doc_type": "guidance",
        "selectors": [".publication", "article"],
    },
    "Transport Malta": {
        "url": "https://transport.gov.mt/transport-malta/legislation-2963",
        "doc_type": "regulation",
        "selectors": [".document", "article", "li"],
    },
}


class RegulatoryScraper(BaseScraper):

    async def scrape(self) -> list[dict]:
        docs = []
        for source_name, config in SOURCES.items():
            try:
                results = await self._scrape_source(source_name, config)
                docs.extend(results)
                print(f"[green]{source_name}: {len(results)} documents[/green]")
            except Exception as e:
                print(f"[red]{source_name} failed: {e}[/red]")
        return docs

    async def _scrape_source(self, source_name: str, config: dict) -> list[dict]:
        resp = await self.get(config["url"])
        soup = BeautifulSoup(resp.text, "lxml")
        docs = []

        items = []
        for selector in config["selectors"]:
            items = soup.select(selector)
            if items:
                break

        for item in items:
            link = item.select_one("a[href]") or (item if item.name == "a" else None)
            if not link:
                continue
            title = item.get_text(strip=True)[:500]
            href = link.get("href", "")
            if not href:
                continue
            full_url = href if href.startswith("http") else config["url"].rsplit("/", 1)[0] + "/" + href.lstrip("/")

            # Fetch full text for non-PDF pages
            full_text = ""
            if not href.endswith(".pdf"):
                try:
                    detail = await self.get(full_url)
                    detail_soup = BeautifulSoup(detail.text, "lxml")
                    content = detail_soup.select_one("main, article, .content, #content")
                    full_text = content.get_text(separator="\n", strip=True) if content else ""
                except Exception:
                    pass

            docs.append({
                "title": title,
                "source": source_name,
                "doc_type": config["doc_type"],
                "body": source_name,
                "source_url": full_url,
                "pdf_url": full_url if href.endswith(".pdf") else None,
                "full_text": full_text,
            })

        return docs
