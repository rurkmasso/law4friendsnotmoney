"""
International law scrapers relevant to Malta:
- ECtHR (European Court of Human Rights) — Malta cases
- UN Treaty Collection — Treaties Malta ratified
- IMO (International Maritime Organization) — Malta is a flag state
- WorldLII Malta — aggregated international case law
- Hague Conference — Private international law
- Council of Europe — Conventions Malta signed
- WTO — Malta trade disputes
"""
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from rich import print

SOURCES = {
    "ECtHR": {
        "url": "https://hudoc.echr.coe.int/eng?query=malta&documentcollectionid2=GRANDCHAMBER,CHAMBER",
        "source": "ECtHR",
        "doc_type": "human-rights-judgment",
        "body": "European Court of Human Rights",
    },
    "WorldLII Malta": {
        "url": "https://www.worldlii.org/catalog/2243.html",
        "source": "WorldLII",
        "doc_type": "case-law",
        "body": "WorldLII",
    },
    "Council of Europe Malta": {
        "url": "https://www.coe.int/en/web/conventions/search-on-states/-/conventions/treaty/country/MLT",
        "source": "Council of Europe",
        "doc_type": "treaty",
        "body": "Council of Europe",
    },
    "IMO Malta": {
        "url": "https://www.imo.org/en/About/Membership/Pages/MemberStates.aspx",
        "source": "IMO",
        "doc_type": "maritime-convention",
        "body": "International Maritime Organization",
    },
}

# Malta UN Treaty ratifications
UN_TREATIES_URL = "https://treaties.un.org/Pages/ParticipationStatus.aspx?clang=_en"


class InternationalScraper(BaseScraper):

    async def scrape(self) -> list[dict]:
        docs = []
        for name, config in SOURCES.items():
            try:
                results = await self._scrape_source(name, config)
                docs.extend(results)
                print(f"[cyan]{name}: {len(results)} docs[/cyan]")
            except Exception as e:
                print(f"[red]{name} failed: {e}[/red]")
        return docs

    async def _scrape_source(self, name: str, config: dict) -> list[dict]:
        resp = await self.get(config["url"])
        soup = BeautifulSoup(resp.text, "lxml")
        docs = []
        for link in soup.select("a[href]")[:50]:
            title = link.get_text(strip=True)
            if not title or len(title) < 10:
                continue
            href = link["href"]
            url = href if href.startswith("http") else config["url"].rsplit("/", 1)[0] + "/" + href.lstrip("/")
            docs.append({
                "title": title[:500],
                "source": config["source"],
                "doc_type": config["doc_type"],
                "body": config["body"],
                "source_url": url,
                "full_text": "",
            })
        return docs[:30]
