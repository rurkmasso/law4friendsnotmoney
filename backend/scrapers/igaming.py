"""
iGaming scraper — Malta Gaming Authority (MGA).
Scrapes licensed operators, regulations, and directives from mga.org.mt.
"""
import re
import asyncio
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from rich import print

BASE_URL = "https://www.mga.org.mt"

# MGA public register endpoints
LICENCE_REGISTER_URL = f"{BASE_URL}/en/public-register/"
REGULATIONS_URL = f"{BASE_URL}/en/legislation-regulations/"
DIRECTIVES_URL = f"{BASE_URL}/en/legislation-regulations/directives/"


class IGamingScraper(BaseScraper):

    async def scrape(self) -> dict:
        """Returns dict with 'operators' and 'documents' lists."""
        operators, documents = await asyncio.gather(
            self._get_licensed_operators(),
            self._get_mga_documents(),
        )
        print(f"[green]MGA operators scraped: {len(operators)}[/green]")
        print(f"[green]MGA documents scraped: {len(documents)}[/green]")
        return {"operators": operators, "documents": documents}

    async def _get_licensed_operators(self) -> list[dict]:
        """Scrape MGA public register of licensed operators."""
        operators = []
        try:
            # MGA public register — B2C Gaming Service Licences
            urls = [
                f"{BASE_URL}/en/public-register/b2c-gaming-service-licences/",
                f"{BASE_URL}/en/public-register/b2b-critical-supply-licences/",
                f"{BASE_URL}/en/licensees-and-licences/",
            ]
            for url in urls:
                try:
                    resp = await self.get(url)
                    if resp.status_code != 200:
                        print(f"[yellow]MGA {url}: HTTP {resp.status_code}[/yellow]")
                        continue
                    soup = BeautifulSoup(resp.text, "lxml")
                    # Try table rows
                    rows = soup.select("table tbody tr, tr.dataRow, .licence-row")
                    if not rows:
                        rows = soup.select("table tr")
                    for row in rows:
                        cells = row.select("td")
                        if len(cells) < 2:
                            continue
                        texts = [c.get_text(strip=True) for c in cells]
                        # Typical columns: Company Name, Licence Number, Licence Type, Status
                        name = texts[0] if texts else ""
                        licence_no = texts[1] if len(texts) > 1 else ""
                        if not name or len(name) < 3:
                            continue
                        operators.append({
                            "company_name": name,
                            "licence_number": licence_no,
                            "licence_type": texts[2] if len(texts) > 2 else "",
                            "status": texts[3] if len(texts) > 3 else "Active",
                            "source_url": url,
                        })
                    if operators:
                        print(f"[cyan]MGA operators from {url}: {len(operators)}[/cyan]")
                except Exception as e:
                    print(f"[yellow]MGA operators {url}: {e}[/yellow]")

            # If no operators from tables, try API endpoint
            if not operators:
                operators = await self._get_operators_via_api()

        except Exception as e:
            print(f"[red]MGA operators scrape failed: {e}[/red]")
        return operators

    async def _get_operators_via_api(self) -> list[dict]:
        """Try MGA's search/filter API for licensees."""
        operators = []
        try:
            # MGA uses a search endpoint for their public register
            api_url = f"{BASE_URL}/en/public-register/gaming-service-licences/"
            resp = await self.get(api_url)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                # Look for any structured data
                items = soup.select(".result-item, .licensee-item, article.licence")
                for item in items:
                    name_el = item.select_one("h2, h3, .company-name, strong")
                    name = name_el.get_text(strip=True) if name_el else ""
                    if name:
                        licence_el = item.select_one(".licence-number, .ref-number")
                        operators.append({
                            "company_name": name,
                            "licence_number": licence_el.get_text(strip=True) if licence_el else "",
                            "licence_type": "B2C Gaming Service",
                            "status": "Active",
                            "source_url": api_url,
                        })
        except Exception as e:
            print(f"[yellow]MGA API fallback: {e}[/yellow]")
        return operators

    async def _get_mga_documents(self) -> list[dict]:
        """Scrape MGA regulations, directives, and guidelines."""
        documents = []
        doc_sources = [
            ("Gaming Act (CAP. 583)", f"{BASE_URL}/en/legislation-regulations/gaming-act/", "legislation"),
            ("MGA Regulations", f"{BASE_URL}/en/legislation-regulations/regulations/", "regulation"),
            ("MGA Directives", f"{BASE_URL}/en/legislation-regulations/directives/", "directive"),
            ("MGA Guidelines", f"{BASE_URL}/en/legislation-regulations/guidelines/", "guideline"),
            ("Player Protection", f"{BASE_URL}/en/player-protection/", "player_protection"),
            ("AML/CFT", f"{BASE_URL}/en/aml-cft/", "compliance"),
        ]
        for title, url, doc_type in doc_sources:
            try:
                resp = await self.get(url)
                if resp.status_code != 200:
                    # Add as a known document even without content
                    documents.append({
                        "title": title,
                        "body": f"See MGA website: {url}",
                        "full_text": title,
                        "source": "MGA",
                        "doc_type": doc_type,
                        "source_url": url,
                        "pdf_url": None,
                    })
                    continue
                soup = BeautifulSoup(resp.text, "lxml")
                # Find document links
                links = soup.select("a[href*='.pdf'], a[href*='/document/'], .document-item a, .resource-link")
                if links:
                    for link in links[:30]:  # cap at 30 per section
                        doc_title = link.get_text(strip=True)
                        href = link.get("href", "")
                        if not doc_title or len(doc_title) < 5:
                            continue
                        full_url = href if href.startswith("http") else f"{BASE_URL}{href}"
                        documents.append({
                            "title": doc_title,
                            "body": "",
                            "full_text": f"{title}: {doc_title}",
                            "source": "MGA",
                            "doc_type": doc_type,
                            "source_url": url,
                            "pdf_url": full_url if ".pdf" in href.lower() else None,
                        })
                else:
                    # Extract page text as body
                    body = soup.get_text(separator=" ", strip=True)[:3000]
                    documents.append({
                        "title": title,
                        "body": body,
                        "full_text": body,
                        "source": "MGA",
                        "doc_type": doc_type,
                        "source_url": url,
                        "pdf_url": None,
                    })
                print(f"[cyan]MGA {doc_type}: done[/cyan]")
                await asyncio.sleep(1)
            except Exception as e:
                print(f"[yellow]MGA {url}: {e}[/yellow]")
        return documents
