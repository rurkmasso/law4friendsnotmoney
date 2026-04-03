"""
EUR-Lex scraper — EU regulations, directives, and CJEU decisions relevant to Malta.
Uses the official EUR-Lex REST API (free, no ToS issues).
Coverage: EU Treaties, Regulations, Directives, CJEU/ECtHR cases involving Malta.
"""
import httpx
from scrapers.base import BaseScraper
from rich import print

EURLEX_API = "https://eur-lex.europa.eu/search.html"
CURIA_BASE = "https://curia.europa.eu"

# Key EU law areas relevant to Malta
MALTA_RELEVANT_QUERIES = [
    "Malta financial services",
    "Malta gaming regulation",
    "Malta AML directive",
    "Malta maritime law",
    "Malta employment law",
    "GDPR data protection",
    "MiCA crypto regulation",
    "MiFID II financial instruments",
    "DORA digital operational resilience",
    "PSD2 payment services",
    "anti-money laundering directive",
    "company law EU directive",
    "VAT directive",
    "EU charter fundamental rights",
]

EURLEX_SPARQL = "https://publications.europa.eu/webapi/rdf/sparql"


class EurLexScraper(BaseScraper):

    async def scrape(self) -> list[dict]:
        docs = []

        # Scrape via EUR-Lex SPARQL for Malta-relevant EU law
        for query_term in MALTA_RELEVANT_QUERIES:
            try:
                results = await self._search_eurlex(query_term)
                docs.extend(results)
                print(f"[cyan]EUR-Lex '{query_term}': {len(results)} docs[/cyan]")
            except Exception as e:
                print(f"[red]EUR-Lex '{query_term}' failed: {e}[/red]")

        # CJEU cases involving Malta
        cjeu_cases = await self._scrape_cjeu_malta()
        docs.extend(cjeu_cases)
        print(f"[green]CJEU Malta cases: {len(cjeu_cases)}[/green]")

        return docs

    async def _search_eurlex(self, query: str) -> list[dict]:
        params = {
            "qid": "1",
            "text": query,
            "scope": "EURLEX",
            "type": "quick",
            "lang": "en",
            "page": 1,
        }
        resp = await self.get(f"{EURLEX_API}?{'&'.join(f'{k}={v}' for k,v in params.items())}")
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "lxml")
        docs = []
        for item in soup.select(".SearchResult, .result-item, li.result")[:20]:
            title_el = item.select_one("h2 a, h3 a, .title a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            href = title_el.get("href", "")
            url = f"https://eur-lex.europa.eu{href}" if href.startswith("/") else href
            docs.append({
                "title": title,
                "source": "EUR-Lex",
                "doc_type": "eu-legislation",
                "body": "European Union",
                "source_url": url,
                "full_text": item.get_text(separator=" ", strip=True)[:3000],
            })
        return docs

    async def _scrape_cjeu_malta(self) -> list[dict]:
        """Get CJEU cases where Malta is a party."""
        url = f"{CURIA_BASE}/juris/recherche.jsf"
        params = "language=en&critere=MALTA&paginationSize=100"
        try:
            resp = await self.get(f"{url}?{params}")
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "lxml")
            cases = []
            for row in soup.select("table.affaires tr, .case-row")[:50]:
                cells = row.select("td")
                if len(cells) < 2:
                    continue
                link = row.select_one("a[href]")
                title = row.get_text(strip=True)[:300]
                href = link["href"] if link else ""
                case_url = f"{CURIA_BASE}{href}" if href.startswith("/") else href
                cases.append({
                    "title": title,
                    "source": "CJEU",
                    "doc_type": "eu-judgment",
                    "body": "Court of Justice of the EU",
                    "source_url": case_url,
                    "full_text": "",
                })
            return cases
        except Exception as e:
            print(f"[red]CJEU Malta scrape failed: {e}[/red]")
            return []
